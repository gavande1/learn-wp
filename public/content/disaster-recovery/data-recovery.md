# Data Recovery

## Overview

Data recovery involves retrieving lost or corrupted data when backups are unavailable or incomplete. This includes recovering from accidental deletions, database corruption, and partial data loss scenarios.

## Types of Data Loss

### Accidental Deletion

```php
// Common scenarios:
// - Post deleted by mistake
// - Plugin bulk delete error
// - User account removed
// - Media files deleted

// WordPress keeps trash for 30 days by default
// Check trash first
```

### Database Corruption

```bash
# Signs of corruption:
# - Partial page loads
# - "Table doesn't exist" errors
# - Query errors
# - Missing data

# Check table status
mysqlcheck -u root -p --check wordpress
```

### File System Issues

```bash
# Common issues:
# - Deleted uploads
# - Corrupted theme files
# - Missing plugin files
# - Permission problems
```

## Recovering Deleted Posts

### From Trash

```php
// Posts are in trash for 30 days
// Admin: Posts > Trash > Restore

// Via WP-CLI
wp post list --post_status=trash
wp post update <post_id> --post_status=publish

// Bulk restore from trash
wp post list --post_status=trash --format=ids | xargs wp post update --post_status=draft
```

### From Revisions

```php
// WordPress keeps post revisions
// Admin: Edit Post > Revisions

// Via database
SELECT * FROM wp_posts 
WHERE post_type = 'revision' 
AND post_parent = <original_post_id>
ORDER BY post_date DESC;

// Restore revision
$revision = get_post(<revision_id>);
wp_update_post(array(
    'ID' => $revision->post_parent,
    'post_content' => $revision->post_content,
    'post_title' => $revision->post_title,
));
```

### From Backup Database

```php
/**
 * Recover posts from backup database
 */
function recover_deleted_posts($since_date) {
    global $wpdb;
    
    // Connect to backup database
    $backup_db = new wpdb(
        'backup_user',
        'backup_pass', 
        'wordpress_backup',
        'backup-host'
    );
    
    // Find posts in backup that don't exist in current
    $backup_posts = $backup_db->get_results(
        "SELECT * FROM wp_posts WHERE post_date >= '$since_date'"
    );
    
    $recovered = 0;
    foreach ($backup_posts as $post) {
        $exists = $wpdb->get_var($wpdb->prepare(
            "SELECT ID FROM {$wpdb->posts} WHERE ID = %d",
            $post->ID
        ));
        
        if (!$exists) {
            // Recover the post
            $wpdb->insert($wpdb->posts, (array) $post);
            
            // Recover post meta
            $meta = $backup_db->get_results($backup_db->prepare(
                "SELECT * FROM wp_postmeta WHERE post_id = %d",
                $post->ID
            ));
            
            foreach ($meta as $m) {
                $wpdb->insert($wpdb->postmeta, (array) $m);
            }
            
            $recovered++;
        }
    }
    
    return $recovered;
}
```

## Database Repair

### MySQL Repair Tools

```bash
# Check all tables
mysqlcheck -u root -p --check wordpress

# Repair all tables
mysqlcheck -u root -p --repair wordpress

# Repair specific table
mysqlcheck -u root -p --repair wordpress wp_posts

# Optimize after repair
mysqlcheck -u root -p --optimize wordpress
```

### Using WordPress Database Repair

```php
// Enable in wp-config.php
define('WP_ALLOW_REPAIR', true);

// Visit: https://example.com/wp-admin/maint/repair.php

// Options:
// - Repair Database
// - Repair and Optimize Database

// IMPORTANT: Remove after repair
// define('WP_ALLOW_REPAIR', false);
```

### Manual Table Repair

```sql
-- Check table status
CHECK TABLE wp_posts;
CHECK TABLE wp_postmeta;
CHECK TABLE wp_options;

-- Repair corrupted tables
REPAIR TABLE wp_posts;
REPAIR TABLE wp_postmeta EXTENDED;

-- Force repair for InnoDB (copy and recreate)
ALTER TABLE wp_posts ENGINE=InnoDB;

-- Rebuild indexes
ALTER TABLE wp_posts DROP INDEX post_name, ADD INDEX post_name (post_name);
```

## Recovering Media Files

### From Server Backup

```bash
# Check if files exist in backup
tar -tzf backup.tar.gz | grep "wp-content/uploads/2024/01/"

# Extract specific files
tar -xzf backup.tar.gz -C /restore/ \
    --wildcards "*/wp-content/uploads/2024/01/*"

# Copy to live site
rsync -avz /restore/wp-content/uploads/ /var/www/html/wp-content/uploads/
```

### Regenerate Missing Thumbnails

```bash
# Regenerate all thumbnails
wp media regenerate --yes

# Regenerate specific image
wp media regenerate <attachment_id>

# Only missing sizes
wp media regenerate --only-missing --yes
```

### Recover from CDN

```php
/**
 * Download images back from CDN
 */
function recover_from_cdn($cdn_url, $local_path) {
    global $wpdb;
    
    $attachments = $wpdb->get_results(
        "SELECT * FROM {$wpdb->posts} WHERE post_type = 'attachment'"
    );
    
    foreach ($attachments as $attachment) {
        $file = get_attached_file($attachment->ID);
        
        if (!file_exists($file)) {
            $remote_url = str_replace(
                wp_upload_dir()['baseurl'],
                $cdn_url,
                wp_get_attachment_url($attachment->ID)
            );
            
            $content = file_get_contents($remote_url);
            if ($content) {
                wp_mkdir_p(dirname($file));
                file_put_contents($file, $content);
                echo "Recovered: {$file}\n";
            }
        }
    }
}
```

## Recovering User Data

### From Database Backup

```sql
-- Find users in backup
SELECT * FROM wp_backup.wp_users 
WHERE user_registered >= '2024-01-01';

-- Compare with current
SELECT b.ID, b.user_login, b.user_email
FROM wp_backup.wp_users b
LEFT JOIN wp_users u ON b.ID = u.ID
WHERE u.ID IS NULL;

-- Restore missing users
INSERT INTO wp_users 
SELECT * FROM wp_backup.wp_users 
WHERE ID NOT IN (SELECT ID FROM wp_users);

-- Restore user meta
INSERT INTO wp_usermeta
SELECT * FROM wp_backup.wp_usermeta
WHERE user_id NOT IN (SELECT user_id FROM wp_usermeta);
```

### Password Recovery

```php
// Reset password via WP-CLI
wp user update <user_id> --user_pass="new_password"

// Or generate reset link
$key = get_password_reset_key(get_user_by('id', $user_id));
$url = network_site_url("wp-login.php?action=rp&key=$key&login=" . rawurlencode($user->user_login));
```

## Recovering Plugin/Theme Settings

### From Options Table

```php
// Plugin settings often stored in wp_options
$settings = $backup_db->get_row(
    "SELECT * FROM wp_options WHERE option_name = 'my_plugin_settings'"
);

if ($settings) {
    update_option('my_plugin_settings', maybe_unserialize($settings->option_value));
}
```

### From Theme Mods

```php
// Theme settings
$theme_mods = $backup_db->get_var($backup_db->prepare(
    "SELECT option_value FROM wp_options WHERE option_name = %s",
    'theme_mods_' . get_stylesheet()
));

if ($theme_mods) {
    update_option('theme_mods_' . get_stylesheet(), maybe_unserialize($theme_mods));
}
```

## Binary Log Recovery

```bash
# MySQL binary logs enable point-in-time recovery

# Enable binary logging in my.cnf
# [mysqld]
# log_bin = /var/log/mysql/mysql-bin.log
# expire_logs_days = 14

# List binary logs
mysqlbinlog --no-defaults /var/log/mysql/mysql-bin.000001

# Find specific transaction
mysqlbinlog --no-defaults /var/log/mysql/mysql-bin.000001 | grep -A10 "DELETE FROM wp_posts"

# Recover to point before deletion
mysqlbinlog --no-defaults --stop-datetime="2024-01-15 14:30:00" \
    /var/log/mysql/mysql-bin.000001 | mysql -u root -p wordpress
```

## Data Recovery Tools

### WordPress Database Recovery Script

```php
<?php
/**
 * Emergency data recovery script
 * Place in WordPress root, run, then delete
 */

require_once 'wp-load.php';

// Only run for admins
if (!current_user_can('manage_options')) {
    wp_die('Unauthorized');
}

class Emergency_Recovery {
    
    private $backup_db;
    private $log = array();
    
    public function __construct($backup_config) {
        $this->backup_db = new wpdb(
            $backup_config['user'],
            $backup_config['pass'],
            $backup_config['name'],
            $backup_config['host']
        );
    }
    
    public function compare_tables() {
        global $wpdb;
        
        $current_tables = $wpdb->get_col("SHOW TABLES");
        $backup_tables = $this->backup_db->get_col("SHOW TABLES");
        
        return array(
            'missing' => array_diff($backup_tables, $current_tables),
            'extra' => array_diff($current_tables, $backup_tables),
        );
    }
    
    public function count_differences($table) {
        global $wpdb;
        
        $current = $wpdb->get_var("SELECT COUNT(*) FROM {$table}");
        $backup = $this->backup_db->get_var("SELECT COUNT(*) FROM {$table}");
        
        return array(
            'current' => $current,
            'backup' => $backup,
            'difference' => $backup - $current,
        );
    }
    
    public function recover_table($table, $mode = 'append') {
        global $wpdb;
        
        if ($mode === 'replace') {
            $wpdb->query("TRUNCATE TABLE {$table}");
        }
        
        $rows = $this->backup_db->get_results("SELECT * FROM {$table}", ARRAY_A);
        
        foreach ($rows as $row) {
            if ($mode === 'append') {
                // Only insert if not exists
                $wpdb->replace($table, $row);
            } else {
                $wpdb->insert($table, $row);
            }
        }
        
        return count($rows);
    }
    
    public function get_log() {
        return $this->log;
    }
}

// Usage
if (isset($_POST['recover'])) {
    $recovery = new Emergency_Recovery(array(
        'host' => 'backup-server',
        'user' => 'backup_user',
        'pass' => 'backup_pass',
        'name' => 'wordpress_backup',
    ));
    
    // Compare
    $diff = $recovery->compare_tables();
    print_r($diff);
    
    // Recover specific table
    $recovered = $recovery->recover_table('wp_posts', 'append');
    echo "Recovered {$recovered} posts";
}
```

## Prevention Measures

### Soft Delete Implementation

```php
/**
 * Implement soft delete instead of permanent deletion
 */
function soft_delete_post($post_id) {
    update_post_meta($post_id, '_deleted', current_time('mysql'));
    update_post_meta($post_id, '_deleted_by', get_current_user_id());
    
    // Hide from queries
    wp_update_post(array(
        'ID' => $post_id,
        'post_status' => 'trash',
    ));
}

// Filter to hide soft-deleted posts
add_action('pre_get_posts', function($query) {
    if (!is_admin() && $query->is_main_query()) {
        $query->set('meta_query', array(
            array(
                'key' => '_deleted',
                'compare' => 'NOT EXISTS',
            ),
        ));
    }
});

// Recovery function
function recover_soft_deleted($post_id) {
    delete_post_meta($post_id, '_deleted');
    delete_post_meta($post_id, '_deleted_by');
    
    wp_update_post(array(
        'ID' => $post_id,
        'post_status' => 'publish',
    ));
}
```

### Audit Logging

```php
/**
 * Log all deletions for recovery
 */
add_action('before_delete_post', function($post_id) {
    $post = get_post($post_id);
    $meta = get_post_meta($post_id);
    
    // Store in separate table or external service
    global $wpdb;
    $wpdb->insert(
        $wpdb->prefix . 'deletion_log',
        array(
            'post_id' => $post_id,
            'post_data' => serialize($post),
            'meta_data' => serialize($meta),
            'deleted_by' => get_current_user_id(),
            'deleted_at' => current_time('mysql'),
        )
    );
});
```

## Best Practices

1. **Act quickly** - Less time = better recovery chance
2. **Don't overwrite** - Avoid writing to affected disk
3. **Document everything** - Track recovery steps
4. **Test first** - Restore to test environment
5. **Prevent future loss** - Implement safeguards
6. **Regular backups** - Best recovery is prevention

## Common Pitfalls

- Waiting too long to start recovery
- Overwriting data during recovery attempts
- Not verifying recovered data integrity
- Skipping post-recovery testing
- Not implementing prevention measures

## Exam Tips

- **Know recovery options for different scenarios**: Accidental deletion: restore from backup or trash (if available). Database corruption: use `REPAIR TABLE` or restore from backup. Partial data loss: restore specific tables or date ranges. File corruption: restore files from backup. Different scenarios require different recovery approaches. Understanding options helps choose appropriate recovery method for each situation.

- **Understand MySQL repair tools**: `REPAIR TABLE table_name` attempts to repair corrupted table. `CHECK TABLE` checks table integrity. `OPTIMIZE TABLE` optimizes and may fix issues. Use `myisamchk` or `innodb_force_recovery` for severe corruption. Always backup before repair attempts. Understanding repair tools helps recover from database corruption when backups aren't available.

- **Know how to recover from binary logs**: MySQL binary logs record all database changes. Can replay logs to recover data up to point of failure. Requires binary logging enabled. Use `mysqlbinlog` to extract and replay transactions. More granular than full backup restore. Understanding binary logs enables point-in-time recovery for specific data or timeframes.

- **Understand soft delete patterns**: Soft delete marks records as deleted instead of actually deleting. Allows recovery from application (restore from trash). WordPress uses this for posts (trash). Implement for custom data when recovery is important. Trade-off: uses more storage but enables easy recovery. Understanding soft delete helps design recoverable data structures.

- **Know WP-CLI recovery commands**: `wp post restore $id` restores from trash. `wp db repair` attempts database repair. `wp db optimize` optimizes database. `wp cache flush` clears caches that might show stale data. Useful for quick recovery operations. Understanding WP-CLI enables efficient recovery without manual database access.
