# Nonces

## Overview

WordPress nonces (Number used ONCE) protect against CSRF attacks by verifying that requests originate from legitimate sources. Despite the name, WordPress nonces can be used multiple times within their validity period.

## Key Concepts

### What Nonces Protect Against

- Cross-Site Request Forgery (CSRF)
- Unauthorized form submissions
- Malicious link clicks
- Replay attacks (partially)

### Nonce Lifecycle

1. Generate nonce for user/action
2. Include in form/URL
3. Verify on server before processing
4. Regenerate for next request

## Creating Nonces

### For Forms

```php
// Generate nonce field
<form method="post">
    <?php wp_nonce_field('my_action', 'my_nonce'); ?>
    <input type="text" name="data" />
    <button type="submit">Submit</button>
</form>

// Or get just the nonce value
$nonce = wp_create_nonce('my_action');
<input type="hidden" name="_wpnonce" value="<?php echo esc_attr($nonce); ?>" />
```

### For URLs

```php
// Add nonce to URL
$url = wp_nonce_url(
    admin_url('admin.php?page=my-plugin&action=delete&id=123'),
    'delete_item_123'
);

// Or use add_query_arg
$url = add_query_arg(
    '_wpnonce',
    wp_create_nonce('delete_item_' . $id),
    $base_url
);

<a href="<?php echo esc_url($url); ?>">Delete</a>
```

### For AJAX

```php
// PHP - localize script with nonce
wp_enqueue_script('my-ajax-script', ...);
wp_localize_script('my-ajax-script', 'myAjax', array(
    'ajaxurl' => admin_url('admin-ajax.php'),
    'nonce' => wp_create_nonce('my_ajax_action'),
));

// JavaScript
jQuery.ajax({
    url: myAjax.ajaxurl,
    type: 'POST',
    data: {
        action: 'my_action',
        nonce: myAjax.nonce,
        data: formData
    },
    success: function(response) {
        console.log(response);
    }
});
```

## Verifying Nonces

### Form Submissions

```php
// Basic verification
if (!wp_verify_nonce($_POST['my_nonce'], 'my_action')) {
    wp_die('Security check failed');
}

// Check with specific return values
$nonce_check = wp_verify_nonce($_POST['my_nonce'], 'my_action');
if ($nonce_check === false) {
    wp_die('Invalid nonce');
} elseif ($nonce_check === 2) {
    // Nonce is between 12-24 hours old
    // May want to refresh
}
```

### Admin Pages

```php
// Verify admin referer (checks nonce + referer)
check_admin_referer('my_admin_action', 'my_nonce');

// Returns void - dies on failure
// Or use wp_verify_nonce for more control
```

### AJAX Requests

```php
add_action('wp_ajax_my_action', 'handle_my_action');

function handle_my_action() {
    // Verify AJAX nonce
    check_ajax_referer('my_ajax_action', 'nonce');
    
    // Or manual check
    if (!wp_verify_nonce($_POST['nonce'], 'my_ajax_action')) {
        wp_send_json_error('Invalid nonce', 403);
    }
    
    // Process request
    wp_send_json_success('Done');
}
```

### URL Actions

```php
// Processing delete action
if (isset($_GET['action']) && $_GET['action'] === 'delete') {
    // Verify nonce from URL
    if (!wp_verify_nonce($_GET['_wpnonce'], 'delete_item_' . $_GET['id'])) {
        wp_die('Security check failed');
    }
    
    // Check capability too!
    if (!current_user_can('delete_posts')) {
        wp_die('Unauthorized');
    }
    
    // Proceed with deletion
    delete_item($_GET['id']);
}
```

## Nonce Best Practices

### Make Actions Specific

```php
// BAD - generic action
wp_create_nonce('my_action');

// GOOD - specific to operation
wp_create_nonce('delete_post_' . $post_id);
wp_create_nonce('update_settings_' . $page);
wp_create_nonce('process_order_' . $order_id);
```

### Combine with Capability Checks

```php
function process_admin_action() {
    // Verify nonce
    if (!wp_verify_nonce($_POST['_nonce'], 'admin_action')) {
        wp_die('Security check failed');
    }
    
    // Verify capability
    if (!current_user_can('manage_options')) {
        wp_die('Unauthorized');
    }
    
    // Now safe to process
    do_the_thing();
}
```

### REST API Alternative

```php
// REST API has built-in nonce support
register_rest_route('my-plugin/v1', '/items/(?P<id>\d+)', array(
    'methods' => 'DELETE',
    'callback' => 'delete_item',
    'permission_callback' => function($request) {
        // Nonce automatically verified if X-WP-Nonce header present
        return current_user_can('delete_posts');
    },
));

// JavaScript
fetch('/wp-json/my-plugin/v1/items/123', {
    method: 'DELETE',
    headers: {
        'X-WP-Nonce': wpApiSettings.nonce,
    },
});
```

## Nonce Lifetime

```php
// Default: 24 hours (can be verified for 48 hours total)
// Customize lifetime
add_filter('nonce_life', function() {
    return 12 * HOUR_IN_SECONDS; // 12 hours
});

// wp_verify_nonce return values:
// false - invalid
// 1 - valid, generated 0-12 hours ago
// 2 - valid, generated 12-24 hours ago (may refresh)
```

## Common Patterns

### Meta Box Save

```php
add_action('add_meta_boxes', function() {
    add_meta_box('my_meta', 'Settings', 'render_meta_box', 'post');
});

function render_meta_box($post) {
    wp_nonce_field('save_my_meta_' . $post->ID, 'my_meta_nonce');
    // Render fields
}

add_action('save_post', 'save_my_meta');

function save_my_meta($post_id) {
    // Verify nonce
    if (!isset($_POST['my_meta_nonce']) || 
        !wp_verify_nonce($_POST['my_meta_nonce'], 'save_my_meta_' . $post_id)) {
        return;
    }
    
    // Check autosave
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    // Check permission
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }
    
    // Save data
    update_post_meta($post_id, '_my_meta', sanitize_text_field($_POST['my_field']));
}
```

### Bulk Actions

```php
// Process bulk action with nonce
if (isset($_POST['bulk_action']) && $_POST['bulk_action'] === 'delete') {
    // WordPress bulk actions include nonce
    check_admin_referer('bulk-posts');
    
    $ids = array_map('absint', $_POST['post_ids']);
    foreach ($ids as $id) {
        if (current_user_can('delete_post', $id)) {
            wp_delete_post($id);
        }
    }
}
```

## Common Pitfalls

- Using same nonce for different actions
- Forgetting to verify nonces
- Not combining with capability checks
- Hardcoding nonce action names (should include IDs)
- Caching pages with nonces (they become stale)

## Exam Tips

- **Know the difference between wp_verify_nonce and check_admin_referer**: `wp_verify_nonce($nonce, $action)` verifies a nonce value directly. `check_admin_referer($action)` verifies nonce AND checks that the request came from an admin page (checks HTTP referer). Use `wp_verify_nonce()` for custom nonce handling, `check_admin_referer()` for admin form submissions. `check_admin_referer()` is more secure as it adds referer validation, but may fail on some server configurations.

- **Understand nonce return values (false, 1, 2)**: `wp_verify_nonce()` returns `false` if nonce is invalid or expired. Returns `1` if nonce was generated 0-12 hours ago (first 12-hour period). Returns `2` if nonce was generated 12-24 hours ago (second 12-hour period). After 24 hours, returns `false`. The return value indicates how fresh the nonce is. Always check for `false` explicitly - don't use truthy checks as `1` and `2` are both truthy.

- **Know how to use nonces with AJAX and REST API**: For AJAX, create nonce with `wp_create_nonce('my_action')` and pass in `wp_localize_script()`. Verify with `check_ajax_referer('my_action')` or `wp_verify_nonce($_POST['nonce'], 'my_action')`. For REST API, use `wp_create_nonce('wp_rest')` and verify with `check_ajax_referer('wp_rest', null, false)` or verify the `X-WP-Nonce` header. REST API nonces use 'wp_rest' action by default.

- **Understand nonce lifetime and refresh**: Nonces are valid for 24 hours (two 12-hour periods). After 24 hours, they expire and must be regenerated. Nonces are tied to user sessions - if user logs out/in, nonce becomes invalid. For long-lived forms, you may need to refresh nonces via AJAX. Cached pages with nonces will have stale nonces. Consider nonce refresh for single-page applications or long sessions.

- **Always combine nonces with capability checks**: Nonces prevent CSRF but don't check permissions. Always verify both: `check_ajax_referer('action')` AND `current_user_can('capability')`. Nonces verify the request came from your site, capabilities verify the user has permission. Defense in depth - both are needed. Never skip capability checks just because you have a nonce. Nonces protect against cross-site requests, capabilities protect against unauthorized users.
