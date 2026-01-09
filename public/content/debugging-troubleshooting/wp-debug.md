# WP_DEBUG and Debug Constants

## Overview

WordPress provides several debugging constants that control error reporting, logging, and script loading. Understanding and properly configuring these constants is essential for effective debugging.

## Core Debug Constants

### WP_DEBUG

```php
// wp-config.php

// Enable debug mode
define('WP_DEBUG', true);

// Disable debug mode (production)
define('WP_DEBUG', false);

// WP_DEBUG enables:
// - PHP error reporting (E_ALL)
// - WordPress deprecation notices
// - Additional debugging information
```

### WP_DEBUG_LOG

```php
// Log errors to file instead of displaying
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);

// Errors logged to: wp-content/debug.log

// Custom log location
define('WP_DEBUG_LOG', '/var/log/wordpress/debug.log');

// View log via terminal
// tail -f wp-content/debug.log
```

### WP_DEBUG_DISPLAY

```php
// Control error display
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);  // Don't show errors on screen

// For production debugging
// Log errors but don't display to users

// For development
define('WP_DEBUG_DISPLAY', true);  // Show errors immediately
```

### SCRIPT_DEBUG

```php
// Use unminified versions of core scripts
define('SCRIPT_DEBUG', true);

// Loads:
// - jquery.js instead of jquery.min.js
// - Full source files for debugging
// - Better error messages and stack traces

// Useful for:
// - Debugging JavaScript issues
// - Contributing to WordPress core
// - Understanding core functionality
```

### SAVEQUERIES

```php
// Save database queries for analysis
define('SAVEQUERIES', true);

// Access queries via:
global $wpdb;
print_r($wpdb->queries);

// Each query array contains:
// [0] => Query SQL
// [1] => Query time
// [2] => Call stack

// Warning: Performance overhead
// Don't enable in production
```

## Additional Debug Constants

### WP_DISABLE_FATAL_ERROR_HANDLER

```php
// Disable recovery mode (WP 5.2+)
define('WP_DISABLE_FATAL_ERROR_HANDLER', true);

// When enabled, fatal errors show detailed info
// instead of "recovery mode" screen

// Useful for debugging fatal errors in development
```

### WP_DEBUG_CORE

```php
// For debugging WordPress core itself
define('WP_DEBUG', true);
define('WP_DEBUG_CORE', true);

// Shows deprecated function usage in core
// Helpful when contributing to WordPress
```

### CONCATENATE_SCRIPTS

```php
// Control script concatenation in admin
define('CONCATENATE_SCRIPTS', false);

// Disables admin script concatenation
// Helpful for debugging admin JavaScript issues
```

### COMPRESS_SCRIPTS and COMPRESS_CSS

```php
// Disable script/CSS compression
define('COMPRESS_SCRIPTS', false);
define('COMPRESS_CSS', false);

// Useful when debugging minification issues
```

## Environment-Based Configuration

### Development Setup

```php
// wp-config.php for development

// Full debugging
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', true);
define('SCRIPT_DEBUG', true);
define('SAVEQUERIES', true);
define('WP_DISABLE_FATAL_ERROR_HANDLER', true);

// Increase limits for debugging
define('WP_MEMORY_LIMIT', '256M');
define('WP_MAX_MEMORY_LIMIT', '512M');
```

### Staging Setup

```php
// wp-config.php for staging

// Logging without display
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
define('SCRIPT_DEBUG', false);
define('SAVEQUERIES', false);
```

### Production Setup

```php
// wp-config.php for production

// Disable all debugging
define('WP_DEBUG', false);
define('WP_DEBUG_LOG', false);
define('WP_DEBUG_DISPLAY', false);
define('SCRIPT_DEBUG', false);
define('SAVEQUERIES', false);

// Or enable only logging (for troubleshooting)
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', '/var/log/wordpress/error.log');
define('WP_DEBUG_DISPLAY', false);
```

### Dynamic Configuration

```php
// wp-config.php with environment detection

$environment = getenv('WP_ENV') ?: 'production';

switch ($environment) {
    case 'development':
        define('WP_DEBUG', true);
        define('WP_DEBUG_LOG', true);
        define('WP_DEBUG_DISPLAY', true);
        define('SCRIPT_DEBUG', true);
        break;
        
    case 'staging':
        define('WP_DEBUG', true);
        define('WP_DEBUG_LOG', true);
        define('WP_DEBUG_DISPLAY', false);
        break;
        
    case 'production':
    default:
        define('WP_DEBUG', false);
        break;
}
```

## Using Debug Constants in Code

### Conditional Debug Code

```php
// Only run debug code when debugging is enabled
if (defined('WP_DEBUG') && WP_DEBUG) {
    error_log('Debug: Processing started');
    
    // Add debug hooks
    add_action('wp_footer', function() {
        global $wpdb;
        echo '<!-- Queries: ' . count($wpdb->queries) . ' -->';
    });
}
```

### Debug Helper Function

```php
/**
 * Debug logging helper
 */
function debug_log($message, $data = null) {
    if (!defined('WP_DEBUG') || !WP_DEBUG) {
        return;
    }
    
    $log_message = is_string($message) ? $message : print_r($message, true);
    
    if ($data !== null) {
        $log_message .= ' | Data: ' . print_r($data, true);
    }
    
    error_log('[DEBUG] ' . $log_message);
}

// Usage
debug_log('User logged in', array('user_id' => 123));
```

### Query Debugging

```php
/**
 * Debug database queries
 */
function debug_queries() {
    if (!defined('SAVEQUERIES') || !SAVEQUERIES) {
        return;
    }
    
    global $wpdb;
    
    $total_time = 0;
    $slow_queries = array();
    
    foreach ($wpdb->queries as $query) {
        $total_time += $query[1];
        
        if ($query[1] > 0.05) { // Queries over 50ms
            $slow_queries[] = $query;
        }
    }
    
    error_log(sprintf(
        'Total queries: %d, Total time: %.4fs, Slow queries: %d',
        count($wpdb->queries),
        $total_time,
        count($slow_queries)
    ));
    
    foreach ($slow_queries as $query) {
        error_log(sprintf(
            'Slow Query (%.4fs): %s',
            $query[1],
            $query[0]
        ));
    }
}

add_action('shutdown', 'debug_queries');
```

## PHP Error Reporting

### Understanding Error Levels

```php
// WP_DEBUG enables E_ALL
// This includes:

// E_ERROR - Fatal errors
// E_WARNING - Non-fatal warnings
// E_NOTICE - Notices (undefined variables, etc.)
// E_DEPRECATED - Deprecated function usage
// E_STRICT - Strict standards suggestions

// Customize error reporting
if (WP_DEBUG) {
    error_reporting(E_ALL & ~E_NOTICE); // All except notices
}
```

### Suppressing Specific Errors

```php
// Suppress errors for specific operations
$old_level = error_reporting(0);
$result = @potentially_erroring_function();
error_reporting($old_level);

// Or use try-catch for exceptions
try {
    $result = risky_operation();
} catch (Exception $e) {
    error_log('Error: ' . $e->getMessage());
}
```

## Troubleshooting with Debug Constants

### White Screen of Death

```php
// If you see a blank white screen:

// 1. Enable debug display temporarily
define('WP_DEBUG', true);
define('WP_DEBUG_DISPLAY', true);

// 2. Check debug.log if display doesn't work
// wp-content/debug.log

// 3. Check PHP error log
// /var/log/php/error.log or similar

// 4. Increase memory if needed
define('WP_MEMORY_LIMIT', '512M');
```

### Plugin/Theme Conflicts

```php
// Debug plugin conflicts
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);

// Look for errors like:
// Fatal error: Cannot redeclare function_name()
// Warning: call_user_func() expects parameter 1 to be valid callback
// Notice: Undefined variable

// Check which plugin/theme is causing the issue
// from the file path in the error
```

### JavaScript Debugging

```php
// Enable script debugging
define('SCRIPT_DEBUG', true);

// Also check browser console for:
// - JavaScript errors
// - Failed network requests
// - Console.log output

// Add debug output
if (defined('SCRIPT_DEBUG') && SCRIPT_DEBUG) {
    wp_localize_script('my-script', 'myDebug', array(
        'debug' => true,
        'ajaxurl' => admin_url('admin-ajax.php'),
    ));
}
```

## Security Considerations

```php
// Never expose debug info in production

// 1. Always check environment
if (wp_get_environment_type() !== 'production') {
    define('WP_DEBUG', true);
}

// 2. Log to secure location
define('WP_DEBUG_LOG', '/var/log/wordpress/debug.log');
// Ensure log file is not web-accessible

// 3. Never display errors in production
define('WP_DEBUG_DISPLAY', false);

// 4. Protect debug.log with .htaccess
// <Files debug.log>
//     Order allow,deny
//     Deny from all
// </Files>
```

## Best Practices

1. **Environment-specific config** - Different settings per environment
2. **Log, don't display** - In production, log only
3. **Secure log files** - Prevent web access
4. **Disable when not needed** - Overhead from debug constants
5. **Use helper functions** - Centralize debug logic

## Common Pitfalls

- Leaving WP_DEBUG_DISPLAY true in production
- Web-accessible debug.log files
- SAVEQUERIES in production (performance)
- Not checking debug.log regularly
- Ignoring deprecation notices

## Exam Tips

- **Know all debug constants and their effects**: `WP_DEBUG` (master switch, enables error reporting), `WP_DEBUG_LOG` (writes to debug.log), `WP_DEBUG_DISPLAY` (shows errors on screen), `SCRIPT_DEBUG` (unminified scripts), `SAVEQUERIES` (logs queries), `WP_DEBUG_DISPLAY` should be false in production. Understanding each constant enables proper debugging configuration.

- **Understand the relationship between constants**: `WP_DEBUG` must be true for `WP_DEBUG_LOG` and `WP_DEBUG_DISPLAY` to work. `WP_DEBUG_DISPLAY` overrides PHP's `display_errors` setting. `SCRIPT_DEBUG` is independent but often used together. Constants work together to provide comprehensive debugging. Understanding relationships helps configure debugging correctly.

- **Know appropriate settings for each environment**: Development: all debug constants enabled. Staging: `WP_DEBUG` and `WP_DEBUG_LOG` true, `WP_DEBUG_DISPLAY` false. Production: all debug constants false (or `WP_DEBUG_LOG` true with remote logging). Never enable `WP_DEBUG_DISPLAY` in production. Understanding environment-appropriate settings prevents security issues and performance problems.

- **Understand security implications**: `WP_DEBUG_DISPLAY` exposes errors, file paths, and code to users (security risk). `WP_DEBUG_LOG` may contain sensitive data in files. `SAVEQUERIES` exposes database structure. Debug constants can reveal system information to attackers. Always disable display in production, protect log files, remove debug code. Understanding security implications prevents information disclosure vulnerabilities.

- **Know how to debug common issues**: White screen: check `debug.log` for fatal errors. Plugin conflicts: disable plugins, enable one by one. Theme issues: switch to default theme. PHP errors: check error log, increase memory limit. Database errors: check `SAVEQUERIES`, verify database connection. Understanding common debugging approaches helps quickly identify and resolve issues.
