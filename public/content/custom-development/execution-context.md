# Running Code in the Correct Context

## Overview

WordPress code can run in multiple contexts: frontend, admin, AJAX, REST API, WP-CLI, and cron. Understanding these contexts and executing code appropriately is essential for performance and correctness.

## Detecting Context

### Built-in Functions

```php
// Admin context (includes AJAX)
is_admin()

// AJAX request
wp_doing_ajax()

// Cron request
wp_doing_cron()

// REST API request
defined('REST_REQUEST') && REST_REQUEST

// WP-CLI context
defined('WP_CLI') && WP_CLI

// Frontend (not admin, not cron, not CLI)
!is_admin() && !wp_doing_cron()

// Customizer preview
is_customize_preview()

// XML-RPC request
defined('XMLRPC_REQUEST') && XMLRPC_REQUEST
```

### Context Helper Class

```php
class My_Plugin_Context {
    public static function is_admin_request() {
        return is_admin() && !self::is_ajax_request();
    }
    
    public static function is_frontend_request() {
        return !is_admin() && !self::is_cron_request() && !self::is_cli_request();
    }
    
    public static function is_ajax_request() {
        return wp_doing_ajax();
    }
    
    public static function is_rest_request() {
        if (defined('REST_REQUEST') && REST_REQUEST) {
            return true;
        }
        
        // Check for REST URL pattern
        if (isset($_SERVER['REQUEST_URI'])) {
            $rest_prefix = rest_get_url_prefix();
            return strpos($_SERVER['REQUEST_URI'], $rest_prefix) !== false;
        }
        
        return false;
    }
    
    public static function is_cron_request() {
        return wp_doing_cron();
    }
    
    public static function is_cli_request() {
        return defined('WP_CLI') && WP_CLI;
    }
    
    public static function is_login_page() {
        return in_array(
            $GLOBALS['pagenow'],
            array('wp-login.php', 'wp-register.php'),
            true
        );
    }
}
```

## Context-Specific Code Loading

### Admin-Only Features

```php
class My_Plugin {
    public function __construct() {
        // Admin-only code
        if (is_admin()) {
            // Don't load on AJAX
            if (!wp_doing_ajax()) {
                $this->load_admin();
            }
        }
    }
    
    private function load_admin() {
        require_once MY_PLUGIN_PATH . 'admin/class-settings.php';
        require_once MY_PLUGIN_PATH . 'admin/class-metaboxes.php';
        
        add_action('admin_menu', array($this, 'add_menu'));
        add_action('admin_enqueue_scripts', array($this, 'admin_assets'));
    }
}
```

### Frontend-Only Features

```php
// Only on frontend
if (!is_admin()) {
    add_action('wp_enqueue_scripts', 'my_plugin_frontend_assets');
    add_filter('the_content', 'my_plugin_filter_content');
    add_action('wp_footer', 'my_plugin_footer_code');
}

// More specific - after query is set
add_action('wp', 'my_plugin_frontend_init');

function my_plugin_frontend_init() {
    // Main query is available now
    if (is_singular('product')) {
        add_filter('the_content', 'my_plugin_product_content');
    }
}
```

### WP-CLI Commands

```php
// Only load CLI code in CLI context
if (defined('WP_CLI') && WP_CLI) {
    require_once MY_PLUGIN_PATH . 'includes/class-cli.php';
    
    /**
     * My Plugin CLI commands.
     */
    class My_Plugin_CLI {
        /**
         * Sync data from external source.
         *
         * ## OPTIONS
         *
         * [--force]
         * : Force sync even if recently synced.
         *
         * ## EXAMPLES
         *
         *     wp my-plugin sync --force
         */
        public function sync($args, $assoc_args) {
            $force = isset($assoc_args['force']);
            
            WP_CLI::log('Starting sync...');
            
            $result = $this->do_sync($force);
            
            if ($result) {
                WP_CLI::success('Sync completed!');
            } else {
                WP_CLI::error('Sync failed.');
            }
        }
    }
    
    WP_CLI::add_command('my-plugin', 'My_Plugin_CLI');
}
```

### REST API Endpoints

```php
add_action('rest_api_init', 'my_plugin_rest_routes');

function my_plugin_rest_routes() {
    // Only registered during REST requests
    register_rest_route('my-plugin/v1', '/items', array(
        'methods' => WP_REST_Server::READABLE,
        'callback' => 'my_plugin_get_items',
        'permission_callback' => function() {
            return current_user_can('read');
        },
    ));
}
```

### Cron Jobs

```php
// Register the hook
add_action('my_plugin_daily_task', 'my_plugin_run_daily_task');

function my_plugin_run_daily_task() {
    // Only runs during cron
    if (!wp_doing_cron()) {
        return;
    }
    
    // Increase time limit for long operations
    set_time_limit(300);
    
    // Disable output buffering
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // Run the task
    my_plugin_process_queue();
}
```

## Preventing Unintended Execution

### Block on AJAX

```php
// Don't redirect on AJAX
add_action('template_redirect', function() {
    if (wp_doing_ajax()) {
        return; // Don't redirect during AJAX
    }
    
    if (some_condition()) {
        wp_redirect(home_url('/other-page/'));
        exit;
    }
});
```

### Block on REST API

```php
// Don't run on REST API requests
add_action('init', function() {
    if (defined('REST_REQUEST') && REST_REQUEST) {
        return; // Skip during REST requests
    }
    
    // Frontend/admin only code
    my_plugin_session_start();
});
```

### Block During Cron

```php
// Don't send emails during cron (batch them)
add_action('save_post', function($post_id) {
    if (wp_doing_cron()) {
        // Queue email instead of sending
        my_plugin_queue_notification($post_id);
        return;
    }
    
    my_plugin_send_notification($post_id);
});
```

## AJAX Handling

```php
// Admin AJAX (logged-in users)
add_action('wp_ajax_my_plugin_action', 'my_plugin_ajax_handler');

// Public AJAX (non-logged-in users)
add_action('wp_ajax_nopriv_my_plugin_action', 'my_plugin_ajax_handler');

function my_plugin_ajax_handler() {
    // Verify nonce
    check_ajax_referer('my_plugin_nonce', 'nonce');
    
    // Check capabilities
    if (!current_user_can('edit_posts')) {
        wp_send_json_error('Unauthorized', 403);
    }
    
    // Process request
    $data = isset($_POST['data']) ? sanitize_text_field($_POST['data']) : '';
    
    $result = my_plugin_process($data);
    
    if ($result) {
        wp_send_json_success($result);
    } else {
        wp_send_json_error('Processing failed');
    }
}
```

## Best Practices

1. **Check context early** - Before loading code
2. **Use appropriate hooks** - For each context
3. **Don't assume context** - Always verify
4. **Separate concerns** - Admin, frontend, API code
5. **Test in all contexts** - Verify expected behavior

## Common Pitfalls

- Running frontend code in admin
- Running admin code during AJAX
- Not handling REST API context
- CLI commands running on web requests
- Cron jobs triggering email floods

## Exam Tips

- **Know all context detection methods**: Use `is_admin()` for admin area, `!is_admin()` for frontend. Use `wp_doing_ajax()` for AJAX requests. Use `wp_doing_cron()` for cron jobs. Use `defined('WP_CLI') && WP_CLI` for WP-CLI. Use `rest_is_rest_request()` for REST API. Use `is_user_logged_in()` for logged-in users. Use conditional tags like `is_single()`, `is_page()` for specific pages. Understanding these helps you run code only in the right context.

- **Understand when each context applies**: Admin context: `is_admin()` is true in admin area (but also during AJAX from admin). Frontend: `!is_admin()` and not AJAX/cron. AJAX: `wp_doing_ajax()` is true for both admin-ajax.php and REST API in some cases. Cron: `wp_doing_cron()` during scheduled tasks. WP-CLI: Only when running CLI commands. REST API: `rest_is_rest_request()` for API endpoints. Each context has specific use cases and limitations.

- **Know how to properly handle AJAX**: Use `wp_ajax_{action}` for logged-in users, `wp_ajax_nopriv_{action}` for non-logged-in. Always verify nonces with `check_ajax_referer()`. Use `wp_send_json_success()` and `wp_send_json_error()` for responses. Don't assume admin context - AJAX can come from frontend. Use `wp_doing_ajax()` to detect, but remember it's true for both admin and frontend AJAX. Always sanitize and validate input.

- **Understand WP-CLI command structure**: Commands are registered with `WP_CLI::add_command($name, $callable)`. Commands can be functions or class methods. Use `WP_CLI::error()`, `WP_CLI::success()`, `WP_CLI::line()` for output. Commands run in a minimal WordPress context - some hooks may not fire. Always check `defined('WP_CLI') && WP_CLI` before running CLI-specific code. Commands should be efficient and avoid unnecessary WordPress loading.

- **Know how to prevent unintended execution**: Always check context before running code: `if (!is_admin()) return;` for admin-only code. Use early returns in hooks. Check capabilities: `if (!current_user_can('manage_options')) return;`. Verify nonces for form submissions. Use `wp_doing_ajax()` checks to prevent AJAX code running on page loads. Use `wp_doing_cron()` checks to prevent cron code running on user requests. Context checks prevent security issues and performance problems.
