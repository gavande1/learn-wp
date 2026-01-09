# Query Monitor

## Overview

Query Monitor is the essential debugging plugin for WordPress developers. It provides detailed information about database queries, PHP errors, hooks, HTTP requests, and more. Understanding how to use it effectively is crucial for troubleshooting performance and functionality issues.

## Installation and Setup

### Installing Query Monitor

```bash
# Via WP-CLI
wp plugin install query-monitor --activate

# Or download from WordPress.org
```

### Configuration

```php
// wp-config.php - Enable Query Monitor for specific users
define('QM_ENABLE_CAPS_PANEL', true);
define('QM_HIDE_SELF', true);  // Hide QM's own queries
define('QM_DB_EXPENSIVE', 0.05);  // Flag queries over 50ms

// Set cookie for non-admin access
define('QM_COOKIE', 'your-secret-key');
```

## Query Monitor Panels

### Database Queries Panel

```php
// Example of what Query Monitor shows:

// Query: SELECT * FROM wp_posts WHERE post_status = 'publish'
// Time: 0.0234s
// Caller: WP_Query->get_posts()
// Component: Theme (theme-name)

// Identify slow queries
// - Highlighted in red if over QM_DB_EXPENSIVE threshold
// - Shows EXPLAIN output for analysis

// Example problematic query
$posts = $wpdb->get_results(
    "SELECT * FROM {$wpdb->posts} WHERE post_content LIKE '%search%'"
);
// QM shows: Full table scan, no index used
```

### Analyzing Queries

```php
// QM helps identify N+1 problems
// Before (shows multiple queries):
$posts = get_posts(array('posts_per_page' => 10));
foreach ($posts as $post) {
    $meta = get_post_meta($post->ID); // Query for each post!
}

// After (shows single query):
$posts = get_posts(array('posts_per_page' => 10));
update_postmeta_cache(wp_list_pluck($posts, 'ID'));
foreach ($posts as $post) {
    $meta = get_post_meta($post->ID); // From cache
}
```

### Hooks Panel

```php
// Query Monitor shows all hooks that ran:

// Hook: init
// Actions: 45 callbacks
// Priority 10: my_plugin_init (my-plugin/my-plugin.php:23)
// Priority 10: another_function (another-plugin/file.php:100)

// Find where a hook is called
add_action('init', 'my_init_function');

function my_init_function() {
    // QM shows this function was called from init hook
    // with timing information
}

// Debug hook order
add_action('wp_head', 'early_head', 1);
add_action('wp_head', 'late_head', 99);
```

### HTTP Requests Panel

```php
// QM tracks all HTTP requests made during page load

// Shows:
// - URL requested
// - Response code
// - Time taken
// - Request/response headers
// - Request body

// Example API call that QM would display
$response = wp_remote_get('https://api.example.com/data');

// QM shows:
// URL: https://api.example.com/data
// Status: 200 OK
// Time: 0.523s
// Size: 2.4KB
```

### PHP Errors Panel

```php
// QM displays all PHP errors, warnings, notices

// Deprecated function usage
// Notice: Function get_currentuserinfo() is deprecated

// Undefined variable
// Notice: Undefined variable: foo in /path/to/file.php on line 123

// Strict standards
// Strict Standards: Declaration of Child::method() should be compatible

// Shows file, line, and call stack for each error
```

### Environment Panel

```php
// QM shows environment information:

// PHP version, memory limit, max execution time
// WordPress version, database version
// Active theme and plugins
// Server software
// PHP extensions

// Useful for debugging environment-specific issues
```

## Using Query Monitor for Performance

### Identifying Slow Queries

```php
// QM highlights expensive queries
// Look for:
// - Queries over 50ms (configurable)
// - Queries without indexes (full table scans)
// - Duplicate queries
// - Queries in loops

// Before optimization (QM shows 100 queries, 2.5s):
function get_posts_with_views() {
    $posts = get_posts(array('posts_per_page' => 100));
    foreach ($posts as $post) {
        $post->views = get_post_meta($post->ID, 'views', true);
    }
    return $posts;
}

// After optimization (QM shows 2 queries, 0.1s):
function get_posts_with_views_optimized() {
    $posts = get_posts(array(
        'posts_per_page' => 100,
        'meta_key' => 'views',
    ));
    update_postmeta_cache(wp_list_pluck($posts, 'ID'));
    foreach ($posts as $post) {
        $post->views = get_post_meta($post->ID, 'views', true);
    }
    return $posts;
}
```

### Finding Memory Usage

```php
// QM shows memory usage at various points

// High memory indicator - component using excessive memory
// Component: Plugin XYZ
// Memory: 45MB

// Debug memory issues
function memory_intensive_function() {
    $start_memory = memory_get_usage();
    
    // Your code
    
    $end_memory = memory_get_usage();
    error_log('Memory used: ' . ($end_memory - $start_memory));
}
```

### Analyzing Hooks Performance

```php
// QM shows time spent in each hook callback

// Slow callbacks are highlighted
// init -> my_slow_function: 0.5s

// Identify hooks that run too many times
// pre_get_posts: Called 15 times

// Debug specific callback
add_action('init', function() {
    // QM will show this anonymous function
    // and how long it takes
}, 10);
```

## Query Monitor Extensions

### QM Collector Extension

```php
/**
 * Create custom Query Monitor collector
 */
class My_Plugin_QM_Collector extends QM_Collector {
    
    public $id = 'my-plugin';
    
    public function name() {
        return 'My Plugin';
    }
    
    public function process() {
        $this->data['custom_data'] = array(
            'cache_hits' => my_plugin_get_cache_hits(),
            'api_calls' => my_plugin_get_api_calls(),
            'processing_time' => my_plugin_get_total_time(),
        );
    }
}

// Register collector
add_filter('qm/collectors', function($collectors) {
    $collectors['my-plugin'] = new My_Plugin_QM_Collector();
    return $collectors;
});
```

### QM Output Extension

```php
/**
 * Create custom Query Monitor output panel
 */
class My_Plugin_QM_Output extends QM_Output_Html {
    
    public function __construct(QM_Collector $collector) {
        parent::__construct($collector);
        add_filter('qm/output/menus', array($this, 'admin_menu'), 100);
    }
    
    public function output() {
        $data = $this->collector->get_data();
        
        echo '<div class="qm" id="qm-my-plugin">';
        echo '<table>';
        echo '<caption>My Plugin Debug Info</caption>';
        echo '<thead><tr><th>Metric</th><th>Value</th></tr></thead>';
        echo '<tbody>';
        
        foreach ($data['custom_data'] as $key => $value) {
            echo '<tr>';
            echo '<td>' . esc_html($key) . '</td>';
            echo '<td>' . esc_html($value) . '</td>';
            echo '</tr>';
        }
        
        echo '</tbody></table></div>';
    }
    
    public function admin_menu($menu) {
        $menu[] = $this->menu(array(
            'title' => 'My Plugin',
            'id' => 'qm-my-plugin',
        ));
        return $menu;
    }
}

// Register output
add_filter('qm/outputter/html', function($output, $collectors) {
    if (isset($collectors['my-plugin'])) {
        $output['my-plugin'] = new My_Plugin_QM_Output($collectors['my-plugin']);
    }
    return $output;
}, 100, 2);
```

## Remote Debugging

### Debugging AJAX Requests

```php
// QM automatically tracks AJAX requests
// Check the browser's developer tools for X-QM headers

// In response headers:
// X-QM-db_queries: 45
// X-QM-time_taken: 0.234
// X-QM-memory: 12582912
```

### Debugging REST API

```php
// QM tracks REST API requests
// View in QM panel under HTTP requests

// For authenticated REST debugging, use QM's authentication:
// Add ?qm_auth=your-cookie-value to REST URL
```

### Debugging Cron Jobs

```php
// QM can debug cron jobs when triggered manually
// Visit: yourdomain.com/wp-cron.php?doing_wp_cron

// Or use WP-CLI with QM:
// wp eval 'do_action("my_cron_hook");'
```

## Query Monitor Best Practices

### Development Workflow

```php
// 1. Always check QM after adding new features
// 2. Look for:
//    - New database queries
//    - Deprecated function notices
//    - Slow operations
//    - HTTP API calls

// 3. Compare before/after metrics
// Before: 45 queries, 0.5s
// After: 12 queries, 0.15s
```

### Performance Benchmarking

```php
// Use QM's timing data for benchmarking
// Record baseline metrics:

// Page load time: 0.8s
// Database queries: 45
// Memory usage: 32MB

// After optimization:
// Page load time: 0.3s
// Database queries: 15
// Memory usage: 24MB
```

### Conditional Loading

```php
// Only load heavy debugging in development
if (defined('WP_DEBUG') && WP_DEBUG && is_user_logged_in()) {
    // Enable extra debugging
    add_filter('qm/collect/caps', '__return_true');
}
```

## Common Issues Found with QM

### Duplicate Queries

```php
// QM shows: Same query executed 10 times

// Problem:
foreach ($items as $item) {
    $option = get_option('my_option'); // Called every iteration
}

// Solution:
$option = get_option('my_option');
foreach ($items as $item) {
    // Use cached $option
}
```

### Uncached Queries

```php
// QM shows: Query not served from cache

// Problem:
$wpdb->get_results("SELECT * FROM custom_table");

// Solution:
$cache_key = 'custom_table_data';
$data = wp_cache_get($cache_key);
if (false === $data) {
    $data = $wpdb->get_results("SELECT * FROM custom_table");
    wp_cache_set($cache_key, $data, '', HOUR_IN_SECONDS);
}
```

## Best Practices

1. **Install in development** - Essential for debugging
2. **Check after changes** - Verify no new issues
3. **Monitor query count** - Keep it reasonable
4. **Review warnings** - Fix deprecated functions
5. **Use for profiling** - Before and after optimization

## Common Pitfalls

- Leaving QM active in production (performance overhead)
- Ignoring warnings and notices
- Not checking AJAX/REST requests
- Missing slow external HTTP calls

## Exam Tips

- **Know what each QM panel shows**: Queries panel shows all database queries with time, call stack, duplicates. Hooks panel shows all registered hooks and execution order. HTTP panel shows external requests. PHP Errors panel shows errors and warnings. Environment panel shows PHP/WordPress/server info. Understanding panels helps quickly identify performance and functionality issues.

- **Understand how to identify N+1 queries**: N+1 queries occur when you query in a loop (1 query to get posts, then N queries for each post's meta). Query Monitor highlights duplicate queries and shows call stacks. Look for same query executed multiple times. Solution: batch load related data (use `update_post_meta_cache()`). Understanding N+1 problems helps optimize database performance significantly.

- **Know how to debug hooks with QM**: Hooks panel shows all registered hooks, callbacks, priorities, execution order. See which hooks fired and when. Identify hook conflicts (same hook, different priorities). See callback execution time. Filter hooks by name or component. Understanding hook debugging helps troubleshoot code that doesn't execute or runs at wrong time.

- **Understand HTTP request debugging**: HTTP panel shows external API calls, response times, status codes, request/response data. Identify slow external requests blocking page load. See failed requests and errors. Check for unnecessary external calls. Understanding HTTP debugging helps optimize external integrations and identify third-party performance issues.

- **Know QM's configuration options**: Can disable QM for specific users (admins only). Can disable specific panels for performance. Can configure what gets logged. Can add custom collectors for custom data. Should disable in production (performance overhead). Understanding configuration enables using QM effectively without impacting performance.
