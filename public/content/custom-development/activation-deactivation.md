# Activation and Deactivation

## Overview

Plugin lifecycle events (activation, deactivation, uninstall) allow you to set up and clean up resources properly. Handling these correctly is crucial for professional plugin development.

## Activation

### Basic Activation Hook

```php
register_activation_hook(__FILE__, 'my_plugin_activate');

function my_plugin_activate() {
    // Create database tables
    my_plugin_create_tables();
    
    // Add default options
    my_plugin_add_default_options();
    
    // Create custom roles/capabilities
    my_plugin_add_roles();
    
    // Schedule cron events
    my_plugin_schedule_events();
    
    // Flush rewrite rules (after registering CPTs)
    my_plugin_register_post_types();
    flush_rewrite_rules();
    
    // Set activation flag
    set_transient('my_plugin_activated', true, 60);
}
```

### Creating Database Tables

```php
function my_plugin_create_tables() {
    global $wpdb;
    
    $charset_collate = $wpdb->get_charset_collate();
    $table_name = $wpdb->prefix . 'my_plugin_data';
    
    $sql = "CREATE TABLE $table_name (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        data longtext NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id)
    ) $charset_collate;";
    
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);
    
    // Store database version
    update_option('my_plugin_db_version', '1.0.0');
}
```

### Adding Default Options

```php
function my_plugin_add_default_options() {
    $defaults = array(
        'enabled' => true,
        'api_key' => '',
        'items_per_page' => 10,
        'notification_email' => get_option('admin_email'),
    );
    
    // Only add if not exists
    if (false === get_option('my_plugin_settings')) {
        add_option('my_plugin_settings', $defaults);
    }
}
```

### Adding Roles and Capabilities

```php
function my_plugin_add_roles() {
    // Add custom role
    add_role('shop_manager', 'Shop Manager', array(
        'read' => true,
        'edit_posts' => false,
        'manage_shop' => true,
    ));
    
    // Add capabilities to existing roles
    $admin = get_role('administrator');
    if ($admin) {
        $admin->add_cap('manage_shop');
        $admin->add_cap('view_shop_reports');
    }
}
```

### Scheduling Cron Events

```php
function my_plugin_schedule_events() {
    if (!wp_next_scheduled('my_plugin_daily_cleanup')) {
        wp_schedule_event(time(), 'daily', 'my_plugin_daily_cleanup');
    }
    
    if (!wp_next_scheduled('my_plugin_hourly_sync')) {
        wp_schedule_event(time(), 'hourly', 'my_plugin_hourly_sync');
    }
}
```

## Deactivation

### Basic Deactivation Hook

```php
register_deactivation_hook(__FILE__, 'my_plugin_deactivate');

function my_plugin_deactivate() {
    // Clear scheduled events
    my_plugin_clear_scheduled_events();
    
    // Flush rewrite rules
    flush_rewrite_rules();
    
    // Clear transients
    my_plugin_clear_transients();
    
    // Note: DON'T delete options or data here
    // Users may reactivate the plugin
}
```

### Clearing Scheduled Events

```php
function my_plugin_clear_scheduled_events() {
    $events = array(
        'my_plugin_daily_cleanup',
        'my_plugin_hourly_sync',
        'my_plugin_weekly_report',
    );
    
    foreach ($events as $event) {
        $timestamp = wp_next_scheduled($event);
        if ($timestamp) {
            wp_unschedule_event($timestamp, $event);
        }
        // Clear all instances
        wp_clear_scheduled_hook($event);
    }
}
```

### Clearing Transients

```php
function my_plugin_clear_transients() {
    global $wpdb;
    
    // Delete specific transients
    delete_transient('my_plugin_cache');
    delete_transient('my_plugin_api_response');
    
    // Delete all transients with prefix
    $wpdb->query(
        "DELETE FROM {$wpdb->options} 
         WHERE option_name LIKE '_transient_my_plugin_%' 
         OR option_name LIKE '_transient_timeout_my_plugin_%'"
    );
}
```

## Uninstall

### uninstall.php Method (Recommended)

```php
<?php
// uninstall.php - Runs when plugin is deleted

// Security check
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

// Delete options
delete_option('my_plugin_settings');
delete_option('my_plugin_db_version');

// Delete all options with prefix
global $wpdb;
$wpdb->query(
    "DELETE FROM {$wpdb->options} 
     WHERE option_name LIKE 'my_plugin_%'"
);

// Delete custom database tables
$wpdb->query("DROP TABLE IF EXISTS {$wpdb->prefix}my_plugin_data");
$wpdb->query("DROP TABLE IF EXISTS {$wpdb->prefix}my_plugin_logs");

// Delete user meta
$wpdb->query(
    "DELETE FROM {$wpdb->usermeta} 
     WHERE meta_key LIKE 'my_plugin_%'"
);

// Delete post meta
$wpdb->query(
    "DELETE FROM {$wpdb->postmeta} 
     WHERE meta_key LIKE '_my_plugin_%'"
);

// Remove custom roles
remove_role('shop_manager');

// Remove capabilities from roles
$roles = array('administrator', 'editor');
foreach ($roles as $role_name) {
    $role = get_role($role_name);
    if ($role) {
        $role->remove_cap('manage_shop');
        $role->remove_cap('view_shop_reports');
    }
}

// Delete transients
$wpdb->query(
    "DELETE FROM {$wpdb->options} 
     WHERE option_name LIKE '_transient_my_plugin_%' 
     OR option_name LIKE '_transient_timeout_my_plugin_%'"
);

// Clear any cached data
wp_cache_flush();
```

### register_uninstall_hook Method

```php
// In main plugin file
register_uninstall_hook(__FILE__, 'my_plugin_uninstall');

function my_plugin_uninstall() {
    // Same cleanup code as uninstall.php
    // Note: This runs as a callback, not a standalone file
}
```

## Multisite Considerations

### Network Activation

```php
register_activation_hook(__FILE__, 'my_plugin_activate');

function my_plugin_activate($network_wide) {
    if (is_multisite() && $network_wide) {
        // Activate for all sites in network
        $sites = get_sites(array('number' => 0));
        
        foreach ($sites as $site) {
            switch_to_blog($site->blog_id);
            my_plugin_single_site_activate();
            restore_current_blog();
        }
    } else {
        my_plugin_single_site_activate();
    }
}

function my_plugin_single_site_activate() {
    my_plugin_create_tables();
    my_plugin_add_default_options();
    flush_rewrite_rules();
}

// Handle new sites created after network activation
add_action('wp_insert_site', 'my_plugin_new_site_activation');

function my_plugin_new_site_activation($new_site) {
    if (is_plugin_active_for_network(MY_PLUGIN_BASENAME)) {
        switch_to_blog($new_site->blog_id);
        my_plugin_single_site_activate();
        restore_current_blog();
    }
}
```

## Database Migrations

```php
function my_plugin_check_db_version() {
    $installed_version = get_option('my_plugin_db_version', '0');
    
    if (version_compare($installed_version, MY_PLUGIN_VERSION, '<')) {
        my_plugin_run_migrations($installed_version);
    }
}
add_action('plugins_loaded', 'my_plugin_check_db_version');

function my_plugin_run_migrations($from_version) {
    global $wpdb;
    
    // Migration from 1.0.0 to 1.1.0
    if (version_compare($from_version, '1.1.0', '<')) {
        $wpdb->query(
            "ALTER TABLE {$wpdb->prefix}my_plugin_data 
             ADD COLUMN status varchar(20) DEFAULT 'active'"
        );
    }
    
    // Migration from 1.1.0 to 1.2.0
    if (version_compare($from_version, '1.2.0', '<')) {
        // Add new table
        my_plugin_create_logs_table();
    }
    
    update_option('my_plugin_db_version', MY_PLUGIN_VERSION);
}
```

## Best Practices

1. **Be reversible** - Allow clean deactivation and reactivation
2. **Don't delete on deactivate** - Only on uninstall
3. **Flush rewrite rules** - After CPT registration
4. **Handle multisite** - Network activation properly
5. **Version database schema** - Track and migrate

## Common Pitfalls

- Deleting user data on deactivation
- Not handling multisite activation
- Forgetting to flush rewrite rules
- Not cleaning up on uninstall
- Hardcoded table names (no prefix)

## Exam Tips

- **Know the difference between deactivation and uninstall**: Deactivation (`register_deactivation_hook()`) runs when plugin is deactivated - should clean up temporary data, unschedule events, but keep user data and settings. Uninstall (`uninstall.php` or `register_uninstall_hook()`) runs when plugin is deleted - should remove all data, options, database tables, and files. Deactivation is reversible, uninstall is permanent. Never delete user data on deactivation, only on uninstall.

- **Understand when to use uninstall.php vs register_uninstall_hook**: `uninstall.php` is a standalone file that runs when plugin is deleted via admin. `register_uninstall_hook()` registers a callback function. Use `uninstall.php` for complex cleanup or when you need a separate file. Use `register_uninstall_hook()` for simple cleanup in your main plugin file. Both require checking `defined('WP_UNINSTALL_PLUGIN')` to prevent direct access. `uninstall.php` is more common and recommended.

- **Know how to properly create database tables**: Use `$wpdb->get_charset_collate()` for proper charset/collation. Use `dbDelta()` function which handles table creation and updates safely. Always use `$wpdb->prefix` for table names. Check if table exists before creating. Use proper SQL syntax that `dbDelta()` understands (requires specific format). Create tables in activation hook, but check `$network_wide` for multisite. Always handle errors and provide user feedback.

- **Understand multisite activation handling**: Check `$network_wide` parameter in activation hook. If `true`, plugin is network-activated - you may want to run setup for all sites or just network-level setup. Loop through sites with `get_sites()` and `switch_to_blog()` if needed. Use `get_site_option()` for network-wide settings, `get_option()` for site-specific. Network activation is different from regular activation - handle both cases appropriately.

- **Know what to clean up and when**: On deactivation: unschedule cron events, remove temporary transients, clear object cache entries. Keep: user data, settings, database tables, uploaded files. On uninstall: delete all options (with your prefix), drop custom database tables, remove user meta (if plugin-specific), delete transients, remove scheduled events. Never delete on deactivation what users might want to keep. Always ask for confirmation or provide export before uninstall cleanup.
