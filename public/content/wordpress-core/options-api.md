# Options API

## Overview

The Options API provides a simple way to store and retrieve site-wide settings in the `wp_options` database table. It's the foundation for WordPress settings and configuration.

## Key Concepts

### What Are Options?

Options are key-value pairs stored in the database. They're ideal for:
- Plugin/theme settings
- Site configuration
- Non-user-specific data

## Basic Functions

### Getting Options

```php
// Get a single option
$value = get_option('blogname');

// Get with default fallback
$value = get_option('my_custom_option', 'default_value');

// Get site option (multisite-aware)
$value = get_site_option('site_wide_setting');
```

### Setting Options

```php
// Add a new option
add_option('my_option', 'my_value');

// Add with autoload disabled
add_option('large_data_option', $large_data, '', 'no');

// Update an option (creates if doesn't exist)
update_option('my_option', 'new_value');

// Update with autoload control
update_option('my_option', 'new_value', false);
```

### Deleting Options

```php
// Delete an option
delete_option('my_option');

// Delete site option (multisite)
delete_site_option('site_wide_setting');
```

## Autoloading

Options can be **autoloaded** (loaded on every page) or **not autoloaded**.

```php
// Autoloaded option (default) - loaded into memory on every request
add_option('frequently_used', 'value', '', 'yes');

// Not autoloaded - only loaded when specifically requested
add_option('rarely_used', 'large_data', '', 'no');
```

### When to Disable Autoload

- Large data (serialized arrays, JSON)
- Rarely accessed options
- Options only needed in admin
- Transient-like data

## Storing Complex Data

```php
// Store an array (automatically serialized)
$settings = array(
    'color' => 'blue',
    'size' => 'large',
    'features' => array('feature1', 'feature2')
);
update_option('my_plugin_settings', $settings);

// Retrieve the array (automatically unserialized)
$settings = get_option('my_plugin_settings', array());
echo $settings['color']; // 'blue'
```

## Best Practices

### 1. Use Prefixes

```php
// Bad - might conflict with other plugins
update_option('settings', $value);

// Good - prefixed with plugin name
update_option('myplugin_settings', $value);
```

### 2. Group Related Settings

```php
// Instead of multiple options
update_option('myplugin_color', 'blue');
update_option('myplugin_size', 'large');

// Use a single option with an array
update_option('myplugin_settings', array(
    'color' => 'blue',
    'size' => 'large'
));
```

### 3. Handle Missing Options

```php
// Always provide defaults
$settings = get_option('myplugin_settings', array(
    'color' => 'red',
    'size' => 'medium'
));

// Or use wp_parse_args
$defaults = array('color' => 'red', 'size' => 'medium');
$settings = wp_parse_args(get_option('myplugin_settings'), $defaults);
```

## Performance Considerations

```php
// Check autoloaded options size
global $wpdb;
$autoload_size = $wpdb->get_var(
    "SELECT SUM(LENGTH(option_value)) 
     FROM {$wpdb->options} 
     WHERE autoload = 'yes'"
);
echo 'Autoloaded options size: ' . size_format($autoload_size);
```

### Optimizing Large Option Sets

```php
// For large, infrequently accessed data
// Store in a custom table or use transients instead

// Or disable autoload for existing options
global $wpdb;
$wpdb->update(
    $wpdb->options,
    array('autoload' => 'no'),
    array('option_name' => 'large_option_name')
);
```

## Common Pitfalls

1. **Autoloading large data** - Slows down every page load
2. **Not using defaults** - Can cause errors with missing keys
3. **Race conditions** - Multiple updates can overwrite data
4. **Storing user-specific data** - Use user meta instead
5. **Not cleaning up on uninstall** - Leave orphaned options

## Cleanup on Uninstall

```php
// In uninstall.php
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

// Delete all plugin options
delete_option('myplugin_settings');
delete_option('myplugin_version');

// Or delete by prefix
global $wpdb;
$wpdb->query(
    "DELETE FROM {$wpdb->options} 
     WHERE option_name LIKE 'myplugin_%'"
);
```

## Exam Tips

- **Know the difference between `add_option()` and `update_option()`**: `add_option()` only adds an option if it doesn't already exist and will fail if the option exists, while `update_option()` will create the option if it doesn't exist or update it if it does. Use `add_option()` for initial setup and `update_option()` for subsequent changes.

- **Understand autoloading and when to disable it**: Autoloaded options are loaded into memory on every page request, which is great for frequently accessed data but terrible for large or rarely used options. Disable autoload (set to 'no') for large data, admin-only options, or transient-like data to improve performance.

- **Know how to store and retrieve arrays**: WordPress automatically serializes arrays when storing and unserializes when retrieving. Always provide default values (empty arrays) when retrieving to avoid errors if the option doesn't exist. Use `wp_parse_args()` to merge defaults with retrieved values.

- **Understand performance implications of large autoloaded options**: Large autoloaded options slow down every page load because they're loaded into memory on every request. Monitor autoloaded option sizes and move large or infrequently accessed data to non-autoloaded options, transients, or custom tables.

- **Know the difference between `get_option()` and `get_site_option()`**: `get_option()` is site-specific in multisite installations, while `get_site_option()` retrieves network-wide options that are shared across all sites. Use site options for network-level settings and regular options for site-specific configuration.
