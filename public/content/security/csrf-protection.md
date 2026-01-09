# CSRF Protection

## Overview

Cross-Site Request Forgery (CSRF) tricks users into performing unwanted actions on a site where they're authenticated. WordPress uses nonces as the primary defense against CSRF attacks.

## How CSRF Works

### The Attack

```html
<!-- Attacker's website -->
<img src="https://victim-site.com/wp-admin/admin-post.php?action=delete&id=123">

<!-- Or hidden form -->
<form action="https://victim-site.com/wp-admin/admin-post.php" method="POST">
    <input type="hidden" name="action" value="delete_all_posts">
</form>
<script>document.forms[0].submit();</script>
```

When authenticated users visit the attacker's page, their browser sends cookies automatically, executing the action.

### Why It Works

1. User is logged into victim site
2. Browser automatically sends authentication cookies
3. Server can't distinguish legitimate requests from forged ones
4. Without CSRF protection, action is executed

## WordPress CSRF Protection

### Nonces

WordPress nonces verify that requests originate from legitimate sources within your site.

```php
// Generate nonce
$nonce = wp_create_nonce('my_action');

// Verify nonce
if (wp_verify_nonce($_POST['_nonce'], 'my_action')) {
    // Request is legitimate
}
```

## Protecting Forms

### Standard Form Protection

```php
// In form template
<form method="POST" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
    <?php wp_nonce_field('save_my_settings', 'my_nonce_field'); ?>
    <input type="hidden" name="action" value="save_my_settings">
    
    <input type="text" name="setting_value" value="<?php echo esc_attr($current_value); ?>">
    <button type="submit">Save</button>
</form>
```

```php
// Handler
add_action('admin_post_save_my_settings', 'handle_save_settings');

function handle_save_settings() {
    // Verify nonce
    if (!wp_verify_nonce($_POST['my_nonce_field'], 'save_my_settings')) {
        wp_die('Security check failed');
    }
    
    // Verify capability
    if (!current_user_can('manage_options')) {
        wp_die('Unauthorized');
    }
    
    // Process form
    $value = sanitize_text_field($_POST['setting_value']);
    update_option('my_setting', $value);
    
    // Redirect back
    wp_redirect(add_query_arg('updated', 'true', wp_get_referer()));
    exit;
}
```

### Using check_admin_referer()

```php
// Simpler verification for admin pages
function handle_admin_action() {
    check_admin_referer('my_action', 'my_nonce');
    // Dies automatically if nonce invalid
    
    // Process action
}
```

## Protecting URL Actions

### Adding Nonce to URL

```php
// Generate secure URL
$delete_url = wp_nonce_url(
    admin_url('admin.php?page=my-plugin&action=delete&id=' . $item_id),
    'delete_item_' . $item_id
);

echo '<a href="' . esc_url($delete_url) . '">Delete</a>';
```

### Verifying URL Nonce

```php
// Handle URL action
if (isset($_GET['action']) && $_GET['action'] === 'delete') {
    $id = absint($_GET['id']);
    
    // Verify nonce
    if (!wp_verify_nonce($_GET['_wpnonce'], 'delete_item_' . $id)) {
        wp_die('Security check failed');
    }
    
    // Verify capability
    if (!current_user_can('delete_posts')) {
        wp_die('Unauthorized');
    }
    
    // Process deletion
    delete_item($id);
    
    wp_redirect(admin_url('admin.php?page=my-plugin&deleted=1'));
    exit;
}
```

## AJAX CSRF Protection

### Enqueue with Nonce

```php
// PHP
wp_enqueue_script('my-ajax', plugin_dir_url(__FILE__) . 'js/ajax.js', array('jquery'));
wp_localize_script('my-ajax', 'myAjax', array(
    'ajaxurl' => admin_url('admin-ajax.php'),
    'nonce' => wp_create_nonce('my_ajax_nonce'),
));
```

### Send Nonce with Request

```javascript
// JavaScript
jQuery.ajax({
    url: myAjax.ajaxurl,
    type: 'POST',
    data: {
        action: 'my_action',
        nonce: myAjax.nonce,
        item_id: itemId
    },
    success: function(response) {
        if (response.success) {
            console.log(response.data);
        }
    }
});

// Or with fetch
fetch(myAjax.ajaxurl, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
        action: 'my_action',
        nonce: myAjax.nonce,
        item_id: itemId
    })
});
```

### Verify in Handler

```php
add_action('wp_ajax_my_action', 'handle_my_ajax');

function handle_my_ajax() {
    // Verify nonce
    check_ajax_referer('my_ajax_nonce', 'nonce');
    
    // Or manual check for more control
    if (!wp_verify_nonce($_POST['nonce'], 'my_ajax_nonce')) {
        wp_send_json_error('Invalid nonce', 403);
    }
    
    // Verify capability
    if (!current_user_can('edit_posts')) {
        wp_send_json_error('Unauthorized', 403);
    }
    
    // Process request
    $item_id = absint($_POST['item_id']);
    $result = process_item($item_id);
    
    wp_send_json_success($result);
}
```

## REST API CSRF Protection

### Built-in Nonce Support

```php
// Enqueue with REST nonce
wp_enqueue_script('my-rest-script', ...);
wp_localize_script('my-rest-script', 'wpApiSettings', array(
    'root' => esc_url_raw(rest_url()),
    'nonce' => wp_create_nonce('wp_rest'),
));
```

```javascript
// JavaScript - send nonce in header
fetch(wpApiSettings.root + 'my-plugin/v1/items', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': wpApiSettings.nonce
    },
    body: JSON.stringify({ title: 'New Item' })
});
```

### Permission Callbacks

```php
// REST route with permission check
register_rest_route('my-plugin/v1', '/items', array(
    'methods' => 'POST',
    'callback' => 'create_item',
    'permission_callback' => function() {
        // Nonce auto-verified if X-WP-Nonce header present
        return current_user_can('edit_posts');
    },
));
```

## Meta Box CSRF Protection

```php
// Add meta box
add_action('add_meta_boxes', function() {
    add_meta_box('my_meta', 'My Meta', 'render_my_meta_box', 'post');
});

function render_my_meta_box($post) {
    // Add nonce field
    wp_nonce_field('save_my_meta_' . $post->ID, 'my_meta_nonce');
    
    $value = get_post_meta($post->ID, '_my_meta', true);
    ?>
    <input type="text" name="my_meta_value" value="<?php echo esc_attr($value); ?>">
    <?php
}

// Save meta box
add_action('save_post', 'save_my_meta_box');

function save_my_meta_box($post_id) {
    // Verify nonce
    if (!isset($_POST['my_meta_nonce'])) {
        return;
    }
    
    if (!wp_verify_nonce($_POST['my_meta_nonce'], 'save_my_meta_' . $post_id)) {
        return;
    }
    
    // Check autosave
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    // Check permissions
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }
    
    // Save data
    $value = sanitize_text_field($_POST['my_meta_value']);
    update_post_meta($post_id, '_my_meta', $value);
}
```

## Settings API Integration

```php
// Settings API handles nonces automatically
register_setting('my_settings_group', 'my_option', array(
    'sanitize_callback' => 'sanitize_text_field',
));

// On settings page
function render_settings_page() {
    ?>
    <form action="options.php" method="POST">
        <?php 
        settings_fields('my_settings_group'); // Adds nonce
        do_settings_sections('my-settings-page');
        submit_button();
        ?>
    </form>
    <?php
}
```

## SameSite Cookies

WordPress 5.7+ sets SameSite attribute on cookies for additional CSRF protection:

```php
// Cookies are set with SameSite=Lax by default
// This prevents cookies from being sent in cross-site requests
// (except for safe HTTP methods like GET)

// For stricter protection, you can filter:
add_filter('wp_auth_cookie_same_site', function() {
    return 'Strict';
});
```

## Best Practices

1. **Always use nonces** for state-changing operations
2. **Make nonces specific** - Include action and object ID
3. **Combine with capability checks** - Defense in depth
4. **Use action-specific nonce names** - Not generic
5. **Set appropriate nonce lifetime** - Default 24h usually fine
6. **Don't cache pages with nonces** - They'll be stale

## Common Pitfalls

- Forgetting nonces on AJAX handlers
- Using same nonce for multiple actions
- Not verifying nonces in REST API callbacks
- Caching pages containing nonces
- Not including object IDs in nonce action names

## Exam Tips

- **Know difference between wp_verify_nonce and check_admin_referer**: `wp_verify_nonce($nonce, $action)` verifies the nonce value directly. `check_admin_referer($action)` verifies nonce AND checks HTTP referer header (ensures request came from admin). Use `wp_verify_nonce()` for custom implementations, `check_admin_referer()` for admin form submissions. `check_admin_referer()` provides additional security by verifying request origin, but may fail if referer is blocked by server/firewall.

- **Understand nonce lifetime (24 hours, valid for 48 total)**: Nonces are valid for 24 hours total, but `wp_verify_nonce()` returns `1` for first 12 hours and `2` for second 12 hours. After 24 hours, returns `false`. The two-period system allows for clock skew and provides a grace period. Always check explicitly for `false` - don't use truthy checks as both `1` and `2` are valid. Nonces tied to user session - logging out/in invalidates them.

- **Know how to use nonces with AJAX and REST API**: For AJAX, create nonce with `wp_create_nonce('action')`, pass via `wp_localize_script()`, verify with `check_ajax_referer('action')`. For REST API, use `wp_create_nonce('wp_rest')` and verify `X-WP-Nonce` header or use `check_ajax_referer('wp_rest', null, false)`. REST API uses 'wp_rest' as default action. Always verify nonces in AJAX/REST handlers - they're not automatic.

- **Understand wp_nonce_field() vs wp_create_nonce()**: `wp_nonce_field($action)` outputs a hidden form field with nonce (use in forms). `wp_create_nonce($action)` returns the nonce value as string (use for AJAX, URLs, custom implementations). Use `wp_nonce_field()` in HTML forms, `wp_create_nonce()` when you need the nonce value directly. Both create nonces tied to current user and action. `wp_nonce_field()` is convenient for forms, `wp_create_nonce()` gives more control.

- **Know SameSite cookie attribute purpose**: SameSite cookie attribute prevents cookies from being sent in cross-site requests, providing CSRF protection at browser level. WordPress sets SameSite on auth cookies. `SameSite=Strict` blocks all cross-site requests, `SameSite=Lax` allows GET requests from other sites. This provides additional CSRF protection beyond nonces. Modern browsers enforce SameSite, but nonces are still needed for defense in depth and older browser support.
