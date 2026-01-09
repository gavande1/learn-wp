# Roles and Capabilities

## Overview

WordPress uses a Role-Based Access Control (RBAC) system. Users are assigned roles, and roles have capabilities that determine what actions they can perform.

## Key Concepts

### Default Roles

| Role | Description |
|------|-------------|
| Super Admin | Multisite network admin (all capabilities) |
| Administrator | Full site access |
| Editor | Manage all content |
| Author | Publish own posts |
| Contributor | Write but not publish |
| Subscriber | Read only, manage profile |

### Default Capabilities by Role

```php
// Administrator has:
'switch_themes', 'edit_themes', 'activate_plugins',
'edit_plugins', 'edit_users', 'edit_files',
'manage_options', 'moderate_comments', 'manage_categories',
'manage_links', 'upload_files', 'import', 'unfiltered_html',
'edit_posts', 'edit_others_posts', 'edit_published_posts',
'publish_posts', 'edit_pages', 'read', 'level_10',
'delete_posts', 'delete_others_posts', 'delete_published_posts',
'delete_pages', 'delete_others_pages', 'delete_published_pages',
'edit_others_pages', 'publish_pages', 'create_users',
'delete_users', 'list_users'

// Editor has:
'moderate_comments', 'manage_categories', 'manage_links',
'upload_files', 'unfiltered_html', 'edit_posts',
'edit_others_posts', 'edit_published_posts', 'publish_posts',
'edit_pages', 'read', 'delete_posts', 'delete_others_posts',
'delete_published_posts', 'delete_pages', 'delete_others_pages',
'delete_published_pages', 'edit_others_pages', 'publish_pages'
```

## Checking Capabilities

### Current User Capabilities

```php
// Check if current user can do something
if (current_user_can('edit_posts')) {
    // User can edit posts
}

// Check with object ID
if (current_user_can('edit_post', $post_id)) {
    // User can edit this specific post
}

// Check multiple capabilities
if (current_user_can('edit_posts') && current_user_can('publish_posts')) {
    // User can edit and publish
}
```

### Specific User Capabilities

```php
// Check capability for specific user
$user = get_user_by('id', $user_id);

if ($user && $user->has_cap('manage_options')) {
    // This user is an admin
}

// Or using user_can()
if (user_can($user_id, 'edit_posts')) {
    // User can edit posts
}
```

### Role Checks

```php
// Check if user has a specific role
$user = wp_get_current_user();

if (in_array('administrator', $user->roles)) {
    // User is an administrator
}

// Check for multiple roles
$allowed_roles = array('administrator', 'editor');
if (array_intersect($allowed_roles, $user->roles)) {
    // User has one of the allowed roles
}
```

## Creating Custom Roles

```php
// Add custom role on plugin activation
register_activation_hook(__FILE__, 'my_plugin_add_roles');

function my_plugin_add_roles() {
    add_role(
        'content_manager',
        'Content Manager',
        array(
            'read' => true,
            'edit_posts' => true,
            'edit_others_posts' => true,
            'edit_published_posts' => true,
            'publish_posts' => true,
            'delete_posts' => true,
            'delete_others_posts' => true,
            'upload_files' => true,
            'manage_categories' => true,
        )
    );
}

// Remove role on deactivation
register_deactivation_hook(__FILE__, 'my_plugin_remove_roles');

function my_plugin_remove_roles() {
    remove_role('content_manager');
}
```

## Adding Custom Capabilities

### To Existing Roles

```php
// Add capability to a role
$role = get_role('editor');
$role->add_cap('manage_shop_orders');

// Remove capability from a role
$role->remove_cap('manage_shop_orders');
```

### For Custom Post Types

```php
// Register CPT with custom capabilities
register_post_type('book', array(
    'public' => true,
    'label' => 'Books',
    'capability_type' => 'book',
    'map_meta_cap' => true,
    'capabilities' => array(
        'publish_posts' => 'publish_books',
        'edit_posts' => 'edit_books',
        'edit_others_posts' => 'edit_others_books',
        'delete_posts' => 'delete_books',
        'delete_others_posts' => 'delete_others_books',
        'read_private_posts' => 'read_private_books',
        'edit_post' => 'edit_book',
        'delete_post' => 'delete_book',
        'read_post' => 'read_book',
    ),
));

// Then add capabilities to appropriate roles
function add_book_caps() {
    $admin = get_role('administrator');
    $admin->add_cap('publish_books');
    $admin->add_cap('edit_books');
    $admin->add_cap('edit_others_books');
    $admin->add_cap('delete_books');
    $admin->add_cap('delete_others_books');
    $admin->add_cap('read_private_books');
    $admin->add_cap('edit_book');
    $admin->add_cap('delete_book');
    $admin->add_cap('read_book');
}
```

## Meta Capabilities

Meta capabilities are "pseudo" capabilities that map to primitive capabilities.

```php
// Map meta capabilities
add_filter('map_meta_cap', 'my_map_meta_cap', 10, 4);

function my_map_meta_cap($caps, $cap, $user_id, $args) {
    // Handle 'edit_book' meta capability
    if ('edit_book' === $cap || 'delete_book' === $cap || 'read_book' === $cap) {
        $post = get_post($args[0]);
        $post_type = get_post_type_object($post->post_type);
        $caps = array();
        
        if ('edit_book' === $cap) {
            if ($user_id == $post->post_author) {
                $caps[] = $post_type->cap->edit_posts;
            } else {
                $caps[] = $post_type->cap->edit_others_posts;
            }
        }
    }
    
    return $caps;
}
```

## Security Best Practices

### Use Capabilities, Not Roles

```php
// BAD - Checking role
if (current_user_can('administrator')) {
    // Inflexible
}

// GOOD - Checking capability
if (current_user_can('manage_options')) {
    // More flexible and secure
}
```

### Principle of Least Privilege

```php
// Give minimum necessary capabilities
add_role('shop_clerk', 'Shop Clerk', array(
    'read' => true,
    'edit_shop_orders' => true,
    // Only what they need, nothing more
));
```

### Don't Store Security Logic in Database

```php
// BAD - Capability check stored in option
$allowed_cap = get_option('my_plugin_required_cap');
if (current_user_can($allowed_cap)) { ... }

// GOOD - Capability check in code (can be filtered)
if (current_user_can(apply_filters('my_plugin_required_cap', 'manage_options'))) { ... }
```

## User Management

```php
// Add capability to specific user
$user = new WP_User($user_id);
$user->add_cap('my_custom_capability');
$user->remove_cap('my_custom_capability');

// Change user role
$user->set_role('editor');

// Add additional role (user can have multiple)
$user->add_role('content_manager');
$user->remove_role('content_manager');
```

## Restricting Admin Access

```php
// Restrict dashboard access
add_action('admin_init', 'restrict_admin_access');

function restrict_admin_access() {
    if (!current_user_can('edit_posts') && !wp_doing_ajax()) {
        wp_redirect(home_url());
        exit;
    }
}

// Hide admin bar for certain users
add_action('after_setup_theme', 'hide_admin_bar');

function hide_admin_bar() {
    if (!current_user_can('edit_posts')) {
        show_admin_bar(false);
    }
}
```

## Best Practices

1. **Check capabilities, not roles** - More flexible and secure
2. **Use least privilege** - Only grant necessary permissions
3. **Document custom capabilities** - Make them discoverable
4. **Clean up on uninstall** - Remove custom roles/capabilities
5. **Use filters for flexibility** - Allow capability requirements to be changed

## Common Pitfalls

- Checking roles instead of capabilities
- Not adding capabilities to existing roles after CPT registration
- Forgetting to handle multisite Super Admin
- Not cleaning up roles on plugin removal
- Overly permissive capability grants

## Exam Tips

- **Know the default roles and their capabilities**: Administrator has all capabilities including `manage_options`, `edit_plugins`, `edit_users`. Editor can manage all content with `edit_others_posts`, `publish_posts`, `delete_others_posts`. Author can only publish their own posts. Contributor can write but not publish. Subscriber has minimal `read` capability. Understanding these helps you choose the right capability to check.

- **Understand the difference between roles and capabilities**: Roles are collections of capabilities assigned to users. Capabilities are specific permissions (e.g., `edit_posts`, `manage_options`). Always check capabilities, not roles, because capabilities are more flexible - you can add/remove capabilities from roles, and users can have multiple roles. Checking roles is inflexible and breaks when roles change.

- **Know how to create custom roles and capabilities**: Use `add_role()` to create custom roles with specific capabilities on plugin activation. Use `get_role()->add_cap()` to add capabilities to existing roles. For custom post types, register capabilities in the CPT registration and then add them to appropriate roles. Always clean up roles/capabilities on plugin deactivation using `remove_role()`.

- **Understand meta capabilities and mapping**: Meta capabilities like `edit_post`, `delete_post` are "pseudo" capabilities that map to primitive capabilities based on context (e.g., post author, post status). Use the `map_meta_cap` filter to customize this mapping. Meta capabilities allow WordPress to check permissions dynamically - `edit_post` maps to `edit_posts` for own posts or `edit_others_posts` for others' posts.

- **Know security best practices for capability checks**: Always use `current_user_can()` with specific capabilities, never check roles directly. Use the principle of least privilege - grant minimum necessary capabilities. Don't store capability names in the database (security risk). Handle Super Admin in multisite with `is_super_admin()`. Always verify capabilities on both display and save operations, not just one.
