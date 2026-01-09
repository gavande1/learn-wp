# Settings API

## Overview

The WordPress Settings API provides a standardized way to create admin settings pages with automatic saving, validation, and security. It integrates with the Options API for data storage.

## Key Concepts

### Components

1. **Settings Page** - The admin page itself
2. **Settings Sections** - Groups of related fields
3. **Settings Fields** - Individual form inputs
4. **Settings Registration** - Connects fields to options

## Basic Implementation

### Step 1: Add Menu Page

```php
add_action('admin_menu', 'my_plugin_menu');

function my_plugin_menu() {
    add_options_page(
        'My Plugin Settings',     // Page title
        'My Plugin',              // Menu title
        'manage_options',         // Capability
        'my-plugin-settings',     // Menu slug
        'my_plugin_settings_page' // Callback function
    );
}
```

### Step 2: Register Settings

```php
add_action('admin_init', 'my_plugin_settings_init');

function my_plugin_settings_init() {
    // Register the setting
    register_setting(
        'my_plugin_options',      // Option group
        'my_plugin_settings',     // Option name
        array(
            'type' => 'array',
            'sanitize_callback' => 'my_plugin_sanitize_settings',
            'default' => array(
                'api_key' => '',
                'enable_feature' => false,
                'items_per_page' => 10
            )
        )
    );

    // Add settings section
    add_settings_section(
        'my_plugin_general_section',
        'General Settings',
        'my_plugin_section_callback',
        'my-plugin-settings'
    );

    // Add settings fields
    add_settings_field(
        'api_key',
        'API Key',
        'my_plugin_api_key_callback',
        'my-plugin-settings',
        'my_plugin_general_section'
    );

    add_settings_field(
        'enable_feature',
        'Enable Feature',
        'my_plugin_checkbox_callback',
        'my-plugin-settings',
        'my_plugin_general_section'
    );
}
```

### Step 3: Callback Functions

```php
// Section description callback
function my_plugin_section_callback() {
    echo '<p>Configure the general settings for the plugin.</p>';
}

// Text field callback
function my_plugin_api_key_callback() {
    $options = get_option('my_plugin_settings');
    ?>
    <input type="text" 
           name="my_plugin_settings[api_key]" 
           value="<?php echo esc_attr($options['api_key'] ?? ''); ?>"
           class="regular-text">
    <p class="description">Enter your API key here.</p>
    <?php
}

// Checkbox callback
function my_plugin_checkbox_callback() {
    $options = get_option('my_plugin_settings');
    ?>
    <label>
        <input type="checkbox" 
               name="my_plugin_settings[enable_feature]" 
               value="1"
               <?php checked(1, $options['enable_feature'] ?? 0); ?>>
        Enable this feature
    </label>
    <?php
}
```

### Step 4: Settings Page Output

```php
function my_plugin_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }
    ?>
    <div class="wrap">
        <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
        <form action="options.php" method="post">
            <?php
            settings_fields('my_plugin_options');
            do_settings_sections('my-plugin-settings');
            submit_button('Save Settings');
            ?>
        </form>
    </div>
    <?php
}
```

## Validation and Sanitization

```php
function my_plugin_sanitize_settings($input) {
    $sanitized = array();
    
    // Sanitize API key
    if (isset($input['api_key'])) {
        $sanitized['api_key'] = sanitize_text_field($input['api_key']);
    }
    
    // Sanitize checkbox (convert to boolean)
    $sanitized['enable_feature'] = !empty($input['enable_feature']);
    
    // Sanitize number with range validation
    if (isset($input['items_per_page'])) {
        $sanitized['items_per_page'] = absint($input['items_per_page']);
        $sanitized['items_per_page'] = max(1, min(100, $sanitized['items_per_page']));
    }
    
    // Add error for invalid API key format
    if (!empty($sanitized['api_key']) && strlen($sanitized['api_key']) < 10) {
        add_settings_error(
            'my_plugin_settings',
            'invalid_api_key',
            'API key must be at least 10 characters',
            'error'
        );
    }
    
    return $sanitized;
}
```

## Common Field Types

### Select Dropdown

```php
function my_plugin_select_callback() {
    $options = get_option('my_plugin_settings');
    $current = $options['display_mode'] ?? 'grid';
    ?>
    <select name="my_plugin_settings[display_mode]">
        <option value="grid" <?php selected($current, 'grid'); ?>>Grid</option>
        <option value="list" <?php selected($current, 'list'); ?>>List</option>
        <option value="table" <?php selected($current, 'table'); ?>>Table</option>
    </select>
    <?php
}
```

### Textarea

```php
function my_plugin_textarea_callback() {
    $options = get_option('my_plugin_settings');
    ?>
    <textarea name="my_plugin_settings[custom_css]" 
              rows="5" 
              cols="50"
              class="large-text code"><?php 
        echo esc_textarea($options['custom_css'] ?? ''); 
    ?></textarea>
    <?php
}
```

### Radio Buttons

```php
function my_plugin_radio_callback() {
    $options = get_option('my_plugin_settings');
    $current = $options['position'] ?? 'left';
    ?>
    <fieldset>
        <label>
            <input type="radio" 
                   name="my_plugin_settings[position]" 
                   value="left" 
                   <?php checked($current, 'left'); ?>>
            Left
        </label><br>
        <label>
            <input type="radio" 
                   name="my_plugin_settings[position]" 
                   value="right" 
                   <?php checked($current, 'right'); ?>>
            Right
        </label>
    </fieldset>
    <?php
}
```

## Tabbed Settings Pages

```php
function my_plugin_settings_page() {
    $active_tab = isset($_GET['tab']) ? $_GET['tab'] : 'general';
    ?>
    <div class="wrap">
        <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
        
        <h2 class="nav-tab-wrapper">
            <a href="?page=my-plugin-settings&tab=general" 
               class="nav-tab <?php echo $active_tab === 'general' ? 'nav-tab-active' : ''; ?>">
                General
            </a>
            <a href="?page=my-plugin-settings&tab=advanced" 
               class="nav-tab <?php echo $active_tab === 'advanced' ? 'nav-tab-active' : ''; ?>">
                Advanced
            </a>
        </h2>
        
        <form action="options.php" method="post">
            <?php
            if ($active_tab === 'general') {
                settings_fields('my_plugin_general');
                do_settings_sections('my-plugin-general');
            } else {
                settings_fields('my_plugin_advanced');
                do_settings_sections('my-plugin-advanced');
            }
            submit_button();
            ?>
        </form>
    </div>
    <?php
}
```

## Best Practices

1. **Group related settings** - Use sections logically
2. **Provide defaults** - Never assume options exist
3. **Validate on save** - Use `sanitize_callback`
4. **Escape on output** - Always escape user input
5. **Use capabilities** - Check permissions appropriately
6. **Add contextual help** - Use `add_help_tab()`

## Common Pitfalls

- Missing `settings_fields()` call (breaks saving)
- Not sanitizing input properly
- Forgetting capability checks
- Not escaping output values
- Options not saving (wrong option group)

## Exam Tips

- **Know the complete flow: register_setting → sections → fields**: The Settings API requires a specific order: first register the setting with `register_setting()`, then add sections with `add_settings_section()`, then add fields with `add_settings_field()`. The option group in `register_setting()` must match the first parameter in `settings_fields()` in your form.

- **Understand the relationship between option groups and options**: The option group (first parameter of `register_setting()`) is used for security nonces and must match what's passed to `settings_fields()`. The option name (second parameter) is the actual key stored in the database. Multiple settings can share an option group but have different option names.

- **Be able to implement validation and sanitization**: Always use the `sanitize_callback` parameter in `register_setting()` to sanitize input. Use `add_settings_error()` to show validation errors. Sanitize on input (when saving), escape on output (when displaying). Never trust user input.

- **Know the different field types and their callbacks**: Each field type (text, textarea, select, checkbox, radio) requires a callback function that outputs the HTML. Use appropriate WordPress functions like `checked()`, `selected()`, `esc_attr()`, and `esc_textarea()` to properly output field values and attributes.

- **Understand how tabbed interfaces work**: Tabbed settings pages use URL parameters (`?tab=general`) to determine the active tab. Each tab should have its own option group and call `settings_fields()` with the matching group. The form action is still `options.php` but different sections are shown based on the active tab.
