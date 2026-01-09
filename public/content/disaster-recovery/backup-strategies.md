# Backup Strategies

## Overview

A robust backup strategy is essential for WordPress sites. Understanding what to back up, how often, and how to restore is critical for disaster recovery.

## What to Back Up

### Complete Backup Includes

1. **Database** - All WordPress tables
2. **wp-content folder** - Themes, plugins, uploads
3. **wp-config.php** - Configuration
4. **.htaccess** - Server configuration
5. **Custom files** - Any modifications

### Database Tables

```sql
-- Core WordPress tables
wp_posts, wp_postmeta
wp_comments, wp_commentmeta
wp_users, wp_usermeta
wp_options
wp_terms, wp_termmeta, wp_term_taxonomy, wp_term_relationships
wp_links

-- Plugin tables (vary by plugin)
```

## Backup Methods

### WP-CLI Backup

```bash
# Database backup
wp db export backup.sql

# Full site backup with database
wp db export - | gzip > database.sql.gz

# Export specific tables
wp db export --tables=wp_posts,wp_postmeta backup.sql
```

### Manual Database Backup

```bash
# Using mysqldump
mysqldump -u username -p database_name > backup.sql

# Compressed backup
mysqldump -u username -p database_name | gzip > backup.sql.gz
```

### File Backup

```bash
# Backup wp-content
tar -czf wp-content-backup.tar.gz wp-content/

# Backup entire site
tar -czf full-backup.tar.gz /var/www/wordpress/
```

## Backup Schedule

| Content Type | Frequency |
|--------------|-----------|
| Database | Daily |
| Uploads | Daily (incremental) |
| Themes/Plugins | Weekly |
| Full Site | Weekly |

## Backup Storage

### 3-2-1 Rule

- **3** copies of data
- **2** different storage types
- **1** offsite location

### Storage Options

- Local server storage
- Cloud storage (S3, Google Cloud)
- External backup service
- Physical media (tape, drives)

## Automated Backups

```php
// Schedule backup via WP-Cron
add_action('my_daily_backup', 'run_daily_backup');

if (!wp_next_scheduled('my_daily_backup')) {
    wp_schedule_event(time(), 'daily', 'my_daily_backup');
}

function run_daily_backup() {
    // Trigger backup process
    // Upload to remote storage
}
```

## Testing Backups

```bash
# Verify backup integrity
gunzip -t backup.sql.gz

# Test restore on staging
mysql -u user -p staging_db < backup.sql
```

## Best Practices

1. **Automate backups** - Don't rely on manual process
2. **Test restores regularly** - Backups are useless if they don't work
3. **Store offsite** - Protect against physical disasters
4. **Encrypt sensitive data** - Protect backups in transit and at rest
5. **Document procedures** - Recovery should be possible by anyone

## Exam Tips

- **Know what needs to be backed up**: WordPress files (core, themes, plugins, uploads), database (all tables), `wp-config.php` (contains configuration). Uploads directory is critical (user content). Database contains all content, settings, users. Both files and database are needed for complete restore. Understanding what to backup ensures nothing is missed during recovery.

- **Understand backup frequency requirements**: Frequency depends on update frequency and data criticality. Daily backups for active sites. Real-time backups for high-traffic sites. Before major updates (WordPress, plugins, themes). Balance between backup frequency and storage costs. More frequent backups reduce data loss but increase storage and processing. Understanding frequency helps design appropriate backup schedule.

- **Know WP-CLI backup commands**: `wp db export` exports database. `wp db import` imports database. `wp core download` downloads WordPress. Can automate backups with cron and WP-CLI. Useful for programmatic backups and automation. Understanding WP-CLI enables automated backup workflows and scripting backup processes.

- **Understand the 3-2-1 backup rule**: 3 copies of data (original + 2 backups), 2 different media types (e.g., disk + cloud), 1 offsite copy. Provides redundancy against multiple failure scenarios. Industry standard for backup strategy. Understanding 3-2-1 rule helps design robust backup strategy that survives various disaster scenarios.

- **Know how to verify backup integrity**: Test restores regularly (monthly or quarterly). Verify backup file integrity (checksums, file size). Test on staging environment before relying on backups. Verify database can be imported. Verify files are complete. Understanding verification ensures backups actually work when needed - untested backups may not restore successfully.
