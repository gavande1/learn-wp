# Authorization

## Overview

Authorization determines what authenticated users can do. While authentication verifies identity, authorization enforces permissions. WordPress uses a role and capability system for authorization.

## Authentication vs Authorization

| Aspect | Authentication | Authorization |
|--------|---------------|---------------|
| Question | "Who are you?" | "What can you do?" |
| Process | Verify identity | Check permissions |
| WordPress | `wp_authenticate()` | `current_user_can()` |
| Failure | "Invalid credentials" | "Access denied" |

## WordPress Authorization System

### Roles and Capabilities

```php
// Default roles and key capabilities
$roles = array(
    'administrator' => array(
        'manage_options',
        'activate_plugins',
        'edit_users',
        // All capabilities
    ),
    'editor' => array(
        'edit_others_posts',
        'publish_posts',
        'manage_categories',
        // Content management
    ),
    'author' => array(
        'publish_posts',
        'upload_files',
        // Own content only
    ),
    'contributor' => array(
        'edit_posts',
        // Write, but not publish
    ),
    'subscriber' => array(
        'read',
        // View only
    ),
);
```

### Checking Authorization

```php
// Check current user capability
if (current_user_can('manage_options')) {
    // User is authorized for admin actions
}

// Check with context (meta capabilities)
if (current_user_can('edit_post', $post_id)) {
    // User can edit THIS specific post
}

// Check specific user
if (user_can($user_id, 'delete_posts')) {
    // This user can delete posts
}

// Check post author
if (author_can($post, 'publish_posts')) {
    // Post author can publish
}
```

## Creating Custom Roles

```php
// Add custom role on activation
register_activation_hook(__FILE__, 'add_custom_roles');

function add_custom_roles() {
    // Content Manager - can manage content but not settings
    add_role('content_manager', 'Content Manager', array(
        'read' => true,
        'edit_posts' => true,
        'edit_others_posts' => true,
        'edit_published_posts' => true,
        'publish_posts' => true,
        'delete_posts' => true,
        'delete_others_posts' => true,
        'upload_files' => true,
        'manage_categories' => true,
    ));
    
    // Shop Manager - custom e-commerce role
    add_role('shop_manager', 'Shop Manager', array(
        'read' => true,
        'edit_products' => true,
        'edit_others_products' => true,
        'publish_products' => true,
        'manage_shop_orders' => true,
        'view_shop_reports' => true,
    ));
}

// Remove roles on deactivation
register_deactivation_hook(__FILE__, 'remove_custom_roles');

function remove_custom_roles() {
    remove_role('content_manager');
    remove_role('shop_manager');
}
```

## Custom Capabilities

### Adding Capabilities

```php
// Add capability to existing role
function add_custom_capabilities() {
    $admin = get_role('administrator');
    $admin->add_cap('manage_shop_settings');
    $admin->add_cap('view_shop_reports');
    
    $editor = get_role('editor');
    $editor->add_cap('manage_products');
}
add_action('admin_init', 'add_custom_capabilities');

// Run once (during activation/upgrade)
function upgrade_roles() {
    $version = get_option('my_plugin_role_version', 0);
    
    if ($version < 1) {
        $admin = get_role('administrator');
        $admin->add_cap('manage_shop_settings');
        update_option('my_plugin_role_version', 1);
    }
}
add_action('admin_init', 'upgrade_roles');
```

### User-Specific Capabilities

```php
// Add capability to specific user
$user = new WP_User($user_id);
$user->add_cap('can_view_secret_page');

// Remove capability from user
$user->remove_cap('can_view_secret_page');

// Check user-specific cap
if (current_user_can('can_view_secret_page')) {
    // Show secret content
}
```

## Protecting Resources

### Admin Pages

```php
// Add menu with capability requirement
add_action('admin_menu', 'register_admin_pages');

function register_admin_pages() {
    // Only accessible to those with manage_options
    add_menu_page(
        'Settings',
        'My Plugin',
        'manage_options',  // Required capability
        'my-plugin',
        'render_settings_page'
    );
    
    // Submenu with different capability
    add_submenu_page(
        'my-plugin',
        'Reports',
        'Reports',
        'view_shop_reports',  // Custom capability
        'my-plugin-reports',
        'render_reports_page'
    );
}

// Double-check in callback
function render_settings_page() {
    if (!current_user_can('manage_options')) {
        wp_die(__('You are not authorized to view this page.'));
    }
    // Render page
}
```

### AJAX Endpoints

```php
add_action('wp_ajax_save_settings', 'handle_save_settings');

function handle_save_settings() {
    // Verify nonce
    check_ajax_referer('save_settings_nonce', 'nonce');
    
    // Authorize user
    if (!current_user_can('manage_options')) {
        wp_send_json_error(array(
            'message' => 'You are not authorized to perform this action.'
        ), 403);
    }
    
    // Process request
    $result = update_option('my_setting', sanitize_text_field($_POST['value']));
    wp_send_json_success(array('updated' => $result));
}
```

### REST API Endpoints

```php
register_rest_route('my-plugin/v1', '/settings', array(
    array(
        'methods' => 'GET',
        'callback' => 'get_settings',
        'permission_callback' => function() {
            return current_user_can('manage_options');
        },
    ),
    array(
        'methods' => 'POST',
        'callback' => 'update_settings',
        'permission_callback' => function() {
            return current_user_can('manage_options');
        },
    ),
));

// Object-level authorization
register_rest_route('my-plugin/v1', '/posts/(?P<id>\d+)', array(
    'methods' => 'PUT',
    'callback' => 'update_post_handler',
    'permission_callback' => function($request) {
        $post_id = $request->get_param('id');
        return current_user_can('edit_post', $post_id);
    },
));
```

### Content Restriction

```php
// Restrict content in templates
function restricted_content($content) {
    if (is_singular('premium_post')) {
        if (!current_user_can('read_premium_posts')) {
            return '<p>This content is for premium members only.</p>';
        }
    }
    return $content;
}
add_filter('the_content', 'restricted_content');

// Shortcode for restricted content
add_shortcode('restricted', 'restricted_shortcode');

function restricted_shortcode($atts, $content = null) {
    $atts = shortcode_atts(array(
        'capability' => 'edit_posts',
        'message' => 'You do not have permission to view this content.',
    ), $atts);
    
    if (!current_user_can($atts['capability'])) {
        return '<p class="restricted-message">' . esc_html($atts['message']) . '</p>';
    }
    
    return do_shortcode($content);
}

// Usage: [restricted capability="manage_options"]Admin content here[/restricted]
```

## Meta Capabilities

```php
// Map meta capabilities for custom post types
add_filter('map_meta_cap', 'map_product_caps', 10, 4);

function map_product_caps($caps, $cap, $user_id, $args) {
    // Only handle product capabilities
    $product_caps = array('edit_product', 'delete_product', 'read_product');
    if (!in_array($cap, $product_caps)) {
        return $caps;
    }
    
    $post = get_post($args[0]);
    if (!$post || $post->post_type !== 'product') {
        return $caps;
    }
    
    $post_type = get_post_type_object('product');
    
    switch ($cap) {
        case 'edit_product':
            if ($user_id == $post->post_author) {
                $caps = array($post_type->cap->edit_posts);
            } else {
                $caps = array($post_type->cap->edit_others_posts);
            }
            break;
            
        case 'delete_product':
            if ($user_id == $post->post_author) {
                $caps = array($post_type->cap->delete_posts);
            } else {
                $caps = array($post_type->cap->delete_others_posts);
            }
            break;
            
        case 'read_product':
            if ($post->post_status !== 'private') {
                $caps = array('read');
            } elseif ($user_id == $post->post_author) {
                $caps = array('read');
            } else {
                $caps = array($post_type->cap->read_private_posts);
            }
            break;
    }
    
    return $caps;
}
```

## Dynamic Authorization

### Context-Based Authorization

```php
// Allow users to edit their own profile
add_filter('user_has_cap', 'allow_edit_own_profile', 10, 4);

function allow_edit_own_profile($allcaps, $caps, $args, $user) {
    // Check if editing user profile
    if (isset($args[0]) && $args[0] === 'edit_user') {
        $target_user_id = isset($args[2]) ? $args[2] : 0;
        
        // User can always edit their own profile
        if ($target_user_id === $user->ID) {
            $allcaps['edit_users'] = true;
        }
    }
    
    return $allcaps;
}
```

### Time-Based Authorization

```php
// Temporary elevated permissions
function grant_temporary_access($user_id, $capability, $duration) {
    $expires = time() + $duration;
    update_user_meta($user_id, "_temp_cap_{$capability}", $expires);
}

add_filter('user_has_cap', 'check_temporary_caps', 10, 4);

function check_temporary_caps($allcaps, $caps, $args, $user) {
    foreach ($caps as $cap) {
        $expires = get_user_meta($user->ID, "_temp_cap_{$cap}", true);
        if ($expires && $expires > time()) {
            $allcaps[$cap] = true;
        } elseif ($expires) {
            delete_user_meta($user->ID, "_temp_cap_{$cap}");
        }
    }
    return $allcaps;
}
```

## Authorization Patterns

### Hierarchical Permissions

```php
// Manager can do everything subordinate can do
function check_hierarchical_permission($capability) {
    $hierarchy = array(
        'admin' => array('manage_all', 'manage_users', 'manage_content', 'view_reports'),
        'manager' => array('manage_content', 'view_reports'),
        'staff' => array('view_reports'),
    );
    
    $user = wp_get_current_user();
    
    foreach ($hierarchy as $role => $caps) {
        if (in_array($role, $user->roles) && in_array($capability, $caps)) {
            return true;
        }
    }
    
    return false;
}
```

### Resource-Based Authorization

```php
// Check if user owns or manages resource
function can_manage_project($user_id, $project_id) {
    $project = get_post($project_id);
    
    // Owner can always manage
    if ($project->post_author == $user_id) {
        return true;
    }
    
    // Check if user is assigned to project
    $team = get_post_meta($project_id, '_project_team', true);
    if (is_array($team) && in_array($user_id, $team)) {
        return true;
    }
    
    // Admins can manage any project
    return user_can($user_id, 'manage_all_projects');
}
```

## Best Practices

1. **Check capabilities, not roles** - More granular control
2. **Use meta capabilities** - For object-specific permissions
3. **Fail securely** - Deny access by default
4. **Document custom capabilities** - For administrators
5. **Test authorization** - Different user roles
6. **Log access attempts** - For security auditing

## Common Pitfalls

- Checking roles instead of capabilities
- Forgetting authorization in AJAX handlers
- Not setting permission_callback in REST API
- Hardcoding user IDs for authorization
- Not cleaning up custom roles on uninstall

## Exam Tips

- **Know difference between authentication and authorization**: Authentication verifies "who you are" (login, identity). Authorization verifies "what you can do" (permissions, capabilities). Authentication happens first (login), then authorization checks permissions. Both are needed - authenticated users still need authorization checks. Never skip authorization just because user is authenticated. Understanding the difference helps implement proper security at each layer.

- **Understand roles vs capabilities**: Roles are collections of capabilities assigned to users. Capabilities are specific permissions (e.g., `edit_posts`, `manage_options`). Always check capabilities, not roles, because capabilities are more flexible. Users can have multiple roles, capabilities can be added/removed. Checking roles is inflexible. Use `current_user_can('capability')` not role checks. Understanding this helps implement flexible permission systems.

- **Know how to create custom roles and capabilities**: Use `add_role()` to create custom roles with specific capabilities on plugin activation. Use `get_role()->add_cap()` to add capabilities to existing roles. For custom post types, register capabilities in CPT registration, then grant to roles. Always clean up roles/capabilities on plugin deactivation using `remove_role()`. Custom roles/capabilities provide fine-grained permission control beyond default WordPress roles.

- **Understand meta capability mapping**: Meta capabilities like `edit_post`, `delete_post` map to primitive capabilities based on context (post author, status). Use `map_meta_cap` filter to customize mapping. Meta capabilities allow dynamic permission checks - `edit_post` maps to `edit_posts` for own posts or `edit_others_posts` for others' posts. Understanding mapping helps create proper capability checks for custom post types and custom objects.

- **Know REST API permission_callback usage**: REST API routes require `permission_callback` that returns `true` (allowed) or `WP_Error` (denied). Never skip `permission_callback` - it's a critical security requirement. Use `current_user_can('capability')` in callback. Can return different permissions for different methods (GET vs POST). Always verify permissions in callback - don't trust that routes are automatically protected. Missing callbacks are a serious security vulnerability.
