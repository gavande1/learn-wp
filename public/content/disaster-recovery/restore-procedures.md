# Restore Procedures

## Overview

Having well-documented and tested restore procedures is critical for disaster recovery. A backup is only useful if you can reliably restore from it. This guide covers WordPress restoration from various backup sources.

## Pre-Restore Checklist

### Assessment

```bash
# 1. Understand the situation
# - What caused the failure?
# - What data was affected?
# - When did the issue occur?

# 2. Determine restore point
# - Latest backup before failure
# - Check backup integrity
# - Estimate data loss

# 3. Prepare environment
# - Available server/hosting
# - Database server access
# - DNS control access
```

### Backup Verification

```bash
# Verify file backup integrity
tar -tzf backup-files.tar.gz | head -20

# Verify database backup
head -100 database-backup.sql
tail -10 database-backup.sql  # Should end with proper statements

# Check backup completeness
grep -c "INSERT INTO" database-backup.sql
```

## Full Site Restoration

### Step 1: Prepare Environment

```bash
# Create new directory structure
mkdir -p /var/www/html/wordpress
cd /var/www/html/wordpress

# Set proper permissions
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html
```

### Step 2: Restore Files

```bash
# Extract file backup
tar -xzf /backups/wordpress-files-YYYYMMDD.tar.gz -C /var/www/html/

# Verify extraction
ls -la /var/www/html/wordpress/

# Fix permissions
find /var/www/html/wordpress -type d -exec chmod 755 {} \;
find /var/www/html/wordpress -type f -exec chmod 644 {} \;
chmod 600 /var/www/html/wordpress/wp-config.php
```

### Step 3: Restore Database

```bash
# Create database if needed
mysql -u root -p << EOF
CREATE DATABASE wordpress;
CREATE USER 'wp_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON wordpress.* TO 'wp_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Restore database
mysql -u root -p wordpress < /backups/database-YYYYMMDD.sql

# Verify restoration
mysql -u root -p -e "SHOW TABLES FROM wordpress;"
mysql -u root -p -e "SELECT COUNT(*) FROM wordpress.wp_posts;"
```

### Step 4: Update Configuration

```php
// Update wp-config.php if needed

// Database credentials
define('DB_NAME', 'wordpress');
define('DB_USER', 'wp_user');
define('DB_PASSWORD', 'secure_password');
define('DB_HOST', 'localhost');

// Update URLs if domain changed
define('WP_HOME', 'https://example.com');
define('WP_SITEURL', 'https://example.com');
```

### Step 5: URL Updates

```bash
# Using WP-CLI (preferred)
wp search-replace 'https://old-domain.com' 'https://new-domain.com' --all-tables

# Or via SQL
mysql -u root -p wordpress << EOF
UPDATE wp_options SET option_value = 'https://new-domain.com' WHERE option_name = 'siteurl';
UPDATE wp_options SET option_value = 'https://new-domain.com' WHERE option_name = 'home';
UPDATE wp_posts SET guid = REPLACE(guid, 'https://old-domain.com', 'https://new-domain.com');
UPDATE wp_posts SET post_content = REPLACE(post_content, 'https://old-domain.com', 'https://new-domain.com');
UPDATE wp_postmeta SET meta_value = REPLACE(meta_value, 'https://old-domain.com', 'https://new-domain.com');
EOF
```

### Step 6: Verify and Test

```bash
# Clear caches
wp cache flush
wp transient delete --all

# Verify site loads
curl -I https://example.com

# Check for errors
tail -f /var/log/apache2/error.log
# or
tail -f /var/log/nginx/error.log
```

## Database-Only Restoration

### Point-in-Time Recovery

```bash
# Restore to specific point using binary logs

# 1. Restore full backup
mysql -u root -p wordpress < full-backup.sql

# 2. Apply binary logs up to point in time
mysqlbinlog --stop-datetime="2024-01-15 14:30:00" \
    /var/lib/mysql/mysql-bin.000001 \
    /var/lib/mysql/mysql-bin.000002 | \
    mysql -u root -p wordpress
```

### Partial Table Restoration

```bash
# Extract specific tables from backup
sed -n '/^-- Table structure for table `wp_posts`/,/^-- Table structure for table `/p' \
    full-backup.sql > wp_posts_only.sql

# Restore specific table
mysql -u root -p wordpress < wp_posts_only.sql
```

### Using mysqldump for Single Table

```bash
# If backup was created with --single-transaction
mysql -u root -p wordpress << EOF
DROP TABLE IF EXISTS wp_posts;
SOURCE /backups/wp_posts_backup.sql;
EOF
```

## Partial Content Recovery

### Restore Specific Posts

```php
/**
 * Restore posts from backup database
 */
function restore_posts_from_backup($post_ids) {
    global $wpdb;
    
    // Connect to backup database
    $backup_db = new wpdb(
        'backup_user',
        'backup_pass',
        'wordpress_backup',
        'backup-server'
    );
    
    foreach ($post_ids as $post_id) {
        // Get post from backup
        $post = $backup_db->get_row($backup_db->prepare(
            "SELECT * FROM wp_posts WHERE ID = %d",
            $post_id
        ), ARRAY_A);
        
        if (!$post) {
            continue;
        }
        
        // Check if post exists in current DB
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT ID FROM {$wpdb->posts} WHERE ID = %d",
            $post_id
        ));
        
        if ($existing) {
            // Update existing
            $wpdb->update($wpdb->posts, $post, array('ID' => $post_id));
        } else {
            // Insert new
            $wpdb->insert($wpdb->posts, $post);
        }
        
        // Restore post meta
        $meta = $backup_db->get_results($backup_db->prepare(
            "SELECT * FROM wp_postmeta WHERE post_id = %d",
            $post_id
        ), ARRAY_A);
        
        // Delete current meta and insert backup meta
        $wpdb->delete($wpdb->postmeta, array('post_id' => $post_id));
        foreach ($meta as $row) {
            $wpdb->insert($wpdb->postmeta, $row);
        }
    }
}
```

### Restore Specific Media

```bash
# Restore specific uploads directory
tar -xzf media-backup.tar.gz -C /var/www/html/wordpress/wp-content/uploads/ \
    --strip-components=1 2024/01/

# Regenerate thumbnails
wp media regenerate --yes
```

## Automated Restoration Script

```bash
#!/bin/bash
# restore-wordpress.sh

# Configuration
BACKUP_DIR="/backups"
RESTORE_DIR="/var/www/html/wordpress"
DB_NAME="wordpress"
DB_USER="wp_user"
DB_PASS="password"
DATE="${1:-$(date +%Y%m%d)}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check backups exist
log "Checking backups..."
FILE_BACKUP="$BACKUP_DIR/wordpress-files-$DATE.tar.gz"
DB_BACKUP="$BACKUP_DIR/wordpress-db-$DATE.sql.gz"

[[ -f "$FILE_BACKUP" ]] || error "File backup not found: $FILE_BACKUP"
[[ -f "$DB_BACKUP" ]] || error "Database backup not found: $DB_BACKUP"

# Create restore directory
log "Preparing restore directory..."
rm -rf "$RESTORE_DIR"
mkdir -p "$RESTORE_DIR"

# Restore files
log "Restoring files..."
tar -xzf "$FILE_BACKUP" -C "$RESTORE_DIR" --strip-components=1
[[ $? -eq 0 ]] || error "File restoration failed"

# Set permissions
log "Setting permissions..."
chown -R www-data:www-data "$RESTORE_DIR"
find "$RESTORE_DIR" -type d -exec chmod 755 {} \;
find "$RESTORE_DIR" -type f -exec chmod 644 {} \;
chmod 600 "$RESTORE_DIR/wp-config.php"

# Restore database
log "Restoring database..."
mysql -u"$DB_USER" -p"$DB_PASS" -e "DROP DATABASE IF EXISTS $DB_NAME; CREATE DATABASE $DB_NAME;"
gunzip -c "$DB_BACKUP" | mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME"
[[ $? -eq 0 ]] || error "Database restoration failed"

# Clear caches
log "Clearing caches..."
cd "$RESTORE_DIR"
wp cache flush --allow-root 2>/dev/null
wp transient delete --all --allow-root 2>/dev/null

# Verify restoration
log "Verifying restoration..."
POST_COUNT=$(mysql -u"$DB_USER" -p"$DB_PASS" -N -e "SELECT COUNT(*) FROM $DB_NAME.wp_posts;")
log "Posts in database: $POST_COUNT"

# Test site
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
if [[ "$HTTP_CODE" == "200" ]]; then
    log "Site responding with HTTP 200"
else
    error "Site not responding correctly (HTTP $HTTP_CODE)"
fi

log "Restoration complete!"
```

## Testing Restore Procedures

```bash
#!/bin/bash
# test-restore.sh - Regular restore testing

# Create test environment
TEST_DIR="/tmp/restore-test-$(date +%s)"
mkdir -p "$TEST_DIR"

# Run restore to test environment
./restore-wordpress.sh "$TEST_DIR"

# Verify content
wp post list --path="$TEST_DIR" --format=count
wp user list --path="$TEST_DIR" --format=count
wp plugin list --path="$TEST_DIR" --format=count
wp theme list --path="$TEST_DIR" --format=count

# Run integration tests
wp eval 'echo is_blog_installed() ? "OK" : "FAIL";' --path="$TEST_DIR"

# Cleanup
rm -rf "$TEST_DIR"

echo "Restore test completed successfully"
```

## Recovery Time Objective (RTO)

```bash
# Document expected restore times

# Small site (< 1GB)
# - File restore: 5-10 minutes
# - Database restore: 2-5 minutes
# - Total RTO: 15-30 minutes

# Medium site (1-10GB)
# - File restore: 15-30 minutes
# - Database restore: 5-15 minutes
# - Total RTO: 30-60 minutes

# Large site (> 10GB)
# - File restore: 30-60+ minutes
# - Database restore: 15-30+ minutes
# - Total RTO: 1-2+ hours
```

## Post-Restoration Checklist

```markdown
## Post-Restore Verification

### Immediate Checks
- [ ] Site loads without errors
- [ ] Admin login works
- [ ] Database connection verified
- [ ] File permissions correct
- [ ] SSL certificate valid

### Content Verification
- [ ] Sample posts display correctly
- [ ] Images load properly
- [ ] Media library accessible
- [ ] Comments present
- [ ] User accounts intact

### Functionality Tests
- [ ] Contact forms work
- [ ] E-commerce checkout (if applicable)
- [ ] User registration
- [ ] Search functionality
- [ ] Caching working

### Performance Check
- [ ] Page load times acceptable
- [ ] No database errors in logs
- [ ] Memory usage normal
- [ ] CPU usage normal

### Security Verification
- [ ] Security plugins active
- [ ] Admin users verified
- [ ] No unauthorized users
- [ ] File integrity check
```

## Best Practices

1. **Document procedures** - Step-by-step guides
2. **Test regularly** - Monthly restore tests
3. **Automate** - Scripted restoration
4. **Time your restores** - Know your RTO
5. **Verify backups** - Test backup integrity
6. **Keep multiple copies** - Different locations

## Common Pitfalls

- Not testing restores regularly
- Missing wp-config.php in backup
- Forgetting to update URLs
- Incorrect file permissions
- Not clearing caches after restore

## Exam Tips

- **Know full restoration process**: Restore files to server (via FTP, SSH, hosting panel). Import database (via phpMyAdmin, WP-CLI, or command line). Update `wp-config.php` with correct database credentials. Update URLs if domain changed (`wp search-replace`). Clear caches. Test site functionality. Understanding full process enables successful complete site restoration.

- **Understand partial restoration options**: Can restore only database (keep current files). Can restore only files (keep current database). Can restore specific tables. Can restore specific post types or date ranges. Useful for recovering specific data without full restore. Understanding partial options enables targeted recovery and reduces downtime.

- **Know WP-CLI restore commands**: `wp db import backup.sql` imports database. `wp search-replace old-url new-url` updates URLs. `wp cache flush` clears caches. `wp rewrite flush` flushes rewrite rules. Useful for automated restores and URL updates. Understanding WP-CLI enables efficient, scriptable restore procedures.

- **Understand RTO concepts**: RTO (Recovery Time Objective) is maximum acceptable downtime. RPO (Recovery Point Objective) is maximum acceptable data loss. Different sites have different requirements. Critical sites need low RTO/RPO (minutes, real-time backups). Less critical sites can have higher RTO/RPO (hours, daily backups). Understanding RTO/RPO helps design appropriate backup and recovery strategy.

- **Know post-restore verification steps**: Verify site loads correctly. Check admin access works. Verify posts/pages display. Check media files load. Test critical functionality (forms, e-commerce). Check for broken links or missing images. Verify database integrity. Understanding verification ensures restore was successful and site is fully functional.
