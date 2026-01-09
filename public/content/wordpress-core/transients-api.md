# Transients API

## Overview

Transients are a way to store cached data temporarily in the database with an expiration time. They're perfect for caching expensive operations like external API calls, complex queries, or computed data.

## Key Concepts

### What Are Transients?

- Temporary data with automatic expiration
- Stored in `wp_options` table (or object cache if available)
- Automatically deleted when expired
- Can be deleted at any time (cache invalidation)

## Basic Functions

### Setting a Transient

```php
// Set a transient that expires in 1 hour
set_transient('my_transient', $data, HOUR_IN_SECONDS);

// Set a transient that expires in 12 hours
set_transient('api_response', $api_data, 12 * HOUR_IN_SECONDS);

// Transient with no expiration (not recommended)
set_transient('permanent_cache', $data, 0);
```

### Getting a Transient

```php
// Get a transient
$data = get_transient('my_transient');

// Check if transient exists
if (false === ($data = get_transient('my_transient'))) {
    // Transient doesn't exist or expired
    // Regenerate the data
    $data = expensive_operation();
    set_transient('my_transient', $data, HOUR_IN_SECONDS);
}
```

### Deleting a Transient

```php
// Delete a specific transient
delete_transient('my_transient');

// Useful for cache invalidation
add_action('save_post', function($post_id) {
    delete_transient('recent_posts_cache');
});
```

## Time Constants

WordPress provides helpful time constants:

```php
MINUTE_IN_SECONDS  // 60
HOUR_IN_SECONDS    // 3600
DAY_IN_SECONDS     // 86400
WEEK_IN_SECONDS    // 604800
MONTH_IN_SECONDS   // 2592000
YEAR_IN_SECONDS    // 31536000
```

## Common Use Cases

### Caching API Responses

```php
function get_weather_data($city) {
    $transient_key = 'weather_' . sanitize_key($city);
    
    // Check for cached data
    $weather = get_transient($transient_key);
    
    if (false === $weather) {
        // Make API call
        $response = wp_remote_get(
            "https://api.weather.com/city/{$city}"
        );
        
        if (is_wp_error($response)) {
            return false;
        }
        
        $weather = json_decode(wp_remote_retrieve_body($response));
        
        // Cache for 30 minutes
        set_transient($transient_key, $weather, 30 * MINUTE_IN_SECONDS);
    }
    
    return $weather;
}
```

### Caching Complex Queries

```php
function get_popular_posts($count = 5) {
    $transient_key = 'popular_posts_' . $count;
    $posts = get_transient($transient_key);
    
    if (false === $posts) {
        $posts = new WP_Query(array(
            'posts_per_page' => $count,
            'meta_key' => 'post_views',
            'orderby' => 'meta_value_num',
            'order' => 'DESC'
        ));
        
        // Cache for 1 hour
        set_transient($transient_key, $posts, HOUR_IN_SECONDS);
    }
    
    return $posts;
}
```

## Multisite Transients

```php
// Site-specific transient (default)
set_transient('site_cache', $data, HOUR_IN_SECONDS);

// Network-wide transient (multisite)
set_site_transient('network_cache', $data, HOUR_IN_SECONDS);
get_site_transient('network_cache');
delete_site_transient('network_cache');
```

## Cache Invalidation

```php
// Invalidate cache when content changes
add_action('save_post', 'invalidate_post_caches');
add_action('delete_post', 'invalidate_post_caches');
add_action('trash_post', 'invalidate_post_caches');

function invalidate_post_caches($post_id) {
    // Delete specific transients
    delete_transient('recent_posts');
    delete_transient('popular_posts_5');
    delete_transient('popular_posts_10');
    
    // Or delete by pattern (requires custom function)
    delete_transients_with_prefix('post_cache_');
}

// Helper to delete transients by prefix
function delete_transients_with_prefix($prefix) {
    global $wpdb;
    
    $wpdb->query(
        $wpdb->prepare(
            "DELETE FROM {$wpdb->options} 
             WHERE option_name LIKE %s 
             OR option_name LIKE %s",
            $wpdb->esc_like('_transient_' . $prefix) . '%',
            $wpdb->esc_like('_transient_timeout_' . $prefix) . '%'
        )
    );
}
```

## Object Cache Integration

When an object cache (Redis, Memcached) is available:
- Transients are stored in the object cache, not the database
- Expiration is handled by the cache backend
- Much faster than database storage

```php
// Check if object cache is available
if (wp_using_ext_object_cache()) {
    // Using external object cache
    // Transients stored in memory cache
} else {
    // Using database for transients
}
```

## Best Practices

1. **Always check for false** - Not just empty
2. **Use appropriate expiration times** - Balance freshness and performance
3. **Implement cache invalidation** - Clear caches when data changes
4. **Use unique keys** - Include parameters in transient names
5. **Handle failures gracefully** - API calls can fail

## Common Pitfalls

- **Storing too much data** - Transients have size limits
- **Not invalidating on updates** - Serving stale data
- **Using transients for session data** - Use actual sessions
- **Forgetting transients don't guarantee storage** - They can be deleted anytime
- **Not handling the "no data" case** - When API fails after cache expires

## Exam Tips

- **Know the difference between transients and options**: Transients are temporary cached data with automatic expiration times, stored in the same `wp_options` table but with expiration metadata. Options are permanent storage. Use transients for cacheable data that can be regenerated, and options for persistent settings that must always be available.

- **Understand how transients work with object caches**: When an object cache (Redis, Memcached) is available, transients are stored in the cache instead of the database, making them much faster. The expiration is handled by the cache backend. Use `wp_using_ext_object_cache()` to check if an external cache is active.

- **Be able to implement proper cache invalidation**: Always delete transients when the underlying data changes (e.g., on `save_post`, `delete_post`). Use hooks to automatically invalidate caches when content is modified. Consider using prefixed transient names and helper functions to delete groups of related transients.

- **Know the time constants**: WordPress provides constants like `MINUTE_IN_SECONDS`, `HOUR_IN_SECONDS`, `DAY_IN_SECONDS`, `WEEK_IN_SECONDS`, `MONTH_IN_SECONDS`, and `YEAR_IN_SECONDS`. Always use these instead of hardcoded numbers for better readability and maintainability.

- **Understand multisite transient functions**: `set_transient()` and `get_transient()` are site-specific, while `set_site_transient()` and `get_site_transient()` are network-wide in multisite installations. Use site transients for network-level caching that should be shared across all sites.
