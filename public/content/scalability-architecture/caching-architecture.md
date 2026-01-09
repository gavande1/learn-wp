# Caching Architecture

## Overview

A well-designed caching architecture is crucial for WordPress performance at scale. This involves multiple caching layers working together to minimize server load and maximize response speed.

## Caching Layers

### The Caching Stack

```
Request Flow:

Browser Cache
    ↓ (miss)
CDN Cache
    ↓ (miss)
Page Cache (Varnish/Nginx)
    ↓ (miss)
Object Cache (Redis/Memcached)
    ↓ (miss)
Database
```

### Layer Responsibilities

| Layer | Caches | TTL | Hit Rate Target |
|-------|--------|-----|-----------------|
| Browser | Static assets | 1 year | N/A |
| CDN | Static + pages | Hours-days | 90%+ |
| Page Cache | Full HTML | Minutes-hours | 80%+ |
| Object Cache | Database queries | Minutes-hours | 70%+ |
| Query Cache | SQL results | Session | 50%+ |

## Browser Caching

### Configure Cache Headers

```php
// Set cache headers for static assets
add_action('send_headers', 'set_cache_headers');

function set_cache_headers() {
    // Don't cache admin or logged-in users
    if (is_admin() || is_user_logged_in()) {
        header('Cache-Control: no-cache, no-store, must-revalidate');
        return;
    }
    
    // Cache static pages
    if (is_page() || is_single()) {
        header('Cache-Control: public, max-age=3600'); // 1 hour
    }
    
    // Cache archives longer
    if (is_archive()) {
        header('Cache-Control: public, max-age=86400'); // 1 day
    }
}
```

### Nginx Configuration

```nginx
# Cache static files
location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf|woff2?)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary "Accept-Encoding";
}

# Cache HTML with short TTL
location / {
    add_header Cache-Control "public, max-age=60";
    add_header Vary "Cookie, Accept-Encoding";
}
```

## Page Caching

### Nginx FastCGI Cache

```nginx
# Define cache zone
fastcgi_cache_path /var/cache/nginx levels=1:2 keys_zone=wordpress:100m inactive=60m;

server {
    # Skip cache for logged-in users
    set $skip_cache 0;
    
    if ($http_cookie ~* "wordpress_logged_in") {
        set $skip_cache 1;
    }
    
    if ($request_uri ~* "/wp-admin/|/wp-json/") {
        set $skip_cache 1;
    }
    
    location ~ \.php$ {
        fastcgi_pass php-fpm;
        fastcgi_cache wordpress;
        fastcgi_cache_valid 200 60m;
        fastcgi_cache_bypass $skip_cache;
        fastcgi_no_cache $skip_cache;
        
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

### Varnish Configuration

```vcl
# /etc/varnish/default.vcl

vcl 4.0;

backend default {
    .host = "127.0.0.1";
    .port = "8080";
}

sub vcl_recv {
    # Don't cache logged-in users
    if (req.http.Cookie ~ "wordpress_logged_in") {
        return (pass);
    }
    
    # Don't cache admin
    if (req.url ~ "^/wp-(admin|login|cron)") {
        return (pass);
    }
    
    # Don't cache POST requests
    if (req.method == "POST") {
        return (pass);
    }
    
    # Remove cookies for static files
    if (req.url ~ "\.(css|js|jpg|jpeg|png|gif|ico|woff2?)$") {
        unset req.http.Cookie;
    }
    
    return (hash);
}

sub vcl_backend_response {
    # Cache static files for 1 week
    if (bereq.url ~ "\.(css|js|jpg|jpeg|png|gif|ico)$") {
        set beresp.ttl = 1w;
    }
    
    # Cache pages for 1 hour
    if (beresp.http.Content-Type ~ "text/html") {
        set beresp.ttl = 1h;
    }
    
    # Don't cache if Set-Cookie
    if (beresp.http.Set-Cookie) {
        set beresp.uncacheable = true;
        return (deliver);
    }
}

sub vcl_deliver {
    # Add cache hit/miss header
    if (obj.hits > 0) {
        set resp.http.X-Cache = "HIT";
    } else {
        set resp.http.X-Cache = "MISS";
    }
}
```

### Redis Page Cache

```php
// Simple Redis page cache implementation

class Redis_Page_Cache {
    private $redis;
    private $ttl = 3600;
    
    public function __construct() {
        $this->redis = new Redis();
        $this->redis->connect('redis.internal', 6379);
    }
    
    public function should_cache() {
        // Don't cache for logged-in users
        if (is_user_logged_in()) {
            return false;
        }
        
        // Don't cache POST requests
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            return false;
        }
        
        // Don't cache admin
        if (is_admin()) {
            return false;
        }
        
        return true;
    }
    
    public function get_cache_key() {
        $url = $_SERVER['REQUEST_URI'];
        $mobile = wp_is_mobile() ? 'mobile:' : 'desktop:';
        return 'page:' . $mobile . md5($url);
    }
    
    public function serve_cached_page() {
        if (!$this->should_cache()) {
            return false;
        }
        
        $key = $this->get_cache_key();
        $cached = $this->redis->get($key);
        
        if ($cached) {
            header('X-Cache: HIT');
            echo $cached;
            exit;
        }
        
        return false;
    }
    
    public function cache_page($content) {
        if (!$this->should_cache()) {
            return $content;
        }
        
        $key = $this->get_cache_key();
        $this->redis->setex($key, $this->ttl, $content);
        
        header('X-Cache: MISS');
        return $content;
    }
}

// Hook into WordPress
$cache = new Redis_Page_Cache();
$cache->serve_cached_page();
add_action('wp_loaded', function() use ($cache) {
    ob_start(array($cache, 'cache_page'));
});
```

## Object Cache Architecture

### Redis Cluster Configuration

```php
// wp-config.php

define('WP_REDIS_CLIENT', 'phpredis');
define('WP_REDIS_CLUSTER', array(
    'tcp://redis-1.internal:6379',
    'tcp://redis-2.internal:6379',
    'tcp://redis-3.internal:6379',
));

// Or Sentinel for automatic failover
define('WP_REDIS_SENTINEL', 'mymaster');
define('WP_REDIS_SERVERS', array(
    'tcp://sentinel-1.internal:26379',
    'tcp://sentinel-2.internal:26379',
    'tcp://sentinel-3.internal:26379',
));
```

### Cache Warming

```php
// Warm cache after deployment
function warm_cache() {
    $urls = array(
        home_url('/'),
        get_permalink(get_option('page_on_front')),
    );
    
    // Add popular posts
    $popular = get_posts(array(
        'posts_per_page' => 50,
        'meta_key' => 'views',
        'orderby' => 'meta_value_num',
        'order' => 'DESC',
    ));
    
    foreach ($popular as $post) {
        $urls[] = get_permalink($post);
    }
    
    // Warm each URL
    foreach ($urls as $url) {
        wp_remote_get($url, array('timeout' => 60));
    }
}

// Schedule after deployment
add_action('upgrader_process_complete', 'warm_cache');
```

## Cache Invalidation

### Purge Strategies

```php
// Purge on content update
add_action('save_post', 'purge_post_cache', 10, 3);

function purge_post_cache($post_id, $post, $update) {
    if (!$update || wp_is_post_revision($post_id)) {
        return;
    }
    
    // Purge specific post
    $urls = array(get_permalink($post_id));
    
    // Purge related pages
    $urls[] = home_url('/');
    $urls[] = get_post_type_archive_link($post->post_type);
    
    // Purge category pages
    $categories = wp_get_post_categories($post_id);
    foreach ($categories as $cat_id) {
        $urls[] = get_category_link($cat_id);
    }
    
    // Purge from all cache layers
    purge_varnish_cache($urls);
    purge_cdn_cache($urls);
    purge_redis_cache($post_id);
}

function purge_varnish_cache($urls) {
    foreach ($urls as $url) {
        wp_remote_request($url, array(
            'method' => 'PURGE',
        ));
    }
}

function purge_cdn_cache($urls) {
    // CloudFlare example
    $cf_api = 'https://api.cloudflare.com/client/v4/zones/' . CF_ZONE_ID . '/purge_cache';
    
    wp_remote_post($cf_api, array(
        'headers' => array(
            'Authorization' => 'Bearer ' . CF_API_TOKEN,
            'Content-Type' => 'application/json',
        ),
        'body' => json_encode(array('files' => $urls)),
    ));
}

function purge_redis_cache($post_id) {
    wp_cache_delete("post_{$post_id}", 'posts');
    wp_cache_delete('front_page_posts', 'posts');
}
```

### Tag-Based Invalidation

```php
// Use cache tags for smarter invalidation
class Tagged_Cache {
    private $redis;
    
    public function set($key, $value, $tags = array(), $ttl = 3600) {
        $this->redis->setex($key, $ttl, serialize($value));
        
        // Store key in tag sets
        foreach ($tags as $tag) {
            $this->redis->sadd("tag:{$tag}", $key);
        }
    }
    
    public function get($key) {
        $value = $this->redis->get($key);
        return $value ? unserialize($value) : false;
    }
    
    public function invalidate_tag($tag) {
        $keys = $this->redis->smembers("tag:{$tag}");
        
        if (!empty($keys)) {
            $this->redis->del($keys);
            $this->redis->del("tag:{$tag}");
        }
    }
}

// Usage
$cache = new Tagged_Cache();

// Cache post with tags
$cache->set(
    "post_{$post_id}",
    $post_data,
    array("post_type:post", "category:{$cat_id}", "author:{$author_id}")
);

// Invalidate all posts in category
$cache->invalidate_tag("category:5");
```

## Fragment Caching

```php
// Cache expensive fragments
function cached_sidebar() {
    $cache_key = 'sidebar_' . (is_user_logged_in() ? 'logged_in' : 'guest');
    $cached = wp_cache_get($cache_key, 'fragments');
    
    if (false !== $cached) {
        echo $cached;
        return;
    }
    
    ob_start();
    dynamic_sidebar('main-sidebar');
    $output = ob_get_clean();
    
    wp_cache_set($cache_key, $output, 'fragments', HOUR_IN_SECONDS);
    echo $output;
}

// Template tag for fragment caching
function cache_fragment($key, $callback, $ttl = 3600) {
    $cached = wp_cache_get($key, 'fragments');
    
    if (false === $cached) {
        ob_start();
        $callback();
        $cached = ob_get_clean();
        wp_cache_set($key, $cached, 'fragments', $ttl);
    }
    
    return $cached;
}

// Usage in template
echo cache_fragment('popular_posts', function() {
    $posts = get_posts(array('posts_per_page' => 5));
    foreach ($posts as $post) {
        echo "<li>{$post->post_title}</li>";
    }
});
```

## Monitoring Cache Performance

```php
// Track cache metrics
class Cache_Monitor {
    private static $hits = 0;
    private static $misses = 0;
    
    public static function record_hit() {
        self::$hits++;
    }
    
    public static function record_miss() {
        self::$misses++;
    }
    
    public static function get_hit_rate() {
        $total = self::$hits + self::$misses;
        return $total > 0 ? (self::$hits / $total) * 100 : 0;
    }
    
    public static function log_stats() {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log(sprintf(
                'Cache Stats - Hits: %d, Misses: %d, Hit Rate: %.2f%%',
                self::$hits,
                self::$misses,
                self::get_hit_rate()
            ));
        }
    }
}

add_action('shutdown', array('Cache_Monitor', 'log_stats'));
```

## Best Practices

1. **Layer your caches** - Multiple levels for different content types
2. **Cache close to user** - CDN > Page cache > Object cache
3. **Invalidate precisely** - Don't clear entire cache
4. **Monitor hit rates** - Ensure caching is effective
5. **Warm after purge** - Regenerate critical pages
6. **Handle edge cases** - Logged-in users, POST requests

## Common Pitfalls

- Caching user-specific content globally
- Not invalidating on updates
- Over-aggressive cache TTLs
- Missing cache layers
- Not monitoring cache effectiveness

## Exam Tips

- **Understand caching layers and their roles**: Browser cache (client-side, fastest but user-specific), CDN cache (edge locations, static assets), page cache (full HTML, Varnish/Nginx), object cache (database queries, Redis/Memcached), opcode cache (PHP bytecode). Each layer serves different purpose and scope. Layered caching provides defense in depth. Understanding layers helps implement comprehensive caching strategy.

- **Know Varnish/Nginx configuration basics**: Varnish/Nginx can cache full HTML pages before WordPress. Configure cache rules (what to cache, TTL, headers). Handle cache invalidation (purge on content updates). Configure for WordPress (handle cookies, user-specific content). Understanding configuration enables effective page-level caching that dramatically improves performance.

- **Understand cache invalidation strategies**: Invalidate on content change (post update, delete). Use cache tags/keys to track what to invalidate. Purge related caches together (post and archive pages). Set appropriate TTLs (time-to-live). Balance between cache effectiveness and freshness. Understanding invalidation prevents serving stale content while maintaining cache benefits.

- **Know how to implement fragment caching**: Fragment caching caches parts of page (header, footer, sidebar) separately from full page. Use `wp_cache_get/set` or transients. Cache expensive computations or database queries. Combine fragments for full page. More granular than full page cache. Understanding fragment caching enables caching expensive parts while keeping dynamic parts fresh.

- **Understand cache warming importance**: Cache warming pre-populates cache before users request pages. Prevents cold cache performance hit. Use cron jobs or tools to request important pages. Warm after deployments or cache clears. Especially important for high-traffic pages. Understanding warming ensures good performance immediately after cache clears or deployments.
