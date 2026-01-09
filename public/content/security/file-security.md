# File Security

## Overview

File security in WordPress involves protecting uploads, preventing unauthorized access to sensitive files, and safely handling file operations. Proper file security prevents code execution attacks and data leakage.

## Upload Security

### Validating File Types

```php
// Check file type on upload
add_filter('wp_handle_upload_prefilter', 'validate_upload_type');

function validate_upload_type($file) {
    // Get file info
    $filetype = wp_check_filetype($file['name']);
    $ext = $filetype['ext'];
    $type = $filetype['type'];
    
    // Allowed extensions
    $allowed = array('jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx');
    
    if (!in_array(strtolower($ext), $allowed)) {
        $file['error'] = 'This file type is not allowed.';
        return $file;
    }
    
    // Verify MIME type matches extension
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $real_type = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    $mime_map = array(
        'jpg' => array('image/jpeg'),
        'jpeg' => array('image/jpeg'),
        'png' => array('image/png'),
        'gif' => array('image/gif'),
        'pdf' => array('application/pdf'),
    );
    
    if (isset($mime_map[$ext]) && !in_array($real_type, $mime_map[$ext])) {
        $file['error'] = 'File type does not match extension.';
    }
    
    return $file;
}
```

### Restricting Upload Locations

```php
// Ensure uploads go to proper directory
add_filter('upload_dir', 'custom_upload_dir');

function custom_upload_dir($dirs) {
    // Don't allow path traversal
    if (isset($_POST['custom_dir'])) {
        $custom = sanitize_file_name($_POST['custom_dir']);
        // Ensure it's within uploads
        $dirs['subdir'] = '/' . $custom;
        $dirs['path'] = $dirs['basedir'] . $dirs['subdir'];
        $dirs['url'] = $dirs['baseurl'] . $dirs['subdir'];
    }
    return $dirs;
}
```

### File Size Limits

```php
// Limit upload file size
add_filter('upload_size_limit', 'custom_upload_size_limit');

function custom_upload_size_limit($size) {
    // 5MB for regular users
    if (!current_user_can('manage_options')) {
        return 5 * MB_IN_BYTES;
    }
    // 50MB for admins
    return 50 * MB_IN_BYTES;
}
```

## Safe File Operations

### Secure File Reading

```php
// Safe file read with path validation
function safe_read_file($file_path) {
    // Get real path to prevent traversal
    $real_path = realpath($file_path);
    
    if (!$real_path) {
        return new WP_Error('invalid_path', 'File not found');
    }
    
    // Ensure file is within allowed directory
    $upload_dir = wp_upload_dir();
    $allowed_base = realpath($upload_dir['basedir']);
    
    if (strpos($real_path, $allowed_base) !== 0) {
        return new WP_Error('access_denied', 'Access to this file is not allowed');
    }
    
    // Check file exists and is readable
    if (!is_file($real_path) || !is_readable($real_path)) {
        return new WP_Error('read_error', 'Cannot read file');
    }
    
    return file_get_contents($real_path);
}
```

### Secure File Writing

```php
// Safe file write
function safe_write_file($filename, $content, $dir = '') {
    // Sanitize filename
    $filename = sanitize_file_name($filename);
    
    // Use uploads directory by default
    if (empty($dir)) {
        $upload_dir = wp_upload_dir();
        $dir = $upload_dir['path'];
    }
    
    // Validate directory
    $real_dir = realpath($dir);
    $upload_base = realpath(wp_upload_dir()['basedir']);
    
    if (!$real_dir || strpos($real_dir, $upload_base) !== 0) {
        return new WP_Error('invalid_dir', 'Invalid directory');
    }
    
    $file_path = trailingslashit($real_dir) . $filename;
    
    // Use WordPress filesystem
    global $wp_filesystem;
    if (empty($wp_filesystem)) {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        WP_Filesystem();
    }
    
    if (!$wp_filesystem->put_contents($file_path, $content, FS_CHMOD_FILE)) {
        return new WP_Error('write_error', 'Failed to write file');
    }
    
    return $file_path;
}
```

### Secure File Deletion

```php
// Safe file deletion
function safe_delete_file($file_path) {
    $real_path = realpath($file_path);
    
    if (!$real_path) {
        return new WP_Error('not_found', 'File not found');
    }
    
    // Verify file is in uploads directory
    $upload_dir = wp_upload_dir();
    $allowed_base = realpath($upload_dir['basedir']);
    
    if (strpos($real_path, $allowed_base) !== 0) {
        return new WP_Error('access_denied', 'Cannot delete this file');
    }
    
    // Use WordPress function
    return wp_delete_file($real_path);
}
```

## Protecting Sensitive Files

### .htaccess Protection

```apache
# Protect wp-config.php
<Files wp-config.php>
    Order Allow,Deny
    Deny from all
</Files>

# Protect .htaccess itself
<Files .htaccess>
    Order Allow,Deny
    Deny from all
</Files>

# Disable PHP in uploads
<Directory "/var/www/html/wp-content/uploads">
    <Files "*.php">
        Order Allow,Deny
        Deny from all
    </Files>
</Directory>

# Protect wp-includes
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^wp-admin/includes/ - [F,L]
    RewriteRule !^wp-includes/ - [S=3]
    RewriteRule ^wp-includes/[^/]+\.php$ - [F,L]
    RewriteRule ^wp-includes/js/tinymce/langs/.+\.php - [F,L]
    RewriteRule ^wp-includes/theme-compat/ - [F,L]
</IfModule>
```

### Nginx Protection

```nginx
# Deny access to sensitive files
location ~ /\. {
    deny all;
}

location ~* ^/wp-content/uploads/.*\.php$ {
    deny all;
}

location ~ ^/wp-config\.php$ {
    deny all;
}

location ~ ^/wp-includes/.*\.php$ {
    deny all;
}

# Allow specific wp-includes files
location ~ ^/wp-includes/js/tinymce/.*$ {
    allow all;
}
```

### Programmatic Protection

```php
// Prevent direct access to plugin files
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Or more verbose
if (!defined('WPINC')) {
    die('Direct access not allowed');
}
```

## Download Protection

### Secure File Downloads

```php
// Serve files through PHP with access control
add_action('init', 'handle_protected_download');

function handle_protected_download() {
    if (!isset($_GET['download_file'])) {
        return;
    }
    
    $file_id = absint($_GET['download_file']);
    
    // Verify nonce
    if (!wp_verify_nonce($_GET['nonce'], 'download_' . $file_id)) {
        wp_die('Invalid request');
    }
    
    // Check permission
    if (!current_user_can('read_private_files')) {
        wp_die('Access denied');
    }
    
    // Get file path
    $file_path = get_post_meta($file_id, '_file_path', true);
    $real_path = realpath($file_path);
    
    // Validate path
    $upload_dir = wp_upload_dir();
    if (strpos($real_path, realpath($upload_dir['basedir'])) !== 0) {
        wp_die('Invalid file');
    }
    
    if (!file_exists($real_path)) {
        wp_die('File not found');
    }
    
    // Serve file
    $filename = basename($real_path);
    $mime_type = mime_content_type($real_path);
    
    header('Content-Type: ' . $mime_type);
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . filesize($real_path));
    header('Cache-Control: private, no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    readfile($real_path);
    exit;
}

// Generate download link
function get_protected_download_url($file_id) {
    return add_query_arg(array(
        'download_file' => $file_id,
        'nonce' => wp_create_nonce('download_' . $file_id),
    ), home_url());
}
```

## Preventing Code Execution

### Disable PHP in Uploads

```php
// Add .htaccess to uploads folder
function secure_uploads_directory() {
    $upload_dir = wp_upload_dir();
    $htaccess_file = $upload_dir['basedir'] . '/.htaccess';
    
    $rules = "# Disable PHP execution\n";
    $rules .= "<Files *.php>\n";
    $rules .= "deny from all\n";
    $rules .= "</Files>\n";
    
    if (!file_exists($htaccess_file)) {
        file_put_contents($htaccess_file, $rules);
    }
}
register_activation_hook(__FILE__, 'secure_uploads_directory');
```

### Validate Image Files

```php
// Deep image validation
function validate_image_file($file_path) {
    // Check if it's actually an image
    $image_info = @getimagesize($file_path);
    
    if ($image_info === false) {
        return false; // Not a valid image
    }
    
    // Allowed image types
    $allowed_types = array(
        IMAGETYPE_JPEG,
        IMAGETYPE_PNG,
        IMAGETYPE_GIF,
        IMAGETYPE_WEBP,
    );
    
    if (!in_array($image_info[2], $allowed_types)) {
        return false;
    }
    
    // Check for PHP code in image
    $content = file_get_contents($file_path);
    if (preg_match('/<\?php/i', $content)) {
        return false; // Possible PHP injection
    }
    
    return true;
}
```

## File Permission Management

```php
// Set proper file permissions
function set_secure_permissions($file_path) {
    if (is_dir($file_path)) {
        chmod($file_path, 0755); // Directories
    } else {
        chmod($file_path, 0644); // Files
    }
}

// Use WordPress constants
// In wp-config.php
define('FS_CHMOD_DIR', 0755);
define('FS_CHMOD_FILE', 0644);
```

## Security Scanning

```php
// Scan uploads for suspicious files
function scan_uploads_for_threats() {
    $upload_dir = wp_upload_dir();
    $base_dir = $upload_dir['basedir'];
    
    $suspicious = array();
    
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($base_dir)
    );
    
    foreach ($iterator as $file) {
        if ($file->isFile()) {
            $path = $file->getPathname();
            $ext = strtolower($file->getExtension());
            
            // Check for PHP files
            if ($ext === 'php') {
                $suspicious[] = array(
                    'path' => $path,
                    'reason' => 'PHP file in uploads',
                );
            }
            
            // Check for double extensions
            if (preg_match('/\.(php|phtml|php3|php4|php5)\./i', $path)) {
                $suspicious[] = array(
                    'path' => $path,
                    'reason' => 'Double extension',
                );
            }
            
            // Check file content for PHP code
            $content = file_get_contents($path);
            if (preg_match('/<\?php|<\?=/i', $content)) {
                $suspicious[] = array(
                    'path' => $path,
                    'reason' => 'Contains PHP code',
                );
            }
        }
    }
    
    return $suspicious;
}
```

## Best Practices

1. **Validate file types** - Check both extension and MIME type
2. **Use WordPress functions** - `wp_handle_upload()`, `wp_delete_file()`
3. **Sanitize filenames** - Use `sanitize_file_name()`
4. **Prevent path traversal** - Use `realpath()` and validate paths
5. **Disable PHP in uploads** - Via .htaccess or nginx
6. **Protect sensitive files** - wp-config.php, .htaccess
7. **Use secure permissions** - 644 for files, 755 for directories

## Common Pitfalls

- Trusting file extensions without MIME verification
- Not validating paths for traversal attacks
- Allowing PHP execution in uploads directory
- Not sanitizing filenames before saving
- Exposing file paths in error messages

## Exam Tips

- **Know how to validate file uploads securely**: Validate file type by extension AND MIME type (both can be spoofed). Check file size limits. Use `wp_check_filetype_and_ext()` for proper type detection. Validate actual file content, not just extension. Use `wp_handle_upload()` which includes security checks. Scan for malware if possible. Never trust `$_FILES['file']['type']` alone. Store uploads in WordPress uploads directory or outside web root. Always validate before processing or storing files.

- **Understand path traversal prevention**: Path traversal attacks use `../` to access files outside intended directory. Always validate and sanitize file paths. Use `realpath()` and `basename()` to normalize paths. Check that resolved path is within allowed directory. Use `wp_normalize_path()` for cross-platform compatibility. Never use user input directly in file paths. Whitelist allowed directories. Validate paths before any file operations. This prevents attackers from accessing unauthorized files.

- **Know WordPress file handling functions**: Use `wp_handle_upload()` for secure file uploads (handles validation, sanitization, moving). Use `wp_unique_filename()` to prevent filename conflicts. Use `sanitize_file_name()` to clean filenames. Use `wp_check_filetype_and_ext()` for type validation. Use `wp_upload_dir()` to get upload directory paths. These functions include security checks and should be preferred over direct file operations. They handle edge cases and security concerns automatically.

- **Understand .htaccess protection rules**: WordPress creates `.htaccess` in uploads directory to prevent PHP execution. Rules like `php_flag engine off` or `RemoveHandler .php` prevent executing uploaded PHP files. This is critical - without it, uploaded PHP files could be executed. Ensure uploads directory has proper `.htaccess`. For custom directories, add similar rules. This prevents code execution even if malicious files are uploaded. Always verify `.htaccess` exists and is working.

- **Know proper file permission settings**: Directories should be `755` (owner read/write/execute, others read/execute). Files should be `644` (owner read/write, others read). Never use `777` (world-writable) - major security risk. WordPress core files should be owned by web server user. Uploads can be owned by web server or specific user depending on setup. Proper permissions prevent unauthorized modification while allowing necessary access. Always follow principle of least privilege for file permissions.
