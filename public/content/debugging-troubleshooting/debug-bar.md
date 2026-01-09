# Debug Bar

## Overview

Debug Bar is a debugging plugin that adds a debug menu to the admin bar showing query, cache, and other helpful debugging information. While Query Monitor is more comprehensive, Debug Bar offers a simpler interface and serves as the foundation for many debugging extensions.

## Installation and Setup

### Basic Installation

```bash
# Via WP-CLI
wp plugin install debug-bar --activate

# Enable debugging in wp-config.php
define('WP_DEBUG', true);
define('SAVEQUERIES', true);
```

### Configuration

```php
// wp-config.php settings for Debug Bar
define('WP_DEBUG', true);
define('WP_DEBUG_DISPLAY', true);
define('SAVEQUERIES', true);

// Optionally increase memory for debugging
define('WP_MEMORY_LIMIT', '256M');
```

## Debug Bar Panels

### Queries Panel

```php
// Debug Bar shows database queries when SAVEQUERIES is enabled

// Information displayed:
// - Total number of queries
// - Total query time
// - Individual query details

// Example query display:
// Query: SELECT * FROM wp_posts WHERE ID = 123
// Time: 0.0012s
// Called by: get_post() in theme.php:45
```

### Object Cache Panel

```php
// Shows object cache statistics

// Displays:
// - Cache hits
// - Cache misses
// - Cache ratio

// Understanding cache efficiency:
// Good: 80%+ hit rate
// Needs work: Below 50% hit rate

// Debug cache issues
$cached = wp_cache_get('my_key', 'my_group');
if (false === $cached) {
    // This will show as a cache miss
    $data = expensive_operation();
    wp_cache_set('my_key', $data, 'my_group', 3600);
}
```

### PHP Panel

```php
// Shows PHP information

// Displays:
// - PHP version
// - Memory usage (current and peak)
// - Included files count

// Memory debugging
// Watch for high memory usage
// Peak memory approaching limit indicates problems
```

### WP Query Panel

```php
// Shows main WP_Query information

// Displays:
// - Query vars
// - Query SQL
// - Query results

// Debug main query issues
// Example: Why is the wrong template loading?
// Check query vars to see what WordPress detected
```

## Debug Bar Extensions

### Debug Bar Console

```php
// Add PHP/SQL console to Debug Bar

// Run PHP code:
// echo get_option('siteurl');

// Run SQL queries:
// SELECT COUNT(*) FROM wp_posts WHERE post_status = 'publish'

// Useful for quick debugging without editing files
```

### Debug Bar Transients

```php
// Shows transient information

// Displays:
// - All transients
// - Expiration times
// - Size of transient data

// Debug transient issues
set_transient('my_transient', $data, HOUR_IN_SECONDS);

// Check in Debug Bar Transients:
// Name: my_transient
// Expires: 1 hour
// Size: 2.5KB
```

### Debug Bar Cron

```php
// Shows scheduled cron events

// Displays:
// - All scheduled events
// - Next run time
// - Schedule (hourly, daily, etc.)
// - Hooked functions

// Debug cron issues
// Check if your event is scheduled:
if (!wp_next_scheduled('my_cron_event')) {
    wp_schedule_event(time(), 'hourly', 'my_cron_event');
}
```

### Debug Bar Actions and Filters

```php
// Shows all hooks that ran

// Displays:
// - All actions fired
// - All filters applied
// - Callbacks attached
// - Priority order

// Debug hook issues
add_action('init', 'my_function', 10);
// Verify in Debug Bar that my_function is attached to init
```

### Debug Bar Post Types

```php
// Shows registered post types and taxonomies

// Displays:
// - All registered post types
// - Post type arguments
// - Capabilities
// - Registered taxonomies

// Debug CPT registration
register_post_type('product', array(
    'public' => true,
    'label' => 'Products',
));
// Verify registration in Debug Bar Post Types
```

### Debug Bar Rewrite Rules

```php
// Shows rewrite rules

// Displays:
// - All rewrite rules
// - Regex patterns
// - Query matches

// Debug permalink issues
// Find which rule matches your URL
// Debug custom rewrite rules:
add_rewrite_rule(
    '^products/([^/]+)/?$',
    'index.php?product=$matches[1]',
    'top'
);
```

## Using Debug Bar Effectively

### Debugging Slow Pages

```php
// Use Debug Bar to identify bottlenecks

// 1. Check total queries
//    High query count = potential N+1 problem

// 2. Check query time
//    Individual slow queries need optimization

// 3. Check memory usage
//    High memory = loading too much data

// Example: Finding slow queries
// In Debug Bar Queries panel:
// Look for queries taking > 0.01s
// Check if same query runs multiple times
```

### Debugging Cache Issues

```php
// Use Object Cache panel to debug caching

// Low hit rate indicates:
// - Cache not being used effectively
// - Cache expiring too quickly
// - Keys not being cached properly

// Improve cache usage:
function get_expensive_data() {
    $cache_key = 'expensive_data';
    $data = wp_cache_get($cache_key);
    
    if (false === $data) {
        $data = calculate_expensive_data();
        wp_cache_set($cache_key, $data, '', 3600);
    }
    
    return $data;
}
```

### Debugging Hooks

```php
// Use Actions/Filters extension

// Find where hook is called:
// 1. Look for action in list
// 2. Check what functions are attached
// 3. Verify priority order

// Debug hook conflicts:
// Two plugins hooking same priority might conflict
add_action('wp_head', 'plugin_a_function', 10);
add_action('wp_head', 'plugin_b_function', 10);
// Change priority to control order:
add_action('wp_head', 'plugin_b_function', 20);
```

### Debugging Rewrites

```php
// Use Rewrite Rules extension

// Debug 404 errors:
// 1. Visit the 404 page
// 2. Check which rules were tested
// 3. Find why no rule matched

// Debug custom rewrites:
add_action('init', function() {
    add_rewrite_rule(
        'api/([^/]+)/?$',
        'index.php?api_endpoint=$matches[1]',
        'top'
    );
});

// Flush and check in Debug Bar Rewrite Rules
flush_rewrite_rules();
```

## Creating Debug Bar Extensions

### Basic Extension Structure

```php
/**
 * Custom Debug Bar Panel
 */
class My_Debug_Bar_Panel extends Debug_Bar_Panel {
    
    public function init() {
        $this->title('My Panel');
    }
    
    public function prerender() {
        $this->set_visible(true);
    }
    
    public function render() {
        echo '<div id="debug-bar-my-panel">';
        echo '<h2>My Debug Information</h2>';
        
        // Add your debug output here
        echo '<p>Custom data: ' . esc_html(my_plugin_get_debug_data()) . '</p>';
        
        echo '</div>';
    }
}

// Register panel
add_filter('debug_bar_panels', function($panels) {
    $panels[] = new My_Debug_Bar_Panel();
    return $panels;
});
```

### Advanced Panel with Data Collection

```php
/**
 * Debug Bar panel with data collection
 */
class My_Plugin_Debug_Panel extends Debug_Bar_Panel {
    
    private $data = array();
    
    public function init() {
        $this->title('My Plugin');
        
        // Collect data during page load
        add_action('my_plugin_action', array($this, 'collect_data'));
    }
    
    public function collect_data($info) {
        $this->data[] = array(
            'time' => microtime(true),
            'info' => $info,
            'memory' => memory_get_usage(),
        );
    }
    
    public function prerender() {
        $this->set_visible(!empty($this->data));
    }
    
    public function render() {
        echo '<div id="debug-bar-my-plugin">';
        echo '<h2>My Plugin Events</h2>';
        
        if (empty($this->data)) {
            echo '<p>No events recorded.</p>';
        } else {
            echo '<table class="debug-bar-table">';
            echo '<thead><tr><th>Time</th><th>Info</th><th>Memory</th></tr></thead>';
            echo '<tbody>';
            
            foreach ($this->data as $event) {
                printf(
                    '<tr><td>%.4f</td><td>%s</td><td>%s</td></tr>',
                    $event['time'],
                    esc_html($event['info']),
                    size_format($event['memory'])
                );
            }
            
            echo '</tbody></table>';
        }
        
        echo '</div>';
    }
}
```

## Debug Bar vs Query Monitor

| Feature | Debug Bar | Query Monitor |
|---------|-----------|---------------|
| Interface | Simple | Comprehensive |
| Database queries | Basic | Detailed with EXPLAIN |
| Hooks | Via extension | Built-in |
| HTTP requests | Limited | Full details |
| REST API | Limited | Full support |
| Extensibility | Easy | More complex |
| Performance | Lighter | More overhead |

## Best Practices

1. **Use in development** - Don't leave active in production
2. **Install relevant extensions** - Cron, Transients, etc.
3. **Check queries first** - Most common issues
4. **Monitor memory** - Catch memory leaks early
5. **Compare before/after** - When optimizing

## Common Pitfalls

- Leaving Debug Bar active in production
- Not enabling SAVEQUERIES for query debugging
- Ignoring cache statistics
- Not checking for duplicate queries

## Exam Tips

- **Know what each panel displays**: Queries panel shows database queries. Cache panel shows object cache hits/misses. Hooks panel shows registered hooks. PHP panel shows errors and includes. Request panel shows request data. Environment panel shows server info. Understanding panels helps identify issues quickly. Debug Bar is simpler than Query Monitor but less comprehensive.

- **Understand when to use Debug Bar vs Query Monitor**: Debug Bar is lightweight, built into WordPress core (via plugin), good for basic debugging. Query Monitor is more comprehensive, better for performance analysis, shows more detail. Use Debug Bar for simple debugging, Query Monitor for deep analysis. Both can be used together. Understanding the difference helps choose appropriate tool.

- **Know how to debug queries and cache**: Enable `SAVEQUERIES` in `wp-config.php` to see queries in Debug Bar. Queries panel shows query, time, and call stack. Cache panel shows cache hits/misses and groups. Identify slow queries and cache inefficiencies. Understanding query and cache debugging helps optimize database and caching performance.

- **Understand how to create custom panels**: Use `debug_bar_panels` filter to add custom panels. Create panel class extending `Debug_Bar_Panel`. Render panel content in `render()` method. Add panels for custom debugging needs (API calls, custom data, etc.). Understanding custom panels enables extending Debug Bar for project-specific debugging needs.

- **Know required wp-config.php settings**: `SAVEQUERIES` must be true to see queries panel. `WP_DEBUG` should be true for error display. Other debug constants optional but recommended. Settings must be in `wp-config.php` before "That's all" comment. Understanding required settings ensures Debug Bar works correctly and shows expected information.
