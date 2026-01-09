# Data Validation

## Overview

Data validation ensures input meets specific criteria before processing. Unlike sanitization (which cleans data), validation accepts or rejects data based on rules.

## Key Concepts

### Validation Strategy

1. **Whitelist validation** - Only accept known good values
2. **Type validation** - Verify data type matches expected
3. **Range validation** - Check values are within bounds
4. **Format validation** - Verify pattern/structure

## WordPress Validation Functions

### Type Checking

```php
// Check if numeric
if (is_numeric($_POST['quantity'])) {
    $quantity = intval($_POST['quantity']);
}

// Check if array
if (is_array($_POST['items'])) {
    // Process array
}

// Check if string
if (is_string($_POST['name'])) {
    // Process string
}

// Check if valid email
if (is_email($_POST['email'])) {
    $email = sanitize_email($_POST['email']);
}
```

### URL Validation

```php
// Validate URL format
function my_validate_url($url) {
    // Check URL format
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        return false;
    }
    
    // Check scheme
    $parsed = wp_parse_url($url);
    if (!in_array($parsed['scheme'], array('http', 'https'), true)) {
        return false;
    }
    
    return true;
}

// WordPress function
if (wp_http_validate_url($url)) {
    // URL is valid for remote requests
}
```

### Nonce Validation

```php
// Verify nonce
if (!wp_verify_nonce($_POST['_nonce'], 'my_action')) {
    wp_die('Security check failed');
}

// Check AJAX referer
check_ajax_referer('my_ajax_action', 'nonce');

// Check admin referer
check_admin_referer('my_admin_action');
```

### Capability Validation

```php
// Check user capability
if (!current_user_can('edit_posts')) {
    wp_die('Unauthorized');
}

// Check specific post capability
if (!current_user_can('edit_post', $post_id)) {
    wp_die('Unauthorized');
}
```

## Custom Validation

### Basic Validation Pattern

```php
function validate_registration_data($data) {
    $errors = new WP_Error();
    
    // Required field
    if (empty($data['username'])) {
        $errors->add('username_empty', 'Username is required');
    }
    
    // Length validation
    if (strlen($data['username']) < 3) {
        $errors->add('username_short', 'Username must be at least 3 characters');
    }
    
    // Email validation
    if (!is_email($data['email'])) {
        $errors->add('invalid_email', 'Please enter a valid email');
    }
    
    // Password strength
    if (strlen($data['password']) < 8) {
        $errors->add('weak_password', 'Password must be at least 8 characters');
    }
    
    // Return errors or true
    return $errors->has_errors() ? $errors : true;
}
```

### Whitelist Validation

```php
// Validate against whitelist
function validate_status($status) {
    $allowed = array('draft', 'pending', 'publish', 'private');
    
    if (!in_array($status, $allowed, true)) {
        return new WP_Error('invalid_status', 'Invalid status value');
    }
    
    return true;
}

// Validate with strict type checking
function validate_setting($key, $value) {
    $schema = array(
        'posts_per_page' => array('type' => 'int', 'min' => 1, 'max' => 100),
        'enable_feature' => array('type' => 'bool'),
        'color' => array('type' => 'hex'),
    );
    
    if (!isset($schema[$key])) {
        return new WP_Error('unknown_key', 'Unknown setting key');
    }
    
    $rules = $schema[$key];
    
    switch ($rules['type']) {
        case 'int':
            if (!is_numeric($value)) {
                return new WP_Error('invalid_type', 'Must be a number');
            }
            $int_value = intval($value);
            if (isset($rules['min']) && $int_value < $rules['min']) {
                return new WP_Error('too_small', 'Value is too small');
            }
            if (isset($rules['max']) && $int_value > $rules['max']) {
                return new WP_Error('too_large', 'Value is too large');
            }
            break;
            
        case 'bool':
            if (!is_bool($value) && !in_array($value, array(0, 1, '0', '1', true, false), true)) {
                return new WP_Error('invalid_type', 'Must be boolean');
            }
            break;
            
        case 'hex':
            if (!preg_match('/^#([a-fA-F0-9]{3}){1,2}$/', $value)) {
                return new WP_Error('invalid_format', 'Invalid hex color');
            }
            break;
    }
    
    return true;
}
```

## REST API Validation

```php
register_rest_route('my-plugin/v1', '/item', array(
    'methods' => 'POST',
    'callback' => 'create_item',
    'permission_callback' => function() {
        return current_user_can('edit_posts');
    },
    'args' => array(
        'title' => array(
            'required' => true,
            'validate_callback' => function($value) {
                if (empty($value) || strlen($value) < 3) {
                    return new WP_Error(
                        'invalid_title',
                        'Title must be at least 3 characters'
                    );
                }
                return true;
            },
        ),
        'price' => array(
            'validate_callback' => function($value) {
                if (!is_numeric($value) || $value < 0) {
                    return new WP_Error(
                        'invalid_price',
                        'Price must be a positive number'
                    );
                }
                return true;
            },
        ),
        'status' => array(
            'validate_callback' => function($value) {
                $allowed = array('draft', 'publish');
                if (!in_array($value, $allowed, true)) {
                    return new WP_Error(
                        'invalid_status',
                        'Status must be draft or publish'
                    );
                }
                return true;
            },
        ),
    ),
));
```

## Settings Validation

```php
// Register setting with validation
register_setting('my_plugin_options', 'my_plugin_settings', array(
    'type' => 'array',
    'sanitize_callback' => 'validate_my_settings',
));

function validate_my_settings($input) {
    $output = get_option('my_plugin_settings', array());
    
    // Validate and set each field
    if (isset($input['api_key'])) {
        if (strlen($input['api_key']) !== 32) {
            add_settings_error(
                'my_plugin_settings',
                'invalid_api_key',
                'API key must be 32 characters'
            );
        } else {
            $output['api_key'] = sanitize_text_field($input['api_key']);
        }
    }
    
    if (isset($input['items_per_page'])) {
        $items = intval($input['items_per_page']);
        if ($items < 1 || $items > 100) {
            add_settings_error(
                'my_plugin_settings',
                'invalid_items',
                'Items per page must be between 1 and 100'
            );
        } else {
            $output['items_per_page'] = $items;
        }
    }
    
    return $output;
}
```

## File Upload Validation

```php
function validate_uploaded_file($file) {
    $errors = new WP_Error();
    
    // Check for upload errors
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors->add('upload_error', 'Upload failed');
        return $errors;
    }
    
    // Validate file type
    $allowed_types = array('image/jpeg', 'image/png', 'image/gif');
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mime, $allowed_types, true)) {
        $errors->add('invalid_type', 'File type not allowed');
    }
    
    // Validate file size (5MB max)
    if ($file['size'] > 5 * 1024 * 1024) {
        $errors->add('file_too_large', 'File exceeds 5MB limit');
    }
    
    // Validate file extension
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, array('jpg', 'jpeg', 'png', 'gif'), true)) {
        $errors->add('invalid_extension', 'Invalid file extension');
    }
    
    return $errors->has_errors() ? $errors : true;
}
```

## Best Practices

1. **Validate before sanitize** - Reject invalid data first
2. **Use whitelist when possible** - Known good > blocking bad
3. **Return specific errors** - Help users fix issues
4. **Validate on server** - Client validation is convenience only
5. **Type-strict comparisons** - Use `===` and `in_array(..., true)`

## Common Pitfalls

- Relying only on client-side validation
- Loose comparisons (== vs ===)
- Not validating file contents (only extension)
- Missing nonce/capability checks
- Trusting user-supplied IDs

## Exam Tips

- **Know the difference between validation and sanitization**: Validation checks if data meets requirements (format, range, rules) and rejects invalid data. Sanitization cleans and normalizes data to make it safe. Validation answers "is this valid?" - sanitization answers "is this safe?". Use validation to reject bad data early, sanitization to clean acceptable data. Both are needed - validate first, then sanitize.

- **Understand nonce validation and when to use it**: Nonces (number used once) prevent CSRF attacks by verifying requests came from your site. Use `wp_verify_nonce($nonce, $action)` to validate. Always use nonces for form submissions, AJAX requests, and state-changing operations. Create nonces with `wp_create_nonce($action)`. The action should be unique and descriptive. Nonces expire after 24 hours by default. Never skip nonce validation for authenticated actions.

- **Know capability checking patterns**: Always check capabilities before allowing actions: `current_user_can('capability')` for current user, `user_can($user_id, 'capability')` for specific user. Check capabilities at every entry point: admin pages, AJAX handlers, REST API endpoints. Use specific capabilities, not broad ones like `manage_options` when more specific caps exist. Combine with nonces for defense in depth. Never trust client-side checks alone.

- **Understand REST API validation callbacks**: REST API uses `validate_callback` in route arguments to validate input. Validation callbacks return `true` for valid data, `WP_Error` for invalid. Use `sanitize_callback` for cleaning data. Always provide both validation and sanitization. Validation should check format, type, range, and business rules. Return descriptive error messages in `WP_Error` to help API consumers understand what's wrong.

- **Know file upload security considerations**: Validate file type by extension AND MIME type (both can be spoofed). Check file size limits. Use `wp_check_filetype_and_ext()` for proper type detection. Scan files for malware if possible. Store uploads outside web root when possible, or use `.htaccess` to prevent execution. Never trust `$_FILES['file']['type']` alone - check actual file content. Use `wp_handle_upload()` which includes security checks. Validate file contents, not just extension.
