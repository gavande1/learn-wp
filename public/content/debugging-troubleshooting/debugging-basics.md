# Debugging Basics

## Overview

Effective debugging is essential for WordPress development. Knowing how to find and fix issues quickly saves time and prevents production problems.

## WordPress Debug Mode

### Enabling Debug Mode

```php
// In wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
define('SCRIPT_DEBUG', true);
define('SAVEQUERIES', true);
```

### Debug Constants Explained

| Constant | Purpose |
|----------|---------|
| `WP_DEBUG` | Enable debug mode |
| `WP_DEBUG_LOG` | Log errors to wp-content/debug.log |
| `WP_DEBUG_DISPLAY` | Show errors on screen |
| `SCRIPT_DEBUG` | Use unminified scripts |
| `SAVEQUERIES` | Store database queries |

## Error Logging

```php
// Log to debug.log
error_log('Debug message');
error_log(print_r($array, true));

// Custom logging function
function my_log($message) {
    if (WP_DEBUG === true) {
        if (is_array($message) || is_object($message)) {
            error_log(print_r($message, true));
        } else {
            error_log($message);
        }
    }
}
```

## Query Monitor Plugin

Essential debugging tool that shows:
- Database queries and timing
- PHP errors and warnings
- Hooks and actions
- HTTP requests
- Template loading

## Common Debugging Techniques

### Print Debugging

```php
// Quick debug output
echo '<pre>';
var_dump($variable);
echo '</pre>';
die();

// Better: Use error_log
error_log('Variable: ' . print_r($variable, true));
```

### Hook Debugging

```php
// Check what's hooked to an action
global $wp_filter;
print_r($wp_filter['init']);

// Debug current filter
add_filter('all', function($tag) {
    error_log('Running: ' . $tag);
});
```

### Database Query Debugging

```php
// View last query
global $wpdb;
echo $wpdb->last_query;
echo $wpdb->last_error;

// View all queries (SAVEQUERIES must be true)
echo '<pre>';
print_r($wpdb->queries);
echo '</pre>';
```

## Best Practices

1. **Never enable WP_DEBUG_DISPLAY in production**
2. **Check debug.log regularly** during development
3. **Use Query Monitor** for comprehensive debugging
4. **Remove debug code** before committing
5. **Use proper logging** instead of echo/print_r

## Exam Tips

- **Know all WP_DEBUG constants**: `WP_DEBUG` enables error display and logging. `WP_DEBUG_LOG` writes errors to `debug.log`. `WP_DEBUG_DISPLAY` shows errors on screen (disable in production). `SCRIPT_DEBUG` loads unminified scripts. `SAVEQUERIES` saves all database queries. Understanding constants enables proper debugging setup for development vs production environments.

- **Understand debug.log location and usage**: `debug.log` is in `WP_CONTENT_DIR` (usually `wp-content/debug.log`). Created automatically when `WP_DEBUG_LOG` is true. Contains PHP errors, warnings, notices, and custom log entries. Check regularly during development. Rotate or delete periodically to prevent large files. Never expose `debug.log` publicly - contains sensitive information. Understanding location and usage helps effective debugging.

- **Know how to debug queries**: Enable `SAVEQUERIES` to log all queries. Use Query Monitor plugin for comprehensive query analysis. Check for N+1 queries (queries in loops). Identify slow queries with execution time. Use `EXPLAIN` to analyze query plans. Look for missing indexes or inefficient queries. Understanding query debugging helps optimize database performance and identify bottlenecks.

- **Understand hook debugging**: Use Query Monitor's Hooks panel to see all registered hooks and callbacks. Use `did_action()` to check if action fired. Inspect `$wp_filter` global to see hook callbacks. Use `add_action()` with logging to trace execution. Understanding hook debugging helps troubleshoot issues where code doesn't execute or runs at wrong time.

- **Know production debugging safety**: Never enable `WP_DEBUG_DISPLAY` in production (exposes errors to users). Use `WP_DEBUG_LOG` carefully (can expose sensitive data). Never commit `debug.log` to version control. Use remote logging services for production. Remove or disable debug code before deployment. Understanding production safety prevents exposing sensitive information or breaking user experience.
