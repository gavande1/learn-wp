# Database Scaling

## Overview

As WordPress sites grow, the database often becomes the bottleneck. Database scaling involves strategies to handle increased read/write loads, improve query performance, and ensure data availability.

## Scaling Strategies

### Vertical Scaling (Scale Up)

```
Before: 2 CPU, 4GB RAM
After:  8 CPU, 32GB RAM

Pros:
- Simple to implement
- No application changes

Cons:
- Has physical limits
- Can be expensive
- Single point of failure
```

### Horizontal Scaling (Scale Out)

```
                    ┌─────────────┐
                    │   Primary   │
                    │  (Writes)   │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
    │ Replica │       │ Replica │       │ Replica │
    │ (Reads) │       │ (Reads) │       │ (Reads) │
    └─────────┘       └─────────┘       └─────────┘
```

## Read Replicas

### MySQL Replication Setup

```sql
-- On Primary Server
-- /etc/mysql/mysql.conf.d/mysqld.cnf

[mysqld]
server-id = 1
log_bin = /var/log/mysql/mysql-bin.log
binlog_do_db = wordpress

-- Create replication user
CREATE USER 'repl'@'%' IDENTIFIED BY 'password';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
FLUSH PRIVILEGES;
SHOW MASTER STATUS;
```

```sql
-- On Replica Server
[mysqld]
server-id = 2
relay-log = /var/log/mysql/mysql-relay-bin.log
log_bin = /var/log/mysql/mysql-bin.log
binlog_do_db = wordpress
read_only = 1

-- Configure replication
CHANGE MASTER TO
    MASTER_HOST='primary-server',
    MASTER_USER='repl',
    MASTER_PASSWORD='password',
    MASTER_LOG_FILE='mysql-bin.000001',
    MASTER_LOG_POS=154;
START SLAVE;
```

### WordPress Read Replica Configuration

```php
// Using HyperDB (or LudicrousDB)
// db-config.php

$wpdb->add_database(array(
    'host'     => 'primary-db.internal',
    'user'     => 'wp_user',
    'password' => 'password',
    'name'     => 'wordpress',
    'write'    => 1,  // Writes go here
    'read'     => 1,  // Can also read
));

$wpdb->add_database(array(
    'host'     => 'replica-1.internal',
    'user'     => 'wp_user',
    'password' => 'password',
    'name'     => 'wordpress',
    'write'    => 0,  // No writes
    'read'     => 1,  // Reads go here
));

$wpdb->add_database(array(
    'host'     => 'replica-2.internal',
    'user'     => 'wp_user',
    'password' => 'password',
    'name'     => 'wordpress',
    'write'    => 0,
    'read'     => 1,
));
```

### Lag-Aware Configuration

```php
// db-config.php

// Define callback for replication lag
$wpdb->lag_threshold = 1; // Max 1 second lag

$wpdb->add_callback('check_lag', function() use ($wpdb) {
    // Check replication lag
    $lag = $wpdb->get_var("SHOW SLAVE STATUS", 32);
    return $lag < $wpdb->lag_threshold;
});

// Force writes for critical operations
function ensure_write_db() {
    global $wpdb;
    $wpdb->db_connect("WRITE");
}

// Use for operations that must read current data
add_action('save_post', 'ensure_write_db');
```

## Database Partitioning

### Horizontal Partitioning (Sharding)

```php
// Shard by user ID
function get_shard_for_user($user_id) {
    $shard_count = 4;
    return $user_id % $shard_count;
}

// Route queries to correct shard
function get_user_db($user_id) {
    $shard = get_shard_for_user($user_id);
    
    $shards = array(
        0 => 'shard-0.internal',
        1 => 'shard-1.internal',
        2 => 'shard-2.internal',
        3 => 'shard-3.internal',
    );
    
    return $shards[$shard];
}
```

### Vertical Partitioning

```php
// Separate tables by function
// Main DB: wp_posts, wp_users, wp_options
// Analytics DB: wp_analytics, wp_pageviews
// Logs DB: wp_logs, wp_audit

// Configure multiple databases
$analytics_db = new wpdb('user', 'pass', 'analytics', 'analytics-db.internal');

function log_pageview($data) {
    global $analytics_db;
    $analytics_db->insert('wp_pageviews', $data);
}
```

## Query Optimization for Scale

### Optimize Heavy Queries

```php
// Before: Full table scan
$wpdb->get_results("SELECT * FROM wp_posts WHERE post_content LIKE '%keyword%'");

// After: Use full-text search
$wpdb->query("ALTER TABLE wp_posts ADD FULLTEXT INDEX content_search (post_content)");
$wpdb->get_results("SELECT * FROM wp_posts WHERE MATCH(post_content) AGAINST('keyword')");

// Use covering indexes
$wpdb->query("CREATE INDEX idx_status_date ON wp_posts (post_status, post_date)");
```

### Reduce Write Load

```php
// Batch inserts instead of individual
function batch_insert_meta($post_id, $meta_array) {
    global $wpdb;
    
    $values = array();
    $placeholders = array();
    
    foreach ($meta_array as $key => $value) {
        $placeholders[] = "(%d, %s, %s)";
        $values[] = $post_id;
        $values[] = $key;
        $values[] = maybe_serialize($value);
    }
    
    $query = "INSERT INTO {$wpdb->postmeta} (post_id, meta_key, meta_value) VALUES " . 
             implode(', ', $placeholders);
    
    $wpdb->query($wpdb->prepare($query, $values));
}
```

### Use Query Cache Effectively

```php
// MySQL Query Cache (deprecated in MySQL 8)
// Use application-level caching instead

function get_cached_posts($args) {
    $cache_key = 'posts_' . md5(serialize($args));
    $posts = wp_cache_get($cache_key, 'posts_cache');
    
    if (false === $posts) {
        $posts = get_posts($args);
        wp_cache_set($cache_key, $posts, 'posts_cache', HOUR_IN_SECONDS);
    }
    
    return $posts;
}

// Invalidate on update
add_action('save_post', function($post_id) {
    wp_cache_delete('posts_' . md5(serialize($old_args)), 'posts_cache');
});
```

## Connection Pooling

### ProxySQL Configuration

```ini
# /etc/proxysql.cnf

datadir="/var/lib/proxysql"

admin_variables=
{
    admin_credentials="admin:admin"
    mysql_ifaces="127.0.0.1:6032"
}

mysql_variables=
{
    threads=4
    max_connections=2048
    default_query_delay=0
    default_query_timeout=36000000
    interfaces="0.0.0.0:6033"
}

mysql_servers =
(
    { hostgroup_id=0, hostname="primary-db.internal", port=3306, max_connections=100 },
    { hostgroup_id=1, hostname="replica-1.internal", port=3306, max_connections=100 },
    { hostgroup_id=1, hostname="replica-2.internal", port=3306, max_connections=100 }
)

mysql_query_rules =
(
    { rule_id=1, active=1, match_pattern="^SELECT", destination_hostgroup=1 },
    { rule_id=2, active=1, match_pattern=".*", destination_hostgroup=0 }
)
```

### WordPress with ProxySQL

```php
// wp-config.php
// Connect to ProxySQL instead of MySQL directly
define('DB_HOST', 'proxysql.internal:6033');
```

## Managed Database Services

### AWS RDS

```php
// wp-config.php for RDS
define('DB_HOST', 'wordpress-db.xxxxxxxxxx.us-east-1.rds.amazonaws.com');
define('DB_NAME', 'wordpress');
define('DB_USER', 'wp_admin');
define('DB_PASSWORD', 'secure_password');

// For RDS with read replicas
// Use HyperDB and configure reader endpoint
$wpdb->add_database(array(
    'host' => 'wordpress-db.cluster-ro-xxxxxxxxxx.us-east-1.rds.amazonaws.com',
    'write' => 0,
    'read' => 1,
));
```

### AWS Aurora

```php
// Aurora automatically handles replication
// Writer endpoint for writes
define('DB_HOST', 'wordpress.cluster-xxxxxxxxxx.us-east-1.rds.amazonaws.com');

// Reader endpoint for reads (with HyperDB)
$wpdb->add_database(array(
    'host' => 'wordpress.cluster-ro-xxxxxxxxxx.us-east-1.rds.amazonaws.com',
    'write' => 0,
    'read' => 1,
));
```

## Database Maintenance at Scale

### Automated Maintenance

```php
// Schedule optimization during low traffic
if (!wp_next_scheduled('db_maintenance')) {
    wp_schedule_event(strtotime('03:00:00'), 'daily', 'db_maintenance');
}

add_action('db_maintenance', function() {
    global $wpdb;
    
    // Optimize tables
    $tables = array(
        $wpdb->posts,
        $wpdb->postmeta,
        $wpdb->options,
    );
    
    foreach ($tables as $table) {
        $wpdb->query("OPTIMIZE TABLE {$table}");
    }
    
    // Clean up
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_%' AND option_value < " . time());
});
```

### Monitor Replication

```php
// Check replication lag
function check_replication_health() {
    global $wpdb;
    
    $status = $wpdb->get_row("SHOW SLAVE STATUS", ARRAY_A);
    
    if ($status) {
        $lag = $status['Seconds_Behind_Master'];
        
        if ($lag > 10) {
            error_log("Replication lag: {$lag} seconds");
            // Alert monitoring system
        }
    }
}
```

## Failover Strategies

### Automatic Failover with Orchestrator

```yaml
# orchestrator.conf.json
{
    "MySQLTopologyUser": "orchestrator",
    "MySQLTopologyPassword": "password",
    "MySQLReplicaUser": "repl",
    "MySQLReplicaPassword": "password",
    "RecoveryPeriodBlockSeconds": 3600,
    "RecoverMasterClusterFilters": ["*"],
    "RecoverIntermediateMasterClusterFilters": ["*"],
    "OnFailureDetectionProcesses": [
        "/usr/local/bin/notify-failure.sh"
    ],
    "PostMasterFailoverProcesses": [
        "/usr/local/bin/update-dns.sh"
    ]
}
```

### WordPress Failover Configuration

```php
// wp-config.php with failover
define('DB_HOST', getenv('DB_HOST') ?: 'primary-db.internal');

// Or use service discovery
$db_host = file_get_contents('http://consul.internal/v1/catalog/service/mysql-primary');
$host_data = json_decode($db_host, true);
define('DB_HOST', $host_data[0]['Address']);
```

## Best Practices

1. **Start with read replicas** - Most cost-effective first step
2. **Cache aggressively** - Reduce database load
3. **Monitor query performance** - Identify slow queries
4. **Plan for failover** - Test recovery procedures
5. **Use managed services** - Reduce operational burden
6. **Optimize before scaling** - Fix queries first

## Common Pitfalls

- Not accounting for replication lag
- Over-sharding too early
- Ignoring connection limits
- Not monitoring slave health
- Missing indexes on replicas

## Exam Tips

- **Understand read replica concepts**: Read replicas copy data from master database to multiple read-only databases. Writes go to master, reads distributed across replicas. Reduces load on master database. WordPress supports via HyperDB or LudicrousDB plugins. Replication has lag (data not immediately available on replicas). Understanding replicas helps scale database read capacity.

- **Know HyperDB/LudicrousDB configuration**: These plugins route database queries to appropriate server (master for writes, replicas for reads). Configure database servers in `db-config.php`. Define read/write servers. Handle replication lag (read-after-write issues). Test thoroughly - misconfiguration can cause data inconsistency. Understanding configuration enables proper read replica setup.

- **Understand replication lag implications**: Changes to master take time to replicate to slaves (seconds to minutes). Reading immediately after write may return old data. Solutions: read from master for critical reads, use cache, accept eventual consistency. Understanding lag helps design applications that work correctly with read replicas and avoid data inconsistency issues.

- **Know when to use different scaling strategies**: Read replicas for read-heavy workloads. Sharding for very large datasets (complex, rarely needed for WordPress). Connection pooling for managing many connections. Caching to reduce database load. Choose based on bottlenecks: if reads are slow, use replicas; if single table is huge, consider sharding. Understanding strategies helps choose appropriate scaling approach.

- **Understand connection pooling benefits**: Connection pooling reuses database connections instead of creating new ones for each request. Reduces connection overhead. Manages connection limits efficiently. Improves performance under high load. WordPress doesn't pool by default, but database and hosting can provide pooling. Understanding pooling helps optimize database connection management.
