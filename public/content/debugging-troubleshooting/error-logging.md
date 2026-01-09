# Error Logging

## Overview

Effective error logging is essential for debugging WordPress issues, especially in production environments where you can't display errors on screen. Proper logging helps identify issues, track patterns, and maintain audit trails.

## WordPress Debug Logging

### Enabling Debug Log

```php
// wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);        // Log to wp-content/debug.log
define('WP_DEBUG_DISPLAY', false);   // Don't show errors on screen
define('SCRIPT_DEBUG', true);        // Use unminified scripts
```

### Custom Log Location

```php
// Log to custom location
define('WP_DEBUG_LOG', '/var/log/wordpress/debug.log');

// Or use ini_set
ini_set('error_log', '/var/log/wordpress/error.log');
```

## PHP Error Logging

### error_log() Function

```php
// Basic logging
error_log('Something happened');

// Log variables
$data = array('user' => 'john', 'action' => 'login');
error_log(print_r($data, true));

// Log with context
error_log(sprintf(
    '[%s] User %d performed action: %s',
    current_time('mysql'),
    get_current_user_id(),
    'update_settings'
));
```

### Custom Logging Function

```php
/**
 * Custom logging with levels and context
 */
function my_plugin_log($message, $level = 'info', $context = array()) {
    if (!defined('WP_DEBUG') || !WP_DEBUG) {
        return;
    }
    
    $levels = array('debug', 'info', 'warning', 'error', 'critical');
    if (!in_array($level, $levels)) {
        $level = 'info';
    }
    
    // Format message
    $log_entry = sprintf(
        '[%s] [%s] %s',
        current_time('Y-m-d H:i:s'),
        strtoupper($level),
        $message
    );
    
    // Add context
    if (!empty($context)) {
        $log_entry .= ' | Context: ' . json_encode($context);
    }
    
    // Add backtrace for errors
    if (in_array($level, array('error', 'critical'))) {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 3);
        $caller = isset($trace[1]) ? $trace[1] : array();
        $log_entry .= sprintf(
            ' | Called from %s:%d',
            $caller['file'] ?? 'unknown',
            $caller['line'] ?? 0
        );
    }
    
    error_log($log_entry);
}

// Usage
my_plugin_log('User logged in', 'info', array('user_id' => 123));
my_plugin_log('Database connection failed', 'error', array('host' => 'localhost'));
```

## Structured Logging

### JSON Logging

```php
/**
 * Structured JSON logging
 */
class Plugin_Logger {
    
    private $log_file;
    
    public function __construct($log_file = null) {
        $this->log_file = $log_file ?: WP_CONTENT_DIR . '/my-plugin.log';
    }
    
    public function log($level, $message, $context = array()) {
        $entry = array(
            'timestamp' => current_time('c'),
            'level' => $level,
            'message' => $message,
            'context' => $context,
            'request' => array(
                'url' => $_SERVER['REQUEST_URI'] ?? '',
                'method' => $_SERVER['REQUEST_METHOD'] ?? '',
                'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
            ),
            'user_id' => get_current_user_id(),
            'memory' => memory_get_usage(true),
        );
        
        file_put_contents(
            $this->log_file,
            json_encode($entry) . "\n",
            FILE_APPEND | LOCK_EX
        );
    }
    
    public function debug($message, $context = array()) {
        $this->log('debug', $message, $context);
    }
    
    public function info($message, $context = array()) {
        $this->log('info', $message, $context);
    }
    
    public function warning($message, $context = array()) {
        $this->log('warning', $message, $context);
    }
    
    public function error($message, $context = array()) {
        $this->log('error', $message, $context);
    }
}

// Usage
$logger = new Plugin_Logger();
$logger->info('Plugin activated', array('version' => '1.0.0'));
$logger->error('API request failed', array('endpoint' => '/api/v1/users', 'code' => 500));
```

## Database Logging

### Custom Log Table

```php
/**
 * Database logger for persistent logs
 */
class DB_Logger {
    
    private $table_name;
    
    public function __construct() {
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'plugin_logs';
    }
    
    public static function create_table() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'plugin_logs';
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            level varchar(20) NOT NULL,
            message text NOT NULL,
            context longtext,
            user_id bigint(20) unsigned DEFAULT 0,
            ip_address varchar(45),
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY level (level),
            KEY user_id (user_id),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    public function log($level, $message, $context = array()) {
        global $wpdb;
        
        $wpdb->insert(
            $this->table_name,
            array(
                'level' => $level,
                'message' => $message,
                'context' => json_encode($context),
                'user_id' => get_current_user_id(),
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '',
            ),
            array('%s', '%s', '%s', '%d', '%s')
        );
    }
    
    public function get_logs($args = array()) {
        global $wpdb;
        
        $defaults = array(
            'level' => '',
            'user_id' => 0,
            'limit' => 100,
            'offset' => 0,
            'order' => 'DESC',
        );
        
        $args = wp_parse_args($args, $defaults);
        
        $where = array('1=1');
        $prepare = array();
        
        if ($args['level']) {
            $where[] = 'level = %s';
            $prepare[] = $args['level'];
        }
        
        if ($args['user_id']) {
            $where[] = 'user_id = %d';
            $prepare[] = $args['user_id'];
        }
        
        $sql = sprintf(
            "SELECT * FROM %s WHERE %s ORDER BY created_at %s LIMIT %d OFFSET %d",
            $this->table_name,
            implode(' AND ', $where),
            $args['order'],
            $args['limit'],
            $args['offset']
        );
        
        if (!empty($prepare)) {
            $sql = $wpdb->prepare($sql, $prepare);
        }
        
        return $wpdb->get_results($sql);
    }
    
    public function cleanup($days = 30) {
        global $wpdb;
        
        $wpdb->query($wpdb->prepare(
            "DELETE FROM {$this->table_name} WHERE created_at < DATE_SUB(NOW(), INTERVAL %d DAY)",
            $days
        ));
    }
}
```

## Exception Logging

```php
/**
 * Global exception handler
 */
set_exception_handler(function($exception) {
    error_log(sprintf(
        'Uncaught Exception: %s in %s:%d\nStack trace:\n%s',
        $exception->getMessage(),
        $exception->getFile(),
        $exception->getLine(),
        $exception->getTraceAsString()
    ));
    
    // Optionally send to external service
    if (defined('ERROR_REPORTING_ENDPOINT')) {
        wp_remote_post(ERROR_REPORTING_ENDPOINT, array(
            'body' => array(
                'message' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => $exception->getTraceAsString(),
            ),
        ));
    }
});

/**
 * Global error handler
 */
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    $error_types = array(
        E_ERROR => 'Error',
        E_WARNING => 'Warning',
        E_NOTICE => 'Notice',
        E_DEPRECATED => 'Deprecated',
    );
    
    $type = $error_types[$errno] ?? 'Unknown';
    
    error_log(sprintf(
        'PHP %s: %s in %s on line %d',
        $type,
        $errstr,
        $errfile,
        $errline
    ));
    
    return false; // Let PHP handle it too
});
```

## Log Rotation

```php
/**
 * Rotate log files to prevent them from growing too large
 */
function rotate_log_file($log_file, $max_size = 5242880, $max_files = 5) {
    if (!file_exists($log_file) || filesize($log_file) < $max_size) {
        return;
    }
    
    // Rotate existing files
    for ($i = $max_files - 1; $i >= 1; $i--) {
        $old_file = $log_file . '.' . $i;
        $new_file = $log_file . '.' . ($i + 1);
        
        if (file_exists($old_file)) {
            if ($i + 1 >= $max_files) {
                unlink($old_file);
            } else {
                rename($old_file, $new_file);
            }
        }
    }
    
    // Rename current log
    rename($log_file, $log_file . '.1');
    
    // Create new empty log
    touch($log_file);
}

// Schedule rotation
add_action('my_plugin_log_rotation', function() {
    rotate_log_file(WP_CONTENT_DIR . '/debug.log');
    rotate_log_file(WP_CONTENT_DIR . '/my-plugin.log');
});

if (!wp_next_scheduled('my_plugin_log_rotation')) {
    wp_schedule_event(time(), 'daily', 'my_plugin_log_rotation');
}
```

## Admin Log Viewer

```php
/**
 * Admin page to view logs
 */
add_action('admin_menu', function() {
    add_management_page(
        'Debug Logs',
        'Debug Logs',
        'manage_options',
        'debug-logs',
        'render_debug_logs_page'
    );
});

function render_debug_logs_page() {
    if (!current_user_can('manage_options')) {
        wp_die('Unauthorized');
    }
    
    $log_file = WP_CONTENT_DIR . '/debug.log';
    $lines = isset($_GET['lines']) ? absint($_GET['lines']) : 100;
    
    echo '<div class="wrap">';
    echo '<h1>Debug Logs</h1>';
    
    if (file_exists($log_file)) {
        // Read last N lines
        $content = file_get_contents($log_file);
        $log_lines = explode("\n", $content);
        $log_lines = array_slice($log_lines, -$lines);
        
        echo '<pre style="background: #1e1e1e; color: #d4d4d4; padding: 20px; overflow-x: auto; max-height: 600px;">';
        foreach ($log_lines as $line) {
            // Color-code by level
            if (strpos($line, 'ERROR') !== false || strpos($line, 'Fatal') !== false) {
                echo '<span style="color: #f44336;">' . esc_html($line) . '</span>' . "\n";
            } elseif (strpos($line, 'WARNING') !== false || strpos($line, 'Warning') !== false) {
                echo '<span style="color: #ff9800;">' . esc_html($line) . '</span>' . "\n";
            } elseif (strpos($line, 'Notice') !== false || strpos($line, 'Deprecated') !== false) {
                echo '<span style="color: #2196f3;">' . esc_html($line) . '</span>' . "\n";
            } else {
                echo esc_html($line) . "\n";
            }
        }
        echo '</pre>';
        
        echo '<p>';
        echo '<a href="' . esc_url(add_query_arg('lines', 500)) . '" class="button">Show 500 lines</a> ';
        echo '<a href="' . esc_url(add_query_arg('action', 'clear')) . '" class="button" onclick="return confirm(\'Clear log file?\')">Clear Log</a>';
        echo '</p>';
    } else {
        echo '<p>No log file found.</p>';
    }
    
    echo '</div>';
}
```

## External Logging Services

```php
/**
 * Send logs to external service (e.g., Sentry, Loggly)
 */
function send_to_logging_service($level, $message, $context = array()) {
    $endpoint = defined('LOGGING_ENDPOINT') ? LOGGING_ENDPOINT : '';
    $api_key = defined('LOGGING_API_KEY') ? LOGGING_API_KEY : '';
    
    if (!$endpoint || !$api_key) {
        return;
    }
    
    wp_remote_post($endpoint, array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $api_key,
            'Content-Type' => 'application/json',
        ),
        'body' => json_encode(array(
            'level' => $level,
            'message' => $message,
            'context' => $context,
            'timestamp' => current_time('c'),
            'environment' => wp_get_environment_type(),
            'site_url' => home_url(),
        )),
        'blocking' => false, // Don't wait for response
    ));
}
```

## Best Practices

1. **Never log sensitive data** - Passwords, API keys, personal info
2. **Use appropriate log levels** - Debug, info, warning, error
3. **Include context** - User ID, request URL, relevant variables
4. **Rotate logs** - Prevent disk space issues
5. **Disable in production** - Or use reduced logging
6. **Centralize logs** - Use external services for production

## Common Pitfalls

- Logging sensitive information
- Not rotating log files
- Leaving debug logging on in production
- Logging too much (performance impact)
- Not including enough context

## Exam Tips

- **Know WP_DEBUG constants and their effects**: `WP_DEBUG` enables error reporting. `WP_DEBUG_LOG` writes to `debug.log`. `WP_DEBUG_DISPLAY` shows errors on screen. `SCRIPT_DEBUG` loads unminified assets. `SAVEQUERIES` logs database queries. Each constant has specific purpose and security implications. Understanding constants enables proper logging configuration for each environment.

- **Understand error_log() usage**: `error_log($message, $type, $destination)` writes to PHP error log. Use for custom logging beyond WordPress errors. Can log to file, syslog, or email. Use appropriate log levels (info, warning, error). Include context (function name, line number, variables). Understanding `error_log()` enables custom logging for debugging and monitoring.

- **Know how to create custom loggers**: Create logger class that wraps `error_log()` or uses external service. Add log levels (debug, info, warning, error). Include timestamps, context, stack traces. Use filters to allow customization. Consider performance (don't log excessively). Understanding custom loggers enables structured, maintainable logging beyond basic error logging.

- **Understand log rotation**: Log files grow indefinitely without rotation. Use system tools (logrotate) or custom scripts to rotate logs. Archive old logs, compress, delete after retention period. Prevents disk space issues and improves performance. WordPress doesn't rotate `debug.log` automatically. Understanding rotation prevents log files from consuming disk space and slowing down sites.

- **Know security considerations for logging**: Logs may contain sensitive data (passwords, user info, API keys). Never expose logs publicly (web-accessible). Use proper file permissions (not world-readable). Consider what you log - avoid logging sensitive information. Use remote logging services for production. Understanding security prevents exposing sensitive data through logs.
