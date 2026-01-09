# Object Cache

## Overview

The WordPress object cache stores database query results and computed values in memory, reducing database load and improving performance. Understanding both the native and persistent object caching is crucial for WordPress optimization.

## How Object Cache Works

### The Problem It Solves

```php
// Without caching - queries database every time
$value = get_option('my_option'); // Database query
$value = get_option('my_option'); // Another database query
$value = get_option('my_option'); // Yet another query

// With object cache - first call queries, rest use cache
$value = get_option('my_option'); // Database query + cache
$value = get_option('my_option'); // From cache (no query)
$value = get_option('my_option'); // From cache (no query)
```

### Native vs Persistent Cache

| Type | Scope | Backend | Speed | Use Case |
|------|-------|---------|-------|----------|
| Native | Single request | PHP array | Fastest | Default |
| Persistent | Across requests | Redis/Memcached | Fast | High traffic |

## Core Object Cache Functions

### wp_cache_get() and wp_cache_set()

```php
// Basic caching pattern
function get_expensive_data($id) {
    $cache_key = 'expensive_data_' . $id;
    $cache_group = 'my_plugin';
    
    // Try to get from cache
    $data = wp_cache_get($cache_key, $cache_group);
    
    if ($data === false) {
        // Cache miss - compute/fetch data
        $data = expensive_computation($id);
        
        // Store in cache for 1 hour
        wp_cache_set($cache_key, $data, $cache_group, HOUR_IN_SECONDS);
    }
    
    return $data;
}
```

### wp_cache_add()

```php
// Only add if key doesn't exist
$added = wp_cache_add('my_key', $value, 'my_group');

if ($added) {
    // Value was added (didn't exist before)
} else {
    // Value already existed
}

// Useful for locks and preventing race conditions
function acquire_lock($lock_name, $duration = 60) {
    return wp_cache_add(
        'lock_' . $lock_name,
        time(),
        'locks',
        $duration
    );
}
```

### wp_cache_delete()

```php
// Delete specific cache entry
wp_cache_delete('my_key', 'my_group');

// Clear all items in a group (persistent cache only)
wp_cache_flush_group('my_group');

// Clear entire cache (use sparingly!)
wp_cache_flush();
```

### wp_cache_replace()

```php
// Replace only if key exists
$replaced = wp_cache_replace('my_key', $new_value, 'my_group');

if ($replaced) {
    // Value was updated
} else {
    // Key didn't exist - nothing happened
}
```

## Cache Groups

```php
// Organize cache with groups
wp_cache_set('user_123', $user_data, 'user_profiles');
wp_cache_set('user_456', $user_data, 'user_profiles');
wp_cache_set('settings', $settings, 'site_config');

// Get from specific group
$user = wp_cache_get('user_123', 'user_profiles');

// Non-persistent groups (never persisted across requests)
wp_cache_add_non_persistent_groups(array('my_temp_group'));

// Global groups (shared across multisite)
wp_cache_add_global_groups(array('users', 'site-options'));
```

## Caching Patterns

### Read-Through Cache

```php
function get_user_statistics($user_id) {
    $cache_key = "user_stats_{$user_id}";
    $stats = wp_cache_get($cache_key, 'statistics');
    
    if ($stats === false) {
        // Cache miss - fetch from database
        global $wpdb;
        $stats = $wpdb->get_row($wpdb->prepare(
            "SELECT COUNT(*) as posts, SUM(views) as views 
             FROM {$wpdb->posts} p
             JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
             WHERE post_author = %d AND meta_key = 'views'",
            $user_id
        ));
        
        wp_cache_set($cache_key, $stats, 'statistics', HOUR_IN_SECONDS);
    }
    
    return $stats;
}
```

### Cache Invalidation

```php
// Invalidate on data change
add_action('save_post', 'invalidate_post_cache', 10, 3);

function invalidate_post_cache($post_id, $post, $update) {
    // Clear specific post cache
    wp_cache_delete("post_{$post_id}", 'posts');
    
    // Clear related caches
    wp_cache_delete("author_posts_{$post->post_author}", 'author_posts');
    
    // Clear category caches
    $categories = wp_get_post_categories($post_id);
    foreach ($categories as $cat_id) {
        wp_cache_delete("category_posts_{$cat_id}", 'category_posts');
    }
}
```

### Cache Warming

```php
// Pre-populate cache on deployment/schedule
function warm_cache() {
    // Cache popular posts
    $popular = get_posts(array(
        'posts_per_page' => 100,
        'meta_key' => 'views',
        'orderby' => 'meta_value_num',
        'order' => 'DESC',
    ));
    
    foreach ($popular as $post) {
        // This triggers caching
        get_post_meta($post->ID);
        get_the_terms($post->ID, 'category');
    }
}

// Schedule cache warming
if (!wp_next_scheduled('warm_cache_event')) {
    wp_schedule_event(time(), 'hourly', 'warm_cache_event');
}
add_action('warm_cache_event', 'warm_cache');
```

## Persistent Object Cache

### Redis Configuration

```php
// wp-config.php
define('WP_REDIS_HOST', '127.0.0.1');
define('WP_REDIS_PORT', 6379);
define('WP_REDIS_PASSWORD', 'your_password');
define('WP_REDIS_DATABASE', 0);
define('WP_REDIS_PREFIX', 'wp_');

// For clustered Redis
define('WP_REDIS_CLUSTER', array(
    'tcp://node1:6379',
    'tcp://node2:6379',
    'tcp://node3:6379',
));
```

### Memcached Configuration

```php
// wp-config.php
$memcached_servers = array(
    'default' => array(
        '127.0.0.1:11211',
    ),
);
```

### Custom Object Cache Drop-in

```php
// wp-content/object-cache.php
function wp_cache_get($key, $group = 'default', $force = false, &$found = null) {
    global $wp_object_cache;
    return $wp_object_cache->get($key, $group, $force, $found);
}

function wp_cache_set($key, $data, $group = 'default', $expire = 0) {
    global $wp_object_cache;
    return $wp_object_cache->set($key, $data, $group, $expire);
}

// ... implement full interface
```

## WP_Object_Cache Class

```php
// Accessing the cache object directly
global $wp_object_cache;

// Get cache stats
$stats = $wp_object_cache->stats();

// Check if using persistent cache
if (wp_using_ext_object_cache()) {
    echo 'Using persistent object cache';
}
```

## Advanced Patterns

### Multi-Get Operations

```php
// Fetch multiple values at once (more efficient)
function get_multiple_users($user_ids) {
    $keys = array();
    foreach ($user_ids as $id) {
        $keys[] = "user_{$id}";
    }
    
    // Get all cached values
    $cached = wp_cache_get_multiple($keys, 'users');
    
    $users = array();
    $missing_ids = array();
    
    foreach ($user_ids as $id) {
        $key = "user_{$id}";
        if (isset($cached[$key]) && $cached[$key] !== false) {
            $users[$id] = $cached[$key];
        } else {
            $missing_ids[] = $id;
        }
    }
    
    // Fetch missing from database
    if (!empty($missing_ids)) {
        $fetched = get_users(array('include' => $missing_ids));
        foreach ($fetched as $user) {
            $users[$user->ID] = $user;
            wp_cache_set("user_{$user->ID}", $user, 'users', HOUR_IN_SECONDS);
        }
    }
    
    return $users;
}
```

### Cache Stampede Prevention

```php
// Prevent multiple processes regenerating same cache
function get_expensive_with_lock($key, $callback, $ttl = 3600) {
    $cache_key = "data_{$key}";
    $lock_key = "lock_{$key}";
    
    $data = wp_cache_get($cache_key, 'expensive');
    
    if ($data !== false) {
        return $data;
    }
    
    // Try to acquire lock
    if (!wp_cache_add($lock_key, 1, 'locks', 30)) {
        // Another process is generating - wait and retry
        usleep(100000); // 100ms
        return wp_cache_get($cache_key, 'expensive');
    }
    
    try {
        // Generate data
        $data = $callback();
        wp_cache_set($cache_key, $data, 'expensive', $ttl);
    } finally {
        wp_cache_delete($lock_key, 'locks');
    }
    
    return $data;
}
```

### Graceful Degradation

```php
// Return stale data while regenerating
function get_with_stale_while_revalidate($key, $callback, $ttl = 3600, $stale_ttl = 86400) {
    $cache_key = "data_{$key}";
    $time_key = "time_{$key}";
    
    $data = wp_cache_get($cache_key, 'my_cache');
    $cached_time = wp_cache_get($time_key, 'my_cache');
    
    $is_stale = $cached_time && (time() - $cached_time) > $ttl;
    
    if ($data !== false && !$is_stale) {
        return $data; // Fresh data
    }
    
    if ($data !== false && $is_stale) {
        // Return stale data, regenerate in background
        wp_schedule_single_event(time(), 'regenerate_cache', array($key));
        return $data;
    }
    
    // No data - must generate synchronously
    $data = $callback();
    wp_cache_set($cache_key, $data, 'my_cache', $stale_ttl);
    wp_cache_set($time_key, time(), 'my_cache', $stale_ttl);
    
    return $data;
}
```

## Debugging Object Cache

```php
// Check if value is cached
$found = false;
$value = wp_cache_get('my_key', 'my_group', false, $found);

if ($found) {
    echo 'Value was in cache';
} else {
    echo 'Cache miss';
}

// Log cache operations
add_action('plugins_loaded', function() {
    if (defined('WP_DEBUG') && WP_DEBUG) {
        add_filter('pre_cache_set', function($value, $key, $group) {
            error_log("Cache SET: {$group}:{$key}");
            return $value;
        }, 10, 3);
    }
});
```

## Best Practices

1. **Use cache groups** - Organize related data
2. **Set appropriate TTLs** - Balance freshness vs performance
3. **Invalidate properly** - Clear cache when data changes
4. **Use persistent cache** - For high-traffic sites
5. **Avoid cache stampedes** - Use locking patterns
6. **Monitor cache hit rates** - Use tools like Query Monitor

## Common Pitfalls

- Caching user-specific data without user ID in key
- Forgetting to invalidate cache on updates
- Setting TTL too long (stale data) or too short (no benefit)
- Not handling cache misses gracefully
- Storing too much data in cache

## Exam Tips

- **Know all wp_cache_* functions**: `wp_cache_get($key, $group)` retrieves cached data. `wp_cache_set($key, $data, $group, $expire)` stores data. `wp_cache_delete($key, $group)` removes specific item. `wp_cache_flush_group($group)` clears entire group. `wp_cache_flush()` clears all cache. `wp_cache_add()` only sets if key doesn't exist. Understanding these functions enables effective object caching implementation.

- **Understand native vs persistent caching**: Native (default) uses in-memory cache that's lost on page load - only useful within single request. Persistent caching (Redis/Memcached) stores across requests - much more effective. WordPress automatically uses persistent cache if available via drop-in plugin (`object-cache.php`). Persistent cache dramatically improves performance by avoiding repeated database queries. Always use persistent cache in production environments.

- **Know how to configure Redis/Memcached**: Install Redis or Memcached server. Create `wp-content/object-cache.php` drop-in plugin (or use existing plugin). Configure connection in `wp-config.php` or drop-in. Test with `wp_using_ext_object_cache()` to verify it's active. Both provide similar functionality - Redis has more features, Memcached is simpler. Proper configuration is essential for object cache to work effectively.

- **Understand cache groups and invalidation**: Cache groups organize related cache entries (e.g., 'posts', 'users', 'options'). Use groups to invalidate related caches together: `wp_cache_flush_group('posts')`. Groups help manage cache lifecycle. Use descriptive group names. Invalidate groups when related data changes. Understanding groups enables efficient cache management and prevents stale data issues.

- **Know when cache is automatically cleared**: WordPress clears object cache on: `switch_theme`, `activate_plugin`, `deactivate_plugin`, `update_option` (some options), `clean_post_cache`. Custom post type/taxonomy registration may clear cache. Some plugins clear cache on their updates. Understanding automatic clearing helps debug cache issues and know when manual invalidation is needed. Don't rely solely on automatic clearing - invalidate explicitly when your data changes.
