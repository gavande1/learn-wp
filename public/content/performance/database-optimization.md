# Database Optimization

## Overview

Database performance directly impacts WordPress site speed. Optimizing queries, indexes, and database structure is essential for handling traffic at scale.

## Query Analysis

### Using SAVEQUERIES

```php
// In wp-config.php (development only!)
define('SAVEQUERIES', true);

// View all queries
function show_query_log() {
    global $wpdb;
    
    if (!defined('SAVEQUERIES') || !SAVEQUERIES) {
        return;
    }
    
    echo '<pre>';
    foreach ($wpdb->queries as $query) {
        printf(
            "Query: %s\nTime: %f seconds\nCaller: %s\n\n",
            $query[0],
            $query[1],
            $query[2]
        );
    }
    echo '</pre>';
    
    // Summary
    printf(
        "Total queries: %d, Total time: %f seconds\n",
        count($wpdb->queries),
        array_sum(array_column($wpdb->queries, 1))
    );
}
add_action('wp_footer', 'show_query_log');
```

### Identifying Slow Queries

```php
// Log slow queries
add_filter('query', 'log_slow_queries');

function log_slow_queries($query) {
    static $start_times = array();
    
    // Store start time
    $start_times[md5($query)] = microtime(true);
    
    return $query;
}

add_action('shutdown', function() {
    global $wpdb;
    
    foreach ($wpdb->queries as $query_data) {
        if ($query_data[1] > 0.1) { // Queries over 100ms
            error_log(sprintf(
                'Slow Query (%.4fs): %s',
                $query_data[1],
                $query_data[0]
            ));
        }
    }
});
```

## Query Optimization Techniques

### Use Specific Fields

```php
// BAD - fetches all columns
$wpdb->get_results("SELECT * FROM {$wpdb->posts} WHERE post_status = 'publish'");

// GOOD - fetch only needed columns
$wpdb->get_results("SELECT ID, post_title FROM {$wpdb->posts} WHERE post_status = 'publish'");

// With WP_Query
$query = new WP_Query(array(
    'fields' => 'ids', // Only get post IDs
    'posts_per_page' => 100,
));
```

### Proper Indexing

```php
// Add index to custom table
function create_optimized_table() {
    global $wpdb;
    
    $charset_collate = $wpdb->get_charset_collate();
    $table_name = $wpdb->prefix . 'custom_data';
    
    $sql = "CREATE TABLE $table_name (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        item_type varchar(50) NOT NULL,
        item_value text NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id),
        KEY item_type (item_type),
        KEY user_type (user_id, item_type)
    ) $charset_collate;";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}

// Check if index exists
function index_exists($table, $index_name) {
    global $wpdb;
    
    $result = $wpdb->get_row("SHOW INDEX FROM {$table} WHERE Key_name = '{$index_name}'");
    return !empty($result);
}

// Add index if missing
function ensure_index($table, $index_name, $columns) {
    global $wpdb;
    
    if (!index_exists($table, $index_name)) {
        $cols = implode(', ', $columns);
        $wpdb->query("CREATE INDEX {$index_name} ON {$table} ({$cols})");
    }
}
```

### Avoid N+1 Queries

```php
// BAD - N+1 problem
$posts = get_posts(array('posts_per_page' => 100));
foreach ($posts as $post) {
    $meta = get_post_meta($post->ID); // Query for each post!
    $terms = wp_get_post_terms($post->ID, 'category'); // Another query!
}

// GOOD - Use update_*_cache functions
$posts = get_posts(array('posts_per_page' => 100));
$post_ids = wp_list_pluck($posts, 'ID');

// Prime meta cache in single query
update_postmeta_cache($post_ids);

// Prime term cache in single query
update_object_term_cache($post_ids, 'post');

// Now these are cached
foreach ($posts as $post) {
    $meta = get_post_meta($post->ID); // From cache
    $terms = wp_get_post_terms($post->ID, 'category'); // From cache
}
```

### Efficient Counting

```php
// BAD - fetches all rows to count
$posts = get_posts(array('posts_per_page' => -1));
$count = count($posts);

// GOOD - use found_posts or direct count
$query = new WP_Query(array(
    'posts_per_page' => 1,
    'fields' => 'ids',
));
$count = $query->found_posts;

// Or direct SQL count
global $wpdb;
$count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_status = 'publish'");
```

### Limit Result Sets

```php
// Always set reasonable limits
$query = new WP_Query(array(
    'posts_per_page' => 20, // Not -1!
    'no_found_rows' => true, // Skip counting total if not needed
    'update_post_meta_cache' => false, // Skip if not using meta
    'update_post_term_cache' => false, // Skip if not using terms
));

// For direct queries
$wpdb->get_results(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}large_table LIMIT %d OFFSET %d",
        100,
        $page * 100
    )
);
```

## WP_Query Optimization

### Disable Unnecessary Features

```php
$query = new WP_Query(array(
    'post_type' => 'post',
    'posts_per_page' => 10,
    
    // Performance optimizations
    'no_found_rows' => true,          // Don't count total rows
    'update_post_meta_cache' => false, // Skip meta cache
    'update_post_term_cache' => false, // Skip term cache
    'fields' => 'ids',                 // Only get IDs
    
    // Avoid expensive operations
    'suppress_filters' => true,        // Skip filters
    'ignore_sticky_posts' => true,     // Skip sticky post logic
));
```

### Efficient Meta Queries

```php
// BAD - full text search on meta_value
$query = new WP_Query(array(
    'meta_query' => array(
        array(
            'key' => 'description',
            'value' => 'search term',
            'compare' => 'LIKE', // Full table scan!
        ),
    ),
));

// BETTER - indexed exact match
$query = new WP_Query(array(
    'meta_query' => array(
        array(
            'key' => 'category_slug',
            'value' => 'electronics',
            'compare' => '=', // Can use index
        ),
    ),
));

// BEST - use custom table with proper indexes for complex queries
```

### Tax Query Optimization

```php
// Multiple term queries can be slow
$query = new WP_Query(array(
    'tax_query' => array(
        'relation' => 'AND',
        array(
            'taxonomy' => 'category',
            'terms' => array(1, 2, 3),
            'operator' => 'IN',
        ),
        array(
            'taxonomy' => 'post_tag',
            'terms' => array(10, 20),
            'operator' => 'AND', // Slower than IN
        ),
    ),
));

// Consider caching complex taxonomy queries
function get_complex_taxonomy_posts() {
    $cache_key = 'complex_tax_query_' . md5(serialize($args));
    $posts = wp_cache_get($cache_key, 'tax_queries');
    
    if ($posts === false) {
        $posts = get_posts($args);
        wp_cache_set($cache_key, $posts, 'tax_queries', HOUR_IN_SECONDS);
    }
    
    return $posts;
}
```

## Database Maintenance

### Cleanup Queries

```php
// Remove post revisions (careful in production!)
function cleanup_revisions($post_type = 'post', $keep = 5) {
    global $wpdb;
    
    $posts = $wpdb->get_col(
        $wpdb->prepare(
            "SELECT DISTINCT post_parent FROM {$wpdb->posts} 
             WHERE post_type = 'revision' 
             AND post_parent IN (
                 SELECT ID FROM {$wpdb->posts} WHERE post_type = %s
             )",
            $post_type
        )
    );
    
    foreach ($posts as $post_id) {
        $revisions = wp_get_post_revisions($post_id);
        $to_delete = array_slice($revisions, $keep);
        
        foreach ($to_delete as $revision) {
            wp_delete_post_revision($revision->ID);
        }
    }
}

// Clean up orphaned meta
function cleanup_orphaned_postmeta() {
    global $wpdb;
    
    $wpdb->query("
        DELETE pm FROM {$wpdb->postmeta} pm
        LEFT JOIN {$wpdb->posts} p ON pm.post_id = p.ID
        WHERE p.ID IS NULL
    ");
}

// Clean expired transients
function cleanup_expired_transients() {
    global $wpdb;
    
    $wpdb->query("
        DELETE FROM {$wpdb->options}
        WHERE option_name LIKE '_transient_timeout_%'
        AND option_value < UNIX_TIMESTAMP()
    ");
    
    $wpdb->query("
        DELETE FROM {$wpdb->options}
        WHERE option_name LIKE '_transient_%'
        AND option_name NOT LIKE '_transient_timeout_%'
        AND option_name NOT IN (
            SELECT CONCAT('_transient_', SUBSTRING(option_name, 20))
            FROM (SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_%') AS t
        )
    ");
}
```

### Optimize Tables

```php
// Schedule table optimization
function optimize_database_tables() {
    global $wpdb;
    
    $tables = array(
        $wpdb->posts,
        $wpdb->postmeta,
        $wpdb->options,
        $wpdb->comments,
        $wpdb->commentmeta,
    );
    
    foreach ($tables as $table) {
        $wpdb->query("OPTIMIZE TABLE {$table}");
    }
}

// Schedule weekly
if (!wp_next_scheduled('optimize_db_tables')) {
    wp_schedule_event(time(), 'weekly', 'optimize_db_tables');
}
add_action('optimize_db_tables', 'optimize_database_tables');
```

## Autoload Optimization

```php
// Check autoloaded options size
function get_autoload_size() {
    global $wpdb;
    
    $size = $wpdb->get_var("
        SELECT SUM(LENGTH(option_value))
        FROM {$wpdb->options}
        WHERE autoload = 'yes'
    ");
    
    return size_format($size);
}

// Disable autoload for large options
function disable_autoload_for_large_options() {
    global $wpdb;
    
    $wpdb->query("
        UPDATE {$wpdb->options}
        SET autoload = 'no'
        WHERE autoload = 'yes'
        AND LENGTH(option_value) > 10000
    ");
}

// Set autoload when adding options
add_option('my_small_option', $value, '', 'yes'); // Autoload
add_option('my_large_option', $big_value, '', 'no'); // Don't autoload
```

## Query Caching Layer

```php
// Cache expensive queries
function cached_query($sql, $cache_key, $ttl = 3600) {
    $result = wp_cache_get($cache_key, 'db_queries');
    
    if ($result === false) {
        global $wpdb;
        $result = $wpdb->get_results($sql);
        wp_cache_set($cache_key, $result, 'db_queries', $ttl);
    }
    
    return $result;
}

// Usage
$popular_posts = cached_query(
    "SELECT p.*, COUNT(c.comment_ID) as comment_count
     FROM {$wpdb->posts} p
     LEFT JOIN {$wpdb->comments} c ON p.ID = c.comment_post_ID
     WHERE p.post_status = 'publish'
     GROUP BY p.ID
     ORDER BY comment_count DESC
     LIMIT 10",
    'popular_posts_by_comments',
    HOUR_IN_SECONDS
);
```

## Best Practices

1. **Profile queries** - Use Query Monitor or SAVEQUERIES
2. **Index appropriately** - Add indexes for WHERE/JOIN columns
3. **Limit results** - Never use posts_per_page = -1 in production
4. **Cache results** - Use object cache for expensive queries
5. **Batch operations** - Process large datasets in chunks
6. **Use prepared statements** - For security and query plan caching

## Common Pitfalls

- Using SELECT * when only few columns needed
- Missing indexes on frequently queried columns
- Not caching expensive query results
- Loading all posts to count them
- Complex meta queries on large datasets

## Exam Tips

- **Know WP_Query optimization parameters**: Use `no_found_rows => true` to skip expensive pagination count. Use `update_post_meta_cache => false` and `update_post_term_cache => false` when you don't need that data. Use `fields => 'ids'` to return only IDs. Use `posts_per_page` to limit results. These parameters reduce database queries and memory usage significantly. Always use them when you don't need the extra data.

- **Understand indexing strategies**: Add indexes on frequently queried columns (WHERE, ORDER BY, JOIN columns). Use composite indexes for multi-column queries. Index foreign keys in custom tables. Don't over-index (slows INSERT/UPDATE). WordPress auto-indexes primary keys. For `wp_postmeta`, consider custom indexes on frequently queried `meta_key` values. Understanding indexing dramatically improves query performance on large datasets.

- **Know how to analyze slow queries**: Use Query Monitor plugin to identify slow queries. Use `EXPLAIN` to see execution plans. Look for table scans (bad), missing indexes, inefficient JOINs. Monitor query time and frequency. Identify N+1 query problems (queries in loops). Use `SAVEQUERIES` to log all queries. Understanding slow queries helps prioritize optimization efforts and measure improvements.

- **Understand autoload options impact**: Autoloaded options are loaded on every page request into memory. Too many or large autoloaded options slow down every page. Use `autoload => 'no'` for large or rarely accessed options. Monitor autoloaded options size with database queries. Move large options to non-autoloaded or custom tables. Understanding autoload impact helps optimize WordPress performance significantly.

- **Know update_*_cache functions**: `update_post_meta_cache($post_ids)` preloads post meta for multiple posts (prevents N+1 queries). `update_post_term_cache($post_ids)` preloads taxonomy terms. `update_post_caches($posts)` does both. Use these when you know you'll need meta/terms for multiple posts. Batch loading is much more efficient than loading individually. Understanding these functions helps eliminate N+1 query problems.
