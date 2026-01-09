# Load Balancing

## Overview

Load balancing distributes incoming traffic across multiple WordPress servers, improving performance, availability, and fault tolerance. Understanding load balancing is essential for scaling WordPress to handle high traffic.

## Load Balancing Concepts

### Why Load Balance?

```
Without Load Balancing:
Users → Single Server (Overloaded)

With Load Balancing:
Users → Load Balancer → Server 1
                     → Server 2
                     → Server 3
```

### Benefits

| Benefit | Description |
|---------|-------------|
| Scalability | Handle more traffic by adding servers |
| Availability | Survive server failures |
| Performance | Distribute load evenly |
| Maintenance | Update servers without downtime |

## Load Balancing Algorithms

### Round Robin

```nginx
# Nginx - Equal distribution
upstream wordpress {
    server 192.168.1.1:80;
    server 192.168.1.2:80;
    server 192.168.1.3:80;
}

# Requests go: Server1, Server2, Server3, Server1, ...
```

### Weighted Round Robin

```nginx
# Nginx - Weighted distribution
upstream wordpress {
    server 192.168.1.1:80 weight=5;  # Gets 5x traffic
    server 192.168.1.2:80 weight=3;  # Gets 3x traffic
    server 192.168.1.3:80 weight=1;  # Gets 1x traffic
}

# Use for servers with different capacities
```

### Least Connections

```nginx
# Nginx - Route to least busy server
upstream wordpress {
    least_conn;
    server 192.168.1.1:80;
    server 192.168.1.2:80;
    server 192.168.1.3:80;
}

# Good for variable request times
```

### IP Hash (Session Persistence)

```nginx
# Nginx - Same user → same server
upstream wordpress {
    ip_hash;
    server 192.168.1.1:80;
    server 192.168.1.2:80;
    server 192.168.1.3:80;
}

# Ensures session continuity
# But can cause uneven distribution
```

## Nginx Load Balancer Configuration

### Basic Setup

```nginx
# /etc/nginx/nginx.conf

upstream wordpress {
    least_conn;
    server 192.168.1.1:80 weight=5;
    server 192.168.1.2:80 weight=5;
    server 192.168.1.3:80 backup;  # Only used if others fail
    
    keepalive 32;  # Connection pooling
}

server {
    listen 80;
    server_name example.com;
    
    location / {
        proxy_pass http://wordpress;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Health Checks

```nginx
upstream wordpress {
    server 192.168.1.1:80;
    server 192.168.1.2:80;
    
    # Passive health checks (built-in)
    # Server marked as failed after max_fails
}

# For active health checks (Nginx Plus or third-party module)
upstream wordpress {
    zone wordpress 64k;
    server 192.168.1.1:80;
    server 192.168.1.2:80;
    
    health_check interval=5s fails=3 passes=2;
}
```

### SSL Termination

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;
    
    ssl_certificate /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;
    
    location / {
        proxy_pass http://wordpress;  # HTTP to backend
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

## HAProxy Configuration

```haproxy
# /etc/haproxy/haproxy.cfg

global
    maxconn 4096
    log /dev/log local0

defaults
    mode http
    timeout connect 5s
    timeout client 30s
    timeout server 30s
    option httplog
    option dontlognull
    option forwardfor

frontend wordpress_front
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/example.pem
    redirect scheme https if !{ ssl_fc }
    default_backend wordpress_back

backend wordpress_back
    balance roundrobin
    option httpchk GET /health.php
    http-check expect status 200
    
    server web1 192.168.1.1:80 check weight 5
    server web2 192.168.1.2:80 check weight 5
    server web3 192.168.1.3:80 check weight 5 backup
```

## WordPress Configuration for Load Balancing

### Detecting Load Balancer

```php
// wp-config.php

// Trust X-Forwarded headers from load balancer
if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $forwarded_ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
    $_SERVER['REMOTE_ADDR'] = trim($forwarded_ips[0]);
}

// Set HTTPS if forwarded
if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
    $_SERVER['HTTPS'] = 'on';
}

// Or use defined constant
if (strpos($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '', 'https') !== false) {
    define('FORCE_SSL_ADMIN', true);
}
```

### Health Check Endpoint

```php
// health.php in WordPress root

<?php
// Quick health check without loading WordPress
$db_check = @mysqli_connect(
    'localhost',
    'db_user',
    'db_pass',
    'wordpress'
);

if ($db_check) {
    mysqli_close($db_check);
    http_response_code(200);
    echo 'OK';
} else {
    http_response_code(503);
    echo 'Database connection failed';
}

// Or with WordPress loaded (slower)
// require_once('wp-load.php');
// if (is_blog_installed()) {
//     http_response_code(200);
//     echo 'OK';
// }
```

### Session Handling

```php
// wp-config.php

// Don't use PHP sessions (they don't scale)
// Use database or Redis for session-like functionality

// For plugins that require sessions, use database storage
// Or configure PHP sessions with Redis:
// ini_set('session.save_handler', 'redis');
// ini_set('session.save_path', 'tcp://redis-server:6379');
```

## Shared Resources

### Shared File System

```php
// All servers need access to same uploads

// Option 1: NFS Mount
// Mount /var/www/html/wp-content/uploads from NFS server

// Option 2: GlusterFS
// Distributed file system across nodes

// Option 3: S3 with plugin
// Use plugin to offload media to S3
define('AS3CF_SETTINGS', serialize(array(
    'provider' => 'aws',
    'access-key-id' => 'AKIAXXXXXXXX',
    'secret-access-key' => 'XXXXXXXXXX',
    'bucket' => 'my-wp-uploads',
)));
```

### Shared Database

```php
// All servers connect to same database

// Single database server
define('DB_HOST', 'db-server.internal');

// Or read replicas (see Database Scaling)
define('DB_HOST', 'primary-db.internal');
```

### Shared Cache

```php
// All servers use same Redis/Memcached

define('WP_REDIS_HOST', 'redis-cluster.internal');
define('WP_REDIS_PORT', 6379);

// Or Memcached
$memcached_servers = array(
    'default' => array(
        'memcached-1.internal:11211',
        'memcached-2.internal:11211',
    ),
);
```

## Sticky Sessions vs Stateless

### Sticky Sessions (Not Recommended)

```nginx
# User always goes to same server
upstream wordpress {
    ip_hash;  # Sticky by IP
    server 192.168.1.1:80;
    server 192.168.1.2:80;
}

# Problems:
# - Uneven distribution
# - Server failure loses sessions
# - Can't easily add/remove servers
```

### Stateless (Recommended)

```php
// Design for statelessness

// 1. Use shared object cache
define('WP_REDIS_HOST', 'redis.internal');

// 2. Use database for sessions
// Or JWT tokens for authentication

// 3. Externalize uploads
// Use S3 or shared storage

// 4. Use nonces properly (they're user+time based)
// They work across servers automatically
```

## Cloud Load Balancers

### AWS ALB

```yaml
# Terraform example
resource "aws_lb" "wordpress" {
  name               = "wordpress-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = aws_subnet.public[*].id
  
  enable_http2 = true
}

resource "aws_lb_target_group" "wordpress" {
  name     = "wordpress-targets"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  
  health_check {
    path                = "/health.php"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
  }
}
```

### Google Cloud Load Balancing

```bash
# Create instance group
gcloud compute instance-groups managed create wordpress-group \
    --base-instance-name wordpress \
    --template wordpress-template \
    --size 3

# Create health check
gcloud compute health-checks create http wordpress-health \
    --port 80 \
    --request-path /health.php

# Create backend service
gcloud compute backend-services create wordpress-backend \
    --protocol HTTP \
    --health-checks wordpress-health \
    --global

# Add instance group
gcloud compute backend-services add-backend wordpress-backend \
    --instance-group wordpress-group \
    --instance-group-zone us-central1-a \
    --global
```

## Monitoring Load Balanced Setup

```php
// Track which server handled request
add_action('wp_footer', function() {
    if (current_user_can('manage_options')) {
        echo '<!-- Server: ' . gethostname() . ' -->';
    }
});

// Log server for debugging
add_action('init', function() {
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log('Request handled by: ' . gethostname());
    }
});
```

## Best Practices

1. **Use stateless design** - Don't rely on server-specific state
2. **Externalize sessions** - Redis or database storage
3. **Share uploads** - S3 or distributed file system
4. **Health checks** - Monitor backend server health
5. **SSL at load balancer** - Terminate SSL centrally
6. **Proper headers** - Forward real client IP

## Common Pitfalls

- Storing sessions on individual servers
- Uploads stored locally (not shared)
- Not forwarding client IP properly
- Missing health check endpoints
- Not planning for server failures

## Exam Tips

- **Understand load balancing algorithms**: Round robin (distribute evenly), least connections (send to server with fewest connections), IP hash (same IP to same server for sticky sessions), weighted (prefer certain servers). Choose based on needs: round robin for stateless, IP hash for sticky sessions. Understanding algorithms helps configure load balancer appropriately.

- **Know WordPress configuration for LB**: Set `$_SERVER['HTTP_X_FORWARDED_FOR']` handling for real client IPs. Configure `WP_HOME` and `WP_SITEURL` correctly. Use shared object cache (Redis/Memcached). Store uploads on shared storage (S3, NFS). Ensure all servers have same codebase. Understanding WordPress LB configuration ensures site works correctly behind load balancer.

- **Understand sticky sessions vs stateless**: Sticky sessions (session affinity) send same user to same server. Required if using PHP sessions. Stateless design works with any server (WordPress default). Stateless is better for scaling - any server can handle any request. Design stateless when possible. Understanding the difference helps choose appropriate architecture.

- **Know how to handle shared resources**: Uploads must be on shared storage (S3, NFS, network drive) so all servers access same files. Object cache must be shared (Redis/Memcached). Database is already shared. Session storage must be shared if using sessions. Understanding shared resources ensures all servers have access to same data and files.

- **Understand SSL termination**: SSL termination at load balancer (handles HTTPS, forwards HTTP to servers) vs end-to-end SSL (HTTPS all the way). Termination reduces server load but requires trust in load balancer. WordPress should handle both HTTP and HTTPS correctly. Set proper headers (`X-Forwarded-Proto`). Understanding SSL termination helps configure secure load-balanced setup.
