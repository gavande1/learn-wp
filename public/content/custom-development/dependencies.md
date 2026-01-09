# Dependencies in WordPress Code

## Overview

Managing dependencies in WordPress involves properly loading scripts, styles, and handling plugin/library dependencies to ensure correct load order and avoid conflicts.

## Key Concepts

### Types of Dependencies

1. **Script Dependencies** - JavaScript files that must load first
2. **Style Dependencies** - CSS files with precedence
3. **Plugin Dependencies** - Other plugins your code requires
4. **PHP Dependencies** - Libraries and classes

## Enqueueing Scripts

### Basic Script Enqueue

```php
add_action('wp_enqueue_scripts', 'my_enqueue_scripts');

function my_enqueue_scripts() {
    wp_enqueue_script(
        'my-script',                              // Handle
        plugins_url('js/script.js', __FILE__),   // URL
        array('jquery', 'wp-api-fetch'),         // Dependencies
        '1.0.0',                                  // Version
        true                                      // In footer
    );
}
```

### Script with Arguments

```php
wp_enqueue_script(
    'my-script',
    plugins_url('js/script.js', __FILE__),
    array('jquery'),
    '1.0.0',
    array(
        'in_footer' => true,
        'strategy' => 'defer',  // 'defer' or 'async'
    )
);
```

### Passing Data to Scripts

```php
wp_enqueue_script('my-script', ...);

wp_localize_script('my-script', 'myScriptData', array(
    'ajaxUrl' => admin_url('admin-ajax.php'),
    'nonce' => wp_create_nonce('my_nonce'),
    'strings' => array(
        'loading' => __('Loading...', 'my-plugin'),
        'error' => __('An error occurred', 'my-plugin'),
    ),
));

// Or use wp_add_inline_script
wp_add_inline_script(
    'my-script',
    'const MY_CONFIG = ' . wp_json_encode(array(
        'apiUrl' => rest_url('my-plugin/v1/'),
        'nonce' => wp_create_nonce('wp_rest'),
    )),
    'before'
);
```

## Enqueueing Styles

### Basic Style Enqueue

```php
add_action('wp_enqueue_scripts', 'my_enqueue_styles');

function my_enqueue_styles() {
    wp_enqueue_style(
        'my-styles',
        plugins_url('css/styles.css', __FILE__),
        array('dashicons'),  // Dependencies
        '1.0.0',
        'all'               // Media
    );
}
```

### Conditional Loading

```php
function my_enqueue_conditional_assets() {
    // Only on specific page
    if (is_page('contact')) {
        wp_enqueue_script('contact-form-script', ...);
    }
    
    // Only on single posts
    if (is_single()) {
        wp_enqueue_style('single-post-styles', ...);
    }
    
    // Only when shortcode is present
    global $post;
    if (has_shortcode($post->post_content, 'my_shortcode')) {
        wp_enqueue_script('shortcode-script', ...);
    }
}
add_action('wp_enqueue_scripts', 'my_enqueue_conditional_assets');
```

## Admin Scripts and Styles

```php
// Admin assets
add_action('admin_enqueue_scripts', 'my_admin_assets');

function my_admin_assets($hook) {
    // Only on specific admin page
    if ($hook !== 'settings_page_my-plugin') {
        return;
    }
    
    wp_enqueue_style('my-admin-styles', ...);
    wp_enqueue_script('my-admin-script', ...);
}

// Block editor assets
add_action('enqueue_block_editor_assets', 'my_block_editor_assets');

function my_block_editor_assets() {
    wp_enqueue_script(
        'my-blocks',
        plugins_url('build/index.js', __FILE__),
        array('wp-blocks', 'wp-element', 'wp-editor', 'wp-components'),
        filemtime(plugin_dir_path(__FILE__) . 'build/index.js')
    );
}
```

## WordPress Core Script Handles

### Common Dependencies

```php
// jQuery and jQuery UI
'jquery', 'jquery-ui-core', 'jquery-ui-dialog', 'jquery-ui-tabs'

// WordPress Scripts
'wp-api', 'wp-api-fetch', 'wp-data', 'wp-element'

// Block Editor
'wp-blocks', 'wp-editor', 'wp-block-editor', 'wp-components'

// React (bundled with WordPress)
'react', 'react-dom'

// Utilities
'underscore', 'backbone', 'wp-util'
```

## Registering vs Enqueueing

```php
// Register (make available for use as dependency)
wp_register_script('my-library', plugins_url('js/lib.js', __FILE__), array(), '1.0.0');
wp_register_style('my-base-styles', plugins_url('css/base.css', __FILE__), array(), '1.0.0');

// Enqueue (actually load)
wp_enqueue_script('my-script', plugins_url('js/script.js', __FILE__), array('my-library'), '1.0.0');
wp_enqueue_style('my-styles', plugins_url('css/styles.css', __FILE__), array('my-base-styles'), '1.0.0');

// Later, enqueue registered script
wp_enqueue_script('my-library');
```

## Deregistering and Dequeuing

```php
add_action('wp_enqueue_scripts', 'modify_scripts', 100);

function modify_scripts() {
    // Remove a script
    wp_dequeue_script('jquery-migrate');
    wp_deregister_script('jquery-migrate');
    
    // Replace a script
    wp_deregister_script('jquery');
    wp_register_script(
        'jquery',
        'https://cdn.example.com/jquery.min.js',
        array(),
        '3.6.0'
    );
}
```

## Plugin Dependencies

### Check for Required Plugins

```php
// Check if WooCommerce is active
if (!class_exists('WooCommerce')) {
    add_action('admin_notices', function() {
        ?>
        <div class="notice notice-error">
            <p><?php _e('My Plugin requires WooCommerce to be installed and active.', 'my-plugin'); ?></p>
        </div>
        <?php
    });
    return;
}

// Check for plugin function
if (!function_exists('acf_add_options_page')) {
    // ACF not available
}
```

### Using Plugin Headers

```php
/**
 * Plugin Name: My Plugin
 * Requires Plugins: woocommerce, advanced-custom-fields
 */
```

### Dependency Injection Pattern

```php
class My_Plugin {
    private $dependencies_met = true;
    
    public function __construct() {
        $this->check_dependencies();
        
        if ($this->dependencies_met) {
            $this->init();
        }
    }
    
    private function check_dependencies() {
        // Check PHP version
        if (version_compare(PHP_VERSION, '7.4', '<')) {
            $this->add_admin_notice('PHP 7.4+ required');
            $this->dependencies_met = false;
        }
        
        // Check WordPress version
        if (version_compare(get_bloginfo('version'), '6.0', '<')) {
            $this->add_admin_notice('WordPress 6.0+ required');
            $this->dependencies_met = false;
        }
        
        // Check for required plugin
        if (!class_exists('WooCommerce')) {
            $this->add_admin_notice('WooCommerce required');
            $this->dependencies_met = false;
        }
    }
}
```

## Versioning Strategies

```php
// Use filemtime for development (cache busting)
wp_enqueue_style(
    'my-styles',
    plugins_url('css/styles.css', __FILE__),
    array(),
    filemtime(plugin_dir_path(__FILE__) . 'css/styles.css')
);

// Use constant version for production
define('MY_PLUGIN_VERSION', '1.2.3');

wp_enqueue_script(
    'my-script',
    plugins_url('js/script.js', __FILE__),
    array(),
    MY_PLUGIN_VERSION
);
```

## Module Scripts (ES Modules)

```php
// Register as module
wp_register_script_module(
    '@my-plugin/module',
    plugins_url('js/module.js', __FILE__),
    array('@wordpress/interactivity'),
    '1.0.0'
);

// Enqueue module
wp_enqueue_script_module('@my-plugin/module');
```

## Best Practices

1. **Use hooks properly** - `wp_enqueue_scripts` for frontend, `admin_enqueue_scripts` for admin
2. **Load conditionally** - Don't load everywhere if not needed
3. **Use dependencies array** - Let WordPress handle load order
4. **Version your assets** - For cache busting
5. **Check before deregistering** - Other plugins may depend on it

## Common Pitfalls

- Loading scripts globally when only needed on specific pages
- Not specifying dependencies (race conditions)
- Deregistering core scripts without consideration
- Loading scripts in header when footer works
- Not using proper hooks

## Exam Tips

- **Know the difference between register and enqueue**: `wp_register_script/style()` makes the asset available but doesn't load it - use when the asset might be used as a dependency or conditionally loaded later. `wp_enqueue_script/style()` actually loads the asset on the page. You can register once and enqueue multiple times or conditionally. Register is for making assets available, enqueue is for loading them. Always register before enqueue if you might use it as a dependency.

- **Understand dependency arrays and load order**: Dependencies ensure scripts/styles load in correct order. WordPress automatically loads dependencies before the asset. Array order doesn't matter - WordPress resolves the dependency tree. Dependencies can be other registered scripts or WordPress core handles (like `jquery`, `wp-api-fetch`). Circular dependencies cause issues. Always specify dependencies to prevent race conditions and ensure code works correctly.

- **Know the correct hooks for different contexts**: Use `wp_enqueue_scripts` for frontend scripts and styles. Use `admin_enqueue_scripts` for admin area assets (check `$hook` parameter for specific pages). Use `enqueue_block_editor_assets` for block editor assets. Use `login_enqueue_scripts` for login page. Use `wp_enqueue_scripts` with `is_admin()` check is wrong - use the appropriate hook. Using wrong hooks means assets load at wrong time or not at all.

- **Understand how to check for plugin dependencies**: Check if class exists: `class_exists('WooCommerce')`. Check if function exists: `function_exists('acf_add_options_page')`. Check if constant is defined. Use `is_plugin_active()` (requires admin files). Check plugin headers with `get_plugin_data()`. Show admin notices if dependencies missing. Use `Requires Plugins` header in plugin file. Always check dependencies before using plugin functions to prevent fatal errors.

- **Know how to pass data to JavaScript safely**: Use `wp_localize_script()` to pass data (creates a global JavaScript object). Use `wp_add_inline_script()` for inline JavaScript. Always use `wp_json_encode()` for encoding data (handles special characters, prevents XSS). Never output PHP variables directly in JavaScript. Escape strings properly. Use nonces for security-sensitive data. Passing data safely prevents XSS attacks and ensures special characters are handled correctly.
