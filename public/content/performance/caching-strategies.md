# Caching Strategies

## Overview

Caching stores computed results for reuse, dramatically improving performance by avoiding redundant processing.

## Types of Caching

### Page Caching

Full HTML pages cached to avoid PHP processing.

```php
// Page caching is typically handled by plugins or servers
// Key headers for cache control
header('Cache-Control: public, max-age=3600');
header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 3600) . ' GMT');
```

### Object Caching

WordPress data cached in memory.

```php
// Using WordPress object cache
$data = wp_cache_get('my_key', 'my_group');

if (false === $data) {
    $data = expensive_computation();
    wp_cache_set('my_key', $data, 'my_group', 3600);
}
```

### Fragment Caching

Cache parts of pages.

```php
// Cache a widget or section
$fragment = get_transient('sidebar_widget');

if (false === $fragment) {
    ob_start();
    render_expensive_widget();
    $fragment = ob_get_clean();
    set_transient('sidebar_widget', $fragment, HOUR_IN_SECONDS);
}

echo $fragment;
```

### Browser Caching

Static assets cached in browser.

```php
// Set cache headers for static files
function add_cache_headers($headers) {
    if (is_page('static-content')) {
        $headers['Cache-Control'] = 'public, max-age=31536000';
    }
    return $headers;
}
add_filter('wp_headers', 'add_cache_headers');
```

## Transients API

```php
// Simple transient
set_transient('api_data', $data, DAY_IN_SECONDS);
$data = get_transient('api_data');

// Site transient (multisite)
set_site_transient('network_data', $data, HOUR_IN_SECONDS);
```

## Cache Invalidation

```php
// Clear specific cache
delete_transient('api_data');
wp_cache_delete('my_key', 'my_group');

// Clear on content update
add_action('save_post', function($post_id) {
    delete_transient('posts_list');
    wp_cache_delete('recent_posts');
});
```

## Best Practices

1. **Cache at appropriate level** - Don't over-cache
2. **Implement invalidation** - Stale data is dangerous
3. **Use persistent cache** - Redis/Memcached for object cache
4. **Monitor cache hit rates** - Ensure caching is effective
5. **Consider cache warming** - Pre-populate important caches

## Exam Tips

- **Know the different caching layers**: Page caching (full HTML output), object caching (database queries, transients), opcode caching (PHP bytecode), CDN caching (static assets), browser caching (client-side). Each layer serves different purpose and has different scope. Understanding layers helps implement comprehensive caching strategy. Layer caching provides defense in depth - if one layer fails, others still help.

- **Understand transients vs object cache**: Transients use database by default, but use object cache if available (Redis/Memcached). Object cache is in-memory and much faster. Transients have expiration, object cache can be persistent. Use transients for temporary data with expiration. Use object cache directly (`wp_cache_*`) for frequently accessed data. When object cache is available, transients automatically use it. Understanding the relationship helps choose appropriate caching method.

- **Know cache invalidation strategies**: Invalidate on data change (hooks like `save_post`, `delete_post`). Use versioned cache keys for gradual invalidation. Use cache groups for bulk invalidation. Set appropriate TTLs (time-to-live) for automatic expiration. Use cache tags/keys to track what to invalidate. Always invalidate when underlying data changes - stale cache is worse than no cache. Understanding invalidation prevents serving outdated content.

- **Understand when to use each type**: Page cache for full HTML (entire page output). Object cache for database queries and computed data. Transients for temporary data with expiration. Browser cache for static assets (CSS, JS, images). CDN cache for globally distributed static content. Each type has specific use cases. Using wrong type reduces effectiveness or causes problems. Understanding types helps implement appropriate caching for each scenario.

- **Know performance implications**: Caching reduces database load, speeds up page loads, improves scalability. But cache misses still hit database, cache invalidation adds complexity, stale data can cause issues. Measure cache hit rates to ensure effectiveness. Too much caching can hide performance problems. Balance between cache effectiveness and data freshness. Understanding implications helps make informed caching decisions.
