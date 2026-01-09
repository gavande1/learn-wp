# Media Library

## Overview

The WordPress Media Library manages all uploaded files. Understanding its architecture is essential for extending media functionality and handling uploads properly.

## Key Concepts

### Data Model

- **Attachments** - Media items are posts with `post_type = 'attachment'`
- **Post Meta** - Additional data stored in `wp_postmeta`
- **Files** - Physical files in `wp-content/uploads/`

### Attachment Post Structure

```php
// An attachment is a post with:
$attachment = array(
    'post_type' => 'attachment',
    'post_mime_type' => 'image/jpeg',
    'post_title' => 'Image Title',
    'post_content' => 'Description',
    'post_excerpt' => 'Caption',
    'post_status' => 'inherit',  // Inherits from parent
    'post_parent' => $parent_post_id,  // Associated post
);
```

### Key Meta Data

```php
// _wp_attachment_metadata contains:
array(
    'width' => 1920,
    'height' => 1080,
    'file' => '2024/01/image.jpg',
    'filesize' => 245678,
    'sizes' => array(
        'thumbnail' => array(
            'file' => 'image-150x150.jpg',
            'width' => 150,
            'height' => 150,
        ),
        'medium' => array(
            'file' => 'image-300x169.jpg',
            'width' => 300,
            'height' => 169,
        ),
    ),
    'image_meta' => array(
        'aperture' => '2.8',
        'camera' => 'Canon EOS 5D',
        // EXIF data...
    ),
)
```

## Image Sizes

### Registering Custom Sizes

```php
add_action('after_setup_theme', 'register_custom_image_sizes');

function register_custom_image_sizes() {
    // Add custom size
    add_image_size('hero', 1920, 600, true);  // Hard crop
    add_image_size('card', 400, 300, true);
    add_image_size('wide', 1200, 9999, false);  // Soft crop (proportional)
    
    // Custom crop position
    add_image_size('portrait', 400, 600, array('center', 'top'));
}

// Make sizes selectable in admin
add_filter('image_size_names_choose', 'custom_image_size_names');

function custom_image_size_names($sizes) {
    return array_merge($sizes, array(
        'hero' => 'Hero Image',
        'card' => 'Card Thumbnail',
    ));
}
```

### Getting Image URLs

```php
// Get specific size
$url = wp_get_attachment_image_url($attachment_id, 'medium');

// Get image tag
echo wp_get_attachment_image($attachment_id, 'large', false, array(
    'class' => 'my-image',
    'alt' => 'Custom alt text',
));

// Get srcset for responsive images
$srcset = wp_get_attachment_image_srcset($attachment_id, 'medium');
$sizes = wp_get_attachment_image_sizes($attachment_id, 'medium');
```

## Uploading Files

### Programmatic Upload

```php
// Upload from URL
function upload_image_from_url($url, $parent_post_id = 0) {
    require_once(ABSPATH . 'wp-admin/includes/media.php');
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    
    // Download file
    $tmp = download_url($url);
    
    if (is_wp_error($tmp)) {
        return $tmp;
    }
    
    $file_array = array(
        'name' => basename($url),
        'tmp_name' => $tmp,
    );
    
    // Upload and create attachment
    $attachment_id = media_handle_sideload($file_array, $parent_post_id);
    
    // Clean up temp file
    @unlink($tmp);
    
    return $attachment_id;
}
```

### Handle Form Upload

```php
// In form handler
function handle_file_upload() {
    if (!isset($_FILES['my_file'])) {
        return;
    }
    
    require_once(ABSPATH . 'wp-admin/includes/media.php');
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    
    $attachment_id = media_handle_upload('my_file', 0);
    
    if (is_wp_error($attachment_id)) {
        // Handle error
        return $attachment_id->get_error_message();
    }
    
    return $attachment_id;
}
```

## Media Library Views

### List View (PHP)

The list view is traditional PHP-rendered table.

```php
// Hook into list view
add_filter('manage_media_columns', 'add_media_columns');

function add_media_columns($columns) {
    $columns['dimensions'] = 'Dimensions';
    return $columns;
}

add_action('manage_media_custom_column', 'media_column_content', 10, 2);

function media_column_content($column, $attachment_id) {
    if ($column === 'dimensions') {
        $meta = wp_get_attachment_metadata($attachment_id);
        if (isset($meta['width'])) {
            echo $meta['width'] . ' × ' . $meta['height'];
        }
    }
}
```

### Grid View (Backbone.js)

The grid view uses Backbone.js and requires JavaScript customization.

```php
// Add custom data to attachment
add_filter('wp_prepare_attachment_for_js', 'add_custom_attachment_data', 10, 3);

function add_custom_attachment_data($response, $attachment, $meta) {
    $response['customField'] = get_post_meta($attachment->ID, 'custom_field', true);
    return $response;
}
```

```javascript
// Extend the attachment details view
wp.media.view.Attachment.Details.prototype.initialize = function() {
    // Original initialize
    wp.media.view.Attachment.prototype.initialize.apply(this, arguments);
    
    // Add custom functionality
    this.on('ready', function() {
        // Custom code
    });
};
```

## Extending Media Library

### Custom Fields

```php
// Add fields to attachment edit screen
add_filter('attachment_fields_to_edit', 'add_attachment_fields', 10, 2);

function add_attachment_fields($form_fields, $post) {
    $form_fields['photographer'] = array(
        'label' => 'Photographer',
        'input' => 'text',
        'value' => get_post_meta($post->ID, 'photographer', true),
        'helps' => 'Enter the photographer\'s name',
    );
    
    return $form_fields;
}

// Save custom fields
add_filter('attachment_fields_to_save', 'save_attachment_fields', 10, 2);

function save_attachment_fields($post, $attachment) {
    if (isset($attachment['photographer'])) {
        update_post_meta(
            $post['ID'],
            'photographer',
            sanitize_text_field($attachment['photographer'])
        );
    }
    return $post;
}
```

### Custom MIME Types

```php
// Allow additional file types
add_filter('upload_mimes', 'add_custom_mime_types');

function add_custom_mime_types($mimes) {
    $mimes['svg'] = 'image/svg+xml';
    $mimes['webp'] = 'image/webp';
    return $mimes;
}

// Fix MIME type detection (for some file types)
add_filter('wp_check_filetype_and_ext', 'fix_mime_types', 10, 4);

function fix_mime_types($types, $file, $filename, $mimes) {
    if (str_ends_with($filename, '.svg')) {
        $types['type'] = 'image/svg+xml';
        $types['ext'] = 'svg';
    }
    return $types;
}
```

## File Organization

### Upload Directory Structure

```php
// Default: /wp-content/uploads/YYYY/MM/filename.jpg

// Customize upload directory
add_filter('upload_dir', 'custom_upload_directory');

function custom_upload_directory($uploads) {
    // Organize by post type
    global $post;
    
    if ($post && $post->post_type === 'product') {
        $uploads['subdir'] = '/products' . $uploads['subdir'];
        $uploads['path'] = $uploads['basedir'] . $uploads['subdir'];
        $uploads['url'] = $uploads['baseurl'] . $uploads['subdir'];
    }
    
    return $uploads;
}
```

## Best Practices

1. **Use WordPress functions** - Don't manipulate files directly
2. **Register image sizes** - In theme setup
3. **Clean up on delete** - Remove all generated sizes
4. **Validate uploads** - Check MIME types and extensions
5. **Use responsive images** - Leverage srcset/sizes

## Common Pitfalls

- Not including required admin files for uploads
- Forgetting to regenerate thumbnails after adding sizes
- Direct file manipulation instead of using API
- Not handling upload errors
- Missing file type validation

## Exam Tips

- **Understand the attachment data model**: Attachments are posts with `post_type = 'attachment'`. They have `post_mime_type` for file type, `post_parent` for associated post, and `post_status = 'inherit'`. Metadata is stored in `_wp_attachment_metadata` post meta containing dimensions, file paths, generated sizes, and EXIF data. Understanding this model helps you query, manipulate, and extend media functionality properly.

- **Know how to register and use custom image sizes**: Use `add_image_size($name, $width, $height, $crop)` in `after_setup_theme` to register sizes. `$crop` can be `true` (hard crop), `false` (proportional), or array for crop position. Use `add_filter('image_size_names_choose')` to make sizes selectable in admin. Retrieve with `wp_get_attachment_image_url($id, $size)` or `wp_get_attachment_image()`. Note: sizes are only generated for new uploads, use `regenerate_thumbnails` plugin for existing images.

- **Understand the difference between list and grid views**: List view is PHP-rendered table using `manage_media_columns` filter and `manage_media_custom_column` action. Grid view uses Backbone.js and requires JavaScript customization via `wp_prepare_attachment_for_js` filter to add data, then extending Backbone views. List view is simpler to customize with PHP, grid view requires JavaScript knowledge but provides richer interactions.

- **Know how to handle programmatic uploads**: Include required admin files: `media.php`, `file.php`, `image.php`. Use `media_handle_upload()` for form uploads or `media_handle_sideload()` for URL downloads. Both return attachment ID or `WP_Error`. Always handle errors, clean up temp files, and optionally set `post_parent` to associate with a post. These functions handle file validation, MIME type checking, and thumbnail generation automatically.

- **Understand how to add custom fields to attachments**: Use `attachment_fields_to_edit` filter to add form fields to the attachment edit screen, and `attachment_fields_to_save` filter to save the data. Fields can be text, textarea, select, etc. Store data in post meta with `update_post_meta()`. For REST API exposure, use `register_post_meta('attachment', ...)`. This allows extending media with custom metadata like photographer, license, or custom taxonomies.
