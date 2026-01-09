# Correct Hook Use for Loading Plugin Code

## Overview

Loading plugin code at the right time using appropriate hooks ensures optimal performance, prevents conflicts, and avoids errors from running code before WordPress is ready.

## Key Concepts

### WordPress Load Order

```
1. WordPress core loads
2. Must-use plugins load (mu-plugins)
3. Network-activated plugins load (multisite)
4. Regular plugins load
5. Themes load
6. init hook fires
7. widgets_init, after_setup_theme, etc.
8. wp_loaded hook fires
9. Template loads
10. wp hook fires (main query done)
```

### Common Hooks for Plugin Loading

| Hook | When to Use |
|------|-------------|
| `plugins_loaded` | After all plugins load, before init |
| `init` | Most registrations (CPTs, taxonomies) |
| `admin_init` | Admin-only setup |
| `wp_loaded` | After WordPress fully loads |
| `wp` | After main query runs |

## Loading Plugin Code

### Main Plugin Class

```php
// Wait for plugins_loaded before initializing
add_action('plugins_loaded', 'my_plugin_init');

function my_plugin_init() {
    // Safe to use other plugin functions now
    if (class_exists('WooCommerce')) {
        new My_Plugin_WooCommerce_Integration();
    }
    
    // Initialize main plugin class
    return My_Plugin::instance();
}
```

### Registering Post Types and Taxonomies

```php
// Use init hook for registrations
add_action('init', 'my_plugin_register_post_types');

function my_plugin_register_post_types() {
    register_post_type('book', array(
        'public' => true,
        'label' => 'Books',
        'show_in_rest' => true,
    ));
    
    register_taxonomy('genre', 'book', array(
        'public' => true,
        'hierarchical' => true,
    ));
}
```

### Admin-Only Code

```php
// Only load admin code when in admin
add_action('admin_init', 'my_plugin_admin_init');

function my_plugin_admin_init() {
    // Register settings
    register_setting('my_plugin_options', 'my_plugin_settings');
    
    // This code only runs in admin
}

// Or check is_admin before loading files
if (is_admin()) {
    require_once MY_PLUGIN_PATH . 'admin/class-admin.php';
}
```

### Frontend-Only Code

```php
// Load frontend code only on frontend
add_action('template_redirect', 'my_plugin_frontend_init');

function my_plugin_frontend_init() {
    // This runs only on frontend, after main query
    if (is_singular('book')) {
        add_filter('the_content', 'my_plugin_add_book_details');
    }
}
```

## Avoiding Heavy Operations

### Don't Run on Every Request

```php
// BAD - Runs on every request
add_action('init', function() {
    $response = wp_remote_get('https://api.example.com/data');
    // API call on every page load!
});

// GOOD - Only when needed
add_action('init', function() {
    if (is_admin() && current_user_can('manage_options')) {
        // Only in admin for admins
        if (get_transient('my_plugin_api_data') === false) {
            $response = wp_remote_get('https://api.example.com/data');
            set_transient('my_plugin_api_data', $response, HOUR_IN_SECONDS);
        }
    }
});
```

### Defer Heavy Operations

```php
// BAD - License check on every request
add_action('init', function() {
    my_plugin_verify_license(); // Slow!
});

// GOOD - Check periodically
add_action('init', function() {
    $last_check = get_transient('my_plugin_license_check');
    
    if (false === $last_check) {
        // Schedule background check
        wp_schedule_single_event(time(), 'my_plugin_check_license');
        set_transient('my_plugin_license_check', time(), DAY_IN_SECONDS);
    }
});
```

## Context-Specific Loading

### REST API Context

```php
add_action('rest_api_init', 'my_plugin_rest_init');

function my_plugin_rest_init() {
    // Only runs during REST API requests
    register_rest_route('my-plugin/v1', '/items', array(
        'methods' => 'GET',
        'callback' => 'my_plugin_get_items',
        'permission_callback' => '__return_true',
    ));
}
```

### WP-CLI Context

```php
// Check for WP-CLI before loading CLI commands
if (defined('WP_CLI') && WP_CLI) {
    require_once MY_PLUGIN_PATH . 'includes/class-cli-commands.php';
    WP_CLI::add_command('my-plugin', 'My_Plugin_CLI_Commands');
}
```

### AJAX Context

```php
// Register AJAX handlers early
add_action('wp_ajax_my_plugin_action', 'my_plugin_ajax_handler');
add_action('wp_ajax_nopriv_my_plugin_action', 'my_plugin_ajax_handler');

function my_plugin_ajax_handler() {
    check_ajax_referer('my_plugin_nonce', 'nonce');
    
    // Handle AJAX request
    wp_send_json_success(array('message' => 'Success'));
}
```

### Cron Context

```php
// Only load cron handlers when needed
add_action('my_plugin_cron_event', 'my_plugin_cron_handler');

function my_plugin_cron_handler() {
    // This only runs during cron
    // Don't load this code unnecessarily
}
```

## Conditional Loading Pattern

```php
class My_Plugin {
    public function __construct() {
        // Always needed
        add_action('init', array($this, 'register_post_types'));
        
        // Context-specific
        if ($this->is_request('admin')) {
            add_action('admin_init', array($this, 'admin_init'));
        }
        
        if ($this->is_request('frontend')) {
            add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        }
        
        if ($this->is_request('ajax')) {
            add_action('wp_ajax_my_action', array($this, 'handle_ajax'));
        }
        
        if ($this->is_request('cron')) {
            add_action('my_cron_event', array($this, 'handle_cron'));
        }
    }
    
    private function is_request($type) {
        switch ($type) {
            case 'admin':
                return is_admin() && !wp_doing_ajax();
            case 'frontend':
                return !is_admin() && !wp_doing_cron();
            case 'ajax':
                return wp_doing_ajax();
            case 'cron':
                return wp_doing_cron();
            case 'rest':
                return defined('REST_REQUEST') && REST_REQUEST;
            default:
                return false;
        }
    }
}
```

## Hook Priority

```php
// Control execution order with priority
add_action('init', 'run_early', 5);    // Runs first
add_action('init', 'run_normal', 10);  // Default priority
add_action('init', 'run_late', 99);    // Runs last

// Useful for dependencies
add_action('init', function() {
    // Ensure WooCommerce has registered its post types
    if (post_type_exists('product')) {
        // Safe to interact with products
    }
}, 20);  // After WooCommerce (priority 5)
```

## Best Practices

1. **Use appropriate hooks** - Match hook to purpose
2. **Load conditionally** - Only when needed
3. **Defer heavy operations** - Don't block page loads
4. **Check context** - Admin, frontend, CLI, etc.
5. **Use proper priorities** - Respect dependencies

## Common Pitfalls

- Loading everything on every request
- Running API calls on init
- Not checking context before loading
- Using wrong hooks for registrations
- Ignoring hook priorities

## Exam Tips

- **Know the WordPress load order**: WordPress loads in this order: constants and early files, plugins (alphabetically), theme setup, `init` hook, `wp_loaded`, then template loading. Understanding load order helps you choose the right hook. Early hooks (`plugins_loaded`, `init`) are for registrations. Later hooks (`wp`, `template_redirect`) are for conditional logic. Load order affects when your code can access WordPress functions and data.

- **Understand which hooks to use for what**: Use `plugins_loaded` for early plugin initialization. Use `init` for registering post types, taxonomies, and most registrations. Use `wp_enqueue_scripts` for frontend assets, `admin_enqueue_scripts` for admin assets. Use `wp` or `template_redirect` for conditional frontend logic. Use `admin_init` for admin-only setup. Use `after_setup_theme` in themes for theme setup. Choosing the right hook ensures your code runs at the correct time with access to needed functionality.

- **Know how to check request context**: Use `is_admin()` to check admin area. Use `wp_doing_ajax()` for AJAX requests. Use `wp_doing_cron()` for cron jobs. Use `is_user_logged_in()` for authentication status. Use conditional tags (`is_single()`, `is_page()`, etc.) for page types. Use `get_current_screen()` in admin to check specific admin pages. Context checks prevent code from running in wrong situations, improving performance and preventing errors.

- **Understand hook priorities**: Hook priority (third parameter) determines execution order - lower numbers run earlier, higher numbers run later. Default priority is 10. Use priorities to control when your code runs relative to other code. For example, use priority 5 to run before default (10), or 99 to run after most code. Understanding priorities helps you ensure your code runs at the right time, especially when dealing with filters that modify data.

- **Know how to defer heavy operations**: Use `wp_schedule_single_event()` for one-time deferred tasks. Use transients to cache expensive operations. Use `shutdown` hook for non-critical operations that can run after page output. Use AJAX for user-triggered heavy operations. Use background processing for long-running tasks. Deferring heavy operations improves page load times and user experience. Never run expensive operations on every page load if they can be deferred or cached.
