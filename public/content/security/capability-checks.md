# Capability Checks

## Overview

Capability checks verify whether a user has permission to perform specific actions. This is fundamental to WordPress security and should always be combined with nonce verification.

## Key Concepts

### Capabilities vs Roles

| Concept | Description | Example |
|---------|-------------|---------|
| **Capability** | Specific permission | `edit_posts`, `manage_options` |
| **Role** | Collection of capabilities | `administrator`, `editor` |

**Always check capabilities, not roles** - it's more granular and flexible.

## Core Functions

### current_user_can()

```php
// Check if current user can do something
if (current_user_can('edit_posts')) {
    // User has edit_posts capability
}

// Check with object ID (meta capability)
if (current_user_can('edit_post', $post_id)) {
    // User can edit THIS specific post
}

// Check multiple capabilities
if (current_user_can('edit_posts') && current_user_can('upload_files')) {
    // User can do both
}
```

### user_can()

```php
// Check capability for specific user
if (user_can($user_id, 'manage_options')) {
    // This specific user is an admin
}

// With object context
if (user_can($user_id, 'edit_post', $post_id)) {
    // User can edit this post
}
```

### author_can()

```php
// Check if post author has capability
if (author_can($post, 'publish_posts')) {
    // The post's author can publish
}
```

## Common Capabilities

### Content Capabilities

```php
// Posts
'edit_posts'           // Edit own posts
'edit_others_posts'    // Edit others' posts
'edit_published_posts' // Edit published posts
'publish_posts'        // Publish posts
'delete_posts'         // Delete own posts
'delete_others_posts'  // Delete others' posts

// Pages
'edit_pages'
'edit_others_pages'
'publish_pages'
'delete_pages'

// Media
'upload_files'
'edit_files'
```

### Administrative Capabilities

```php
'manage_options'      // Access Settings pages
'activate_plugins'    // Activate plugins
'edit_plugins'        // Edit plugin files
'edit_themes'         // Edit theme files
'install_plugins'     // Install plugins
'install_themes'      // Install themes
'update_core'         // Update WordPress
'manage_categories'   // Manage categories
'moderate_comments'   // Moderate comments
'edit_users'          // Edit users
'create_users'        // Create users
'delete_users'        // Delete users
'list_users'          // List users
```

## Custom Post Type Capabilities

```php
// Register CPT with custom capabilities
register_post_type('product', array(
    'capability_type' => 'product',
    'map_meta_cap' => true,
    'capabilities' => array(
        'edit_post'          => 'edit_product',
        'read_post'          => 'read_product',
        'delete_post'        => 'delete_product',
        'edit_posts'         => 'edit_products',
        'edit_others_posts'  => 'edit_others_products',
        'publish_posts'      => 'publish_products',
        'read_private_posts' => 'read_private_products',
    ),
));

// Grant capabilities to admin
function add_product_caps() {
    $admin = get_role('administrator');
    $admin->add_cap('edit_products');
    $admin->add_cap('edit_others_products');
    $admin->add_cap('publish_products');
    $admin->add_cap('read_private_products');
    $admin->add_cap('delete_products');
    $admin->add_cap('delete_others_products');
}
register_activation_hook(__FILE__, 'add_product_caps');
```

## Admin Page Protection

```php
// Add admin menu with capability check
add_action('admin_menu', 'my_admin_menu');

function my_admin_menu() {
    add_menu_page(
        'My Plugin',
        'My Plugin',
        'manage_options',  // Required capability
        'my-plugin',
        'render_admin_page'
    );
    
    add_submenu_page(
        'my-plugin',
        'Settings',
        'Settings',
        'manage_options',  // Required capability
        'my-plugin-settings',
        'render_settings_page'
    );
}

// Double-check in page callback
function render_admin_page() {
    if (!current_user_can('manage_options')) {
        wp_die(__('You do not have sufficient permissions.'));
    }
    // Render page
}
```

## AJAX Handler Protection

```php
add_action('wp_ajax_my_action', 'handle_ajax');

function handle_ajax() {
    // Verify nonce first
    check_ajax_referer('my_nonce', 'security');
    
    // Then check capability
    if (!current_user_can('edit_posts')) {
        wp_send_json_error('Unauthorized', 403);
    }
    
    // Process action
    wp_send_json_success('Done');
}
```

## REST API Protection

```php
register_rest_route('my-plugin/v1', '/items', array(
    'methods' => 'POST',
    'callback' => 'create_item',
    'permission_callback' => function() {
        return current_user_can('edit_posts');
    },
));

register_rest_route('my-plugin/v1', '/settings', array(
    'methods' => 'POST',
    'callback' => 'update_settings',
    'permission_callback' => function() {
        return current_user_can('manage_options');
    },
));

// For public endpoints
register_rest_route('my-plugin/v1', '/public', array(
    'methods' => 'GET',
    'callback' => 'get_public_data',
    'permission_callback' => '__return_true', // Explicitly allow
));
```

## Meta Capability Mapping

```php
// Map meta capabilities for custom post types
add_filter('map_meta_cap', 'my_map_meta_cap', 10, 4);

function my_map_meta_cap($caps, $cap, $user_id, $args) {
    // Only handle our custom capabilities
    if (!in_array($cap, array('edit_product', 'delete_product', 'read_product'))) {
        return $caps;
    }
    
    $post = get_post($args[0]);
    if (!$post) {
        return $caps;
    }
    
    $post_type = get_post_type_object($post->post_type);
    $caps = array();
    
    switch ($cap) {
        case 'edit_product':
            if ($user_id == $post->post_author) {
                $caps[] = $post_type->cap->edit_posts;
            } else {
                $caps[] = $post_type->cap->edit_others_posts;
            }
            break;
            
        case 'delete_product':
            if ($user_id == $post->post_author) {
                $caps[] = $post_type->cap->delete_posts;
            } else {
                $caps[] = $post_type->cap->delete_others_posts;
            }
            break;
            
        case 'read_product':
            if ('private' === $post->post_status) {
                $caps[] = $post_type->cap->read_private_posts;
            } else {
                $caps[] = 'read';
            }
            break;
    }
    
    return $caps;
}
```

## Complete Security Pattern

```php
// Form handler with full security
function process_form() {
    // 1. Verify nonce
    if (!wp_verify_nonce($_POST['_nonce'], 'my_form_action')) {
        wp_die('Security check failed');
    }
    
    // 2. Check capability
    if (!current_user_can('edit_posts')) {
        wp_die('You do not have permission to do this');
    }
    
    // 3. Validate input
    $title = isset($_POST['title']) ? trim($_POST['title']) : '';
    if (empty($title)) {
        wp_die('Title is required');
    }
    
    // 4. Sanitize input
    $title = sanitize_text_field($title);
    $content = wp_kses_post($_POST['content']);
    
    // 5. Process data
    $post_id = wp_insert_post(array(
        'post_title' => $title,
        'post_content' => $content,
        'post_status' => 'publish',
    ));
    
    // 6. Redirect with success message
    wp_redirect(add_query_arg('success', '1', wp_get_referer()));
    exit;
}
```

## Best Practices

1. **Always check capabilities** - Never assume user permissions
2. **Use meta capabilities** - For object-specific checks
3. **Combine with nonces** - Defense in depth
4. **Check at every entry point** - Admin pages, AJAX, REST API
5. **Use specific capabilities** - Not broad admin checks
6. **Grant minimum permissions** - Principle of least privilege

## Common Pitfalls

- Checking roles instead of capabilities
- Forgetting capability checks in AJAX handlers
- Not using `permission_callback` in REST routes
- Using `manage_options` when more specific cap exists
- Forgetting to add capabilities to roles for CPTs

## Exam Tips

- **Know the difference between capabilities and roles**: Roles are collections of capabilities assigned to users. Capabilities are specific permissions (e.g., `edit_posts`, `manage_options`). Always check capabilities, not roles, because capabilities are more flexible - you can add/remove capabilities from roles, and users can have multiple roles. Checking roles is inflexible and breaks when roles change. Use `current_user_can('capability')` not role checks.

- **Understand meta capabilities and mapping**: Meta capabilities like `edit_post`, `delete_post` are "pseudo" capabilities that map to primitive capabilities based on context (e.g., post author, post status). Use the `map_meta_cap` filter to customize this mapping. Meta capabilities allow WordPress to check permissions dynamically - `edit_post` maps to `edit_posts` for own posts or `edit_others_posts` for others' posts. Understanding this helps you create proper capability checks for custom post types.

- **Know how to protect admin pages, AJAX, and REST API**: For admin pages, use `current_user_can('capability')` checks in page callbacks and `add_menu_page()` capability parameter. For AJAX, verify in handler: `check_ajax_referer()` + `current_user_can()`. For REST API, use `permission_callback` in `register_rest_route()` - never skip this. Always check capabilities at every entry point. Never trust that admin pages are automatically protected - always verify.

- **Understand CPT capability registration**: When registering custom post types with `capability_type`, WordPress creates custom capabilities like `edit_books`, `publish_books`. Set `map_meta_cap => true` to enable meta capability mapping. You must then grant these capabilities to roles using `get_role()->add_cap()`. Without granting capabilities, even admins won't be able to manage your CPT. Always add capabilities to appropriate roles on plugin activation.

- **Know common WordPress capabilities**: Key capabilities include `manage_options` (admin settings), `edit_posts` (edit own posts), `edit_others_posts` (edit any posts), `publish_posts` (publish posts), `delete_posts` (delete own posts), `upload_files` (upload media), `manage_categories` (manage taxonomies), `moderate_comments` (moderate comments). Use specific capabilities rather than broad ones like `manage_options` when more specific caps exist. Understanding capabilities helps you grant appropriate permissions.
