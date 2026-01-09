# Multisite

## Overview

WordPress Multisite allows you to run multiple WordPress sites from a single installation. It's ideal for networks of related sites, universities, franchises, or agencies managing multiple client sites.

## Key Concepts

### Architecture

- **Network** - The entire multisite installation
- **Sites** - Individual blogs/sites within the network
- **Super Admin** - Administrator of the entire network
- **Site Admin** - Administrator of a single site

### Database Structure

```
wp_blogs          - List of all sites
wp_site           - Network information
wp_sitemeta       - Network-wide options

Per-site tables (site ID = 2):
wp_2_posts
wp_2_postmeta
wp_2_options
wp_2_users (shared, but with site-specific caps)
```

## When to Use Multisite

### Good Use Cases

- Network of related sites (university departments)
- Multi-language sites (separate content per language)
- Franchise websites
- SaaS-style WordPress hosting

### When NOT to Use

- Sites with completely different purposes
- Sites requiring different plugins
- High-traffic independent sites
- When simple WordPress installs would suffice

## Setting Up Multisite

### Step 1: Enable Multisite

```php
// In wp-config.php (before "That's all, stop editing!")
define('WP_ALLOW_MULTISITE', true);
```

### Step 2: Run Network Setup

Go to Tools > Network Setup and follow instructions.

### Step 3: Update wp-config.php

```php
define('MULTISITE', true);
define('SUBDOMAIN_INSTALL', false);  // true for subdomain, false for subdirectory
define('DOMAIN_CURRENT_SITE', 'example.com');
define('PATH_CURRENT_SITE', '/');
define('SITE_ID_CURRENT_SITE', 1);
define('BLOG_ID_CURRENT_SITE', 1);
```

### Step 4: Update .htaccess

```apache
# Multisite subdirectory rules
RewriteEngine On
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
RewriteBase /
RewriteRule ^index\.php$ - [L]

# Skip real files and directories
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
```

## Multisite Functions

### Switching Between Sites

```php
// Switch to site ID 2
switch_to_blog(2);

// Do something on that site
$posts = get_posts(array('numberposts' => 5));

// ALWAYS restore!
restore_current_blog();

// Alternative: Use closure
switch_to_blog(2);
try {
    // Your code here
} finally {
    restore_current_blog();
}
```

### Getting Site Information

```php
// Get current site ID
$current_site_id = get_current_blog_id();

// Get all sites
$sites = get_sites(array(
    'number' => 100,
    'public' => 1
));

// Get specific site info
$site = get_site(2);
echo $site->blogname;
echo $site->siteurl;

// Get site option
$option = get_blog_option(2, 'blogname');
```

### Network-Wide Options

```php
// Get network option
$value = get_site_option('network_setting');

// Update network option
update_site_option('network_setting', 'value');

// Delete network option
delete_site_option('network_setting');
```

## Creating Sites Programmatically

```php
// Create a new site
$site_id = wp_insert_site(array(
    'domain' => 'example.com',
    'path' => '/newsite/',
    'title' => 'New Site',
    'user_id' => 1,  // Super admin ID
    'options' => array(
        'blogdescription' => 'A new site in the network'
    )
));

if (is_wp_error($site_id)) {
    echo 'Error: ' . $site_id->get_error_message();
}
```

## Network Admin Hooks

```php
// Hook into network admin
add_action('network_admin_menu', 'my_network_admin_menu');

function my_network_admin_menu() {
    add_menu_page(
        'Network Settings',
        'My Network Plugin',
        'manage_network_options',
        'my-network-plugin',
        'my_network_settings_page'
    );
}
```

## Plugin and Theme Activation

### Network Activation

```php
// Check if network activated
if (is_plugin_active_for_network('my-plugin/my-plugin.php')) {
    // Plugin is network activated
}

// Network activation hook
register_activation_hook(__FILE__, 'my_plugin_network_activate');

function my_plugin_network_activate($network_wide) {
    if ($network_wide && is_multisite()) {
        // Run activation for all sites
        $sites = get_sites();
        foreach ($sites as $site) {
            switch_to_blog($site->blog_id);
            my_plugin_single_activate();
            restore_current_blog();
        }
    } else {
        my_plugin_single_activate();
    }
}
```

### Theme Restrictions

```php
// Allow only specific themes network-wide
// Network Admin > Themes > Network Enable
```

## Domain Mapping

```php
// In wp-config.php for domain mapping
define('COOKIE_DOMAIN', '');
define('ADMIN_COOKIE_PATH', '/');
define('COOKIEPATH', '/');
define('SITECOOKIEPATH', '/');

// Sunrise.php for advanced domain mapping
define('SUNRISE', true);
```

## Best Practices

1. **Plan database structure** - Shared tables affect all sites
2. **Use network options wisely** - Don't store site-specific data
3. **Handle site switching carefully** - Always restore_current_blog()
4. **Test plugin compatibility** - Not all plugins support multisite
5. **Consider performance** - Large networks need optimization

## Limitations

- Plugins are shared (can't have different versions per site)
- Themes are shared
- User table is shared
- Uploads are in site-specific folders
- Some plugins don't support multisite

## Common Pitfalls

- Forgetting to call `restore_current_blog()`
- Not testing plugins for multisite compatibility
- Performance issues with large networks
- Complex domain mapping configurations
- Backup complexity

## Exam Tips

- **Know when multisite is appropriate vs separate installs**: Multisite is good for related sites that share plugins/themes, need centralized management, or are part of a network (universities, franchises). Use separate installs when sites have different purposes, need different plugins, require high performance, or need complete isolation. Multisite shares resources but limits flexibility.

- **Understand the database structure**: Multisite uses shared tables (`wp_blogs`, `wp_site`, `wp_sitemeta`) for network data, and site-specific tables with numeric prefixes (e.g., `wp_2_posts` for site ID 2). The main site uses tables without prefixes. Users table is shared across all sites, but capabilities are site-specific. Understanding this helps with queries and data management.

- **Know how to switch between sites safely**: Always use `switch_to_blog($site_id)` and `restore_current_blog()` in pairs. Never forget to restore, as it can cause data corruption or queries running on the wrong site. Use try-finally blocks or ensure restore happens in all code paths. Global variables and database queries are affected by switching.

- **Understand network vs site options**: Network options (using `get_site_option()`, `update_site_option()`) are shared across all sites in the network and stored in `wp_sitemeta`. Site options (using `get_option()`, `update_option()`) are specific to each site and stored in site-specific `wp_X_options` tables. Use network options for network-wide settings, site options for site-specific configuration.

- **Know plugin/theme network activation**: Network activation makes a plugin/theme available to all sites and runs activation hooks network-wide. Use `is_plugin_active_for_network()` to check network activation status. In activation hooks, check `$network_wide` parameter and loop through all sites if needed. Network-activated plugins can't be deactivated per-site.

- **Understand Super Admin vs Site Admin roles**: Super Admin (multisite only) has full control over the entire network, including network settings, site creation, and plugin/theme management. Site Admin has full control over a single site but can't access network settings or manage other sites. Super Admin capabilities are checked with `is_super_admin()`, not regular capability checks.
