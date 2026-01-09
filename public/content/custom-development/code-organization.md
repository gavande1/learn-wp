# Code Organization

## Overview

Proper code organization makes WordPress plugins and themes maintainable, testable, and scalable. Following WordPress conventions while applying modern software principles leads to better code.

## Plugin File Structure

### Basic Structure

```
my-plugin/
├── my-plugin.php              # Main plugin file
├── uninstall.php              # Cleanup on uninstall
├── readme.txt                 # WordPress.org readme
├── includes/
│   ├── class-my-plugin.php    # Main plugin class
│   ├── class-admin.php        # Admin functionality
│   ├── class-frontend.php     # Frontend functionality
│   └── functions.php          # Helper functions
├── admin/
│   ├── css/
│   ├── js/
│   └── views/
├── public/
│   ├── css/
│   ├── js/
│   └── views/
├── templates/
├── languages/
├── assets/
└── tests/
```

### Advanced Structure

```
my-plugin/
├── my-plugin.php
├── composer.json
├── package.json
├── phpcs.xml
├── src/
│   ├── Plugin.php
│   ├── Admin/
│   │   ├── Settings.php
│   │   └── MetaBoxes.php
│   ├── Frontend/
│   │   ├── Shortcodes.php
│   │   └── Templates.php
│   ├── Core/
│   │   ├── PostTypes.php
│   │   ├── Taxonomies.php
│   │   └── Assets.php
│   ├── REST/
│   │   └── Controller.php
│   └── Integrations/
│       └── WooCommerce.php
├── assets/
│   ├── src/
│   │   ├── js/
│   │   └── scss/
│   └── build/
├── templates/
├── languages/
└── tests/
```

## Main Plugin File

```php
<?php
/**
 * Plugin Name: My Plugin
 * Plugin URI: https://example.com/my-plugin
 * Description: A well-organized WordPress plugin.
 * Version: 1.0.0
 * Author: Developer Name
 * Author URI: https://example.com
 * License: GPL-2.0+
 * Text Domain: my-plugin
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('MY_PLUGIN_VERSION', '1.0.0');
define('MY_PLUGIN_FILE', __FILE__);
define('MY_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('MY_PLUGIN_URL', plugin_dir_url(__FILE__));
define('MY_PLUGIN_BASENAME', plugin_basename(__FILE__));

// Autoloader
require_once MY_PLUGIN_PATH . 'includes/autoloader.php';

// Initialize plugin
function my_plugin_init() {
    return My_Plugin\Plugin::instance();
}

// Start the plugin
add_action('plugins_loaded', 'my_plugin_init');

// Activation/Deactivation
register_activation_hook(__FILE__, array('My_Plugin\Activator', 'activate'));
register_deactivation_hook(__FILE__, array('My_Plugin\Deactivator', 'deactivate'));
```

## Autoloading

### PSR-4 with Composer

```json
{
    "name": "developer/my-plugin",
    "autoload": {
        "psr-4": {
            "My_Plugin\\": "src/"
        }
    }
}
```

### Custom Autoloader

```php
<?php
// includes/autoloader.php

spl_autoload_register(function ($class) {
    $prefix = 'My_Plugin\\';
    $base_dir = MY_PLUGIN_PATH . 'src/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});
```

## Main Plugin Class (Singleton)

```php
<?php
namespace My_Plugin;

class Plugin {
    private static $instance = null;
    private $admin;
    private $frontend;

    public static function instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->load_dependencies();
        $this->set_locale();
        $this->define_admin_hooks();
        $this->define_public_hooks();
    }

    private function load_dependencies() {
        $this->admin = new Admin\Settings();
        $this->frontend = new Frontend\Shortcodes();
    }

    private function set_locale() {
        add_action('init', function() {
            load_plugin_textdomain(
                'my-plugin',
                false,
                dirname(MY_PLUGIN_BASENAME) . '/languages'
            );
        });
    }

    private function define_admin_hooks() {
        if (is_admin()) {
            add_action('admin_menu', array($this->admin, 'add_menu'));
            add_action('admin_enqueue_scripts', array($this->admin, 'enqueue_assets'));
        }
    }

    private function define_public_hooks() {
        add_action('wp_enqueue_scripts', array($this->frontend, 'enqueue_assets'));
        add_shortcode('my_shortcode', array($this->frontend, 'render_shortcode'));
    }

    // Prevent cloning
    private function __clone() {}

    // Prevent unserialization
    public function __wakeup() {
        throw new \Exception('Cannot unserialize singleton');
    }
}
```

## Separation of Concerns

### Admin Class

```php
<?php
namespace My_Plugin\Admin;

class Settings {
    public function add_menu() {
        add_options_page(
            __('My Plugin Settings', 'my-plugin'),
            __('My Plugin', 'my-plugin'),
            'manage_options',
            'my-plugin-settings',
            array($this, 'render_page')
        );
    }

    public function render_page() {
        // Include template
        include MY_PLUGIN_PATH . 'admin/views/settings-page.php';
    }

    public function enqueue_assets($hook) {
        if ('settings_page_my-plugin-settings' !== $hook) {
            return;
        }

        wp_enqueue_style(
            'my-plugin-admin',
            MY_PLUGIN_URL . 'admin/css/admin.css',
            array(),
            MY_PLUGIN_VERSION
        );
    }
}
```

### Frontend Class

```php
<?php
namespace My_Plugin\Frontend;

class Shortcodes {
    public function enqueue_assets() {
        wp_enqueue_style(
            'my-plugin-frontend',
            MY_PLUGIN_URL . 'public/css/frontend.css',
            array(),
            MY_PLUGIN_VERSION
        );
    }

    public function render_shortcode($atts) {
        $atts = shortcode_atts(array(
            'id' => 0,
            'title' => '',
        ), $atts, 'my_shortcode');

        ob_start();
        include MY_PLUGIN_PATH . 'templates/shortcode.php';
        return ob_get_clean();
    }
}
```

## Template Organization

### Using Template Loader

```php
<?php
namespace My_Plugin\Core;

class Template_Loader {
    public function get_template($template_name, $args = array()) {
        // Look in theme first
        $template = locate_template(array(
            'my-plugin/' . $template_name,
        ));

        // Fall back to plugin templates
        if (!$template) {
            $template = MY_PLUGIN_PATH . 'templates/' . $template_name;
        }

        if (file_exists($template)) {
            extract($args);
            include $template;
        }
    }

    public function get_template_html($template_name, $args = array()) {
        ob_start();
        $this->get_template($template_name, $args);
        return ob_get_clean();
    }
}
```

## Service Container Pattern

```php
<?php
namespace My_Plugin;

class Container {
    private $services = array();
    private $instances = array();

    public function register($name, callable $resolver) {
        $this->services[$name] = $resolver;
    }

    public function get($name) {
        if (!isset($this->instances[$name])) {
            if (!isset($this->services[$name])) {
                throw new \Exception("Service {$name} not found");
            }
            $this->instances[$name] = $this->services[$name]($this);
        }
        return $this->instances[$name];
    }
}

// Usage
$container = new Container();

$container->register('settings', function($c) {
    return new Admin\Settings();
});

$container->register('api', function($c) {
    return new REST\Controller($c->get('settings'));
});
```

## Naming Conventions

### Files

```
class-{class-name}.php        # Class files
interface-{interface-name}.php # Interface files
trait-{trait-name}.php        # Trait files
functions-{purpose}.php       # Function files
template-{name}.php           # Template files
```

### Classes

```php
// Main class
class My_Plugin {}

// Namespaced classes
namespace My_Plugin\Admin;
class Settings {}

// WordPress style
class My_Plugin_Admin_Settings {}
```

## Best Practices

1. **Single Responsibility** - One class, one purpose
2. **Use namespaces** - Avoid conflicts
3. **Separate concerns** - Admin/Frontend/Core
4. **Template overriding** - Allow theme customization
5. **Consistent naming** - Follow WordPress conventions

## Common Pitfalls

- God classes that do everything
- No separation between admin and frontend
- Hard-coded templates (no overriding)
- Inconsistent file naming
- No autoloading

## Exam Tips

- **Know standard plugin file structure**: Standard structure: main plugin file (with headers), `/includes/` for PHP classes, `/admin/` for admin code, `/public/` for frontend code, `/assets/` for CSS/JS/images, `/languages/` for translations, `/vendor/` for third-party libraries, `uninstall.php` for cleanup. Use consistent structure across projects. Separate admin and frontend code. Keep main plugin file minimal, just bootstrapping. Understanding structure improves maintainability and makes code easier to navigate.

- **Understand separation of concerns**: Separate data access (models), business logic (services), presentation (views/templates), and initialization (main file). Don't mix database queries with HTML output. Don't put business logic in templates. Use classes for related functionality. Keep functions focused on single responsibilities. This makes code testable, maintainable, and easier to debug. WordPress doesn't enforce this, but it's a best practice for quality code.

- **Know how to implement autoloading**: Use PSR-4 autoloading with Composer for modern approach. Or implement custom autoloader using `spl_autoload_register()`. Map class names to file paths (e.g., `My_Plugin_Admin` → `includes/class-admin.php`). Autoloading eliminates need for many `require_once` statements. Use namespaces to avoid class name conflicts. Autoloading is essential for large plugins with many classes. WordPress core doesn't use autoloading, but it's standard in modern PHP development.

- **Understand the singleton pattern in WordPress context**: Singleton ensures only one instance of a class exists. Use `get_instance()` static method. Store instance in static property. Prevent direct instantiation with private constructor. Useful for main plugin class, database connections, or shared resources. However, avoid overusing - not everything needs to be singleton. In WordPress, often used for main plugin class to ensure single initialization. Can make testing harder, so use judiciously.

- **Know naming conventions for files and classes**: Files: lowercase with hyphens (`my-plugin.php`, `class-admin.php`). Classes: PascalCase with underscores (`My_Plugin`, `My_Plugin_Admin`). Functions: lowercase with underscores, prefixed (`my_plugin_function()`). Constants: UPPERCASE with underscores, prefixed (`MY_PLUGIN_VERSION`). Hooks: lowercase with underscores (`my_plugin_action_name`). Follow WordPress coding standards. Consistent naming makes code self-documenting and easier to understand.
