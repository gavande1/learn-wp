# Post Meta

## Overview

Post meta (custom fields) allows you to store additional data associated with posts. It's stored in the `wp_postmeta` table as key-value pairs.

## Key Concepts

### Structure

Each meta entry consists of:
- `meta_id` - Unique identifier
- `post_id` - Associated post
- `meta_key` - Name of the field
- `meta_value` - Stored value (can be serialized)

## Basic Functions

### Getting Meta

```php
// Get single meta value
$price = get_post_meta($post_id, 'price', true);

// Get all values for a key (returns array)
$colors = get_post_meta($post_id, 'color', false);

// Get all meta for a post
$all_meta = get_post_meta($post_id);
```

### Setting Meta

```php
// Add meta (allows duplicates)
add_post_meta($post_id, 'color', 'red');
add_post_meta($post_id, 'color', 'blue');  // Both stored

// Add unique meta (won't add if key exists)
add_post_meta($post_id, 'sku', 'ABC123', true);

// Update meta (creates if doesn't exist)
update_post_meta($post_id, 'price', 29.99);

// Update specific value when multiple exist
update_post_meta($post_id, 'color', 'green', 'red');
```

### Deleting Meta

```php
// Delete all meta with key
delete_post_meta($post_id, 'color');

// Delete specific value
delete_post_meta($post_id, 'color', 'red');
```

## Storing Complex Data

### Arrays and Objects

```php
// Store array (automatically serialized)
$settings = array(
    'width' => 100,
    'height' => 200,
    'options' => array('opt1', 'opt2')
);
update_post_meta($post_id, 'dimensions', $settings);

// Retrieve (automatically unserialized)
$settings = get_post_meta($post_id, 'dimensions', true);
echo $settings['width']; // 100
```

### Handling Serialized Data

```php
// Check if serialized
$value = get_post_meta($post_id, 'data', true);
if (is_serialized($value)) {
    $value = maybe_unserialize($value);
}

// Safe serialization
$serialized = maybe_serialize($array);
```

## Querying by Meta

### Using WP_Query

```php
$args = array(
    'post_type' => 'product',
    'meta_query' => array(
        'relation' => 'AND',
        'price_clause' => array(
            'key' => 'price',
            'value' => 50,
            'compare' => '>=',
            'type' => 'NUMERIC',
        ),
        'featured_clause' => array(
            'key' => 'featured',
            'value' => '1',
        ),
    ),
    // Order by meta
    'orderby' => array(
        'price_clause' => 'ASC',
    ),
);

$query = new WP_Query($args);
```

### Meta Compare Operators

| Operator | Description |
|----------|-------------|
| `=` | Equal (default) |
| `!=` | Not equal |
| `>` | Greater than |
| `>=` | Greater than or equal |
| `<` | Less than |
| `<=` | Less than or equal |
| `LIKE` | Contains |
| `NOT LIKE` | Doesn't contain |
| `IN` | In array |
| `NOT IN` | Not in array |
| `BETWEEN` | Between two values |
| `NOT BETWEEN` | Not between |
| `EXISTS` | Key exists |
| `NOT EXISTS` | Key doesn't exist |

### Type Casting

```php
'type' => 'NUMERIC',   // For numbers
'type' => 'DECIMAL',   // For decimals
'type' => 'SIGNED',    // For signed integers
'type' => 'UNSIGNED',  // For unsigned integers
'type' => 'CHAR',      // For strings (default)
'type' => 'BINARY',    // Binary comparison
'type' => 'DATE',      // Date format
'type' => 'DATETIME',  // DateTime format
'type' => 'TIME',      // Time format
```

## REST API Integration

### Exposing Meta in REST API

```php
// Register meta for REST API
register_post_meta('product', 'price', array(
    'show_in_rest' => true,
    'single' => true,
    'type' => 'number',
    'sanitize_callback' => 'absint',
    'auth_callback' => function() {
        return current_user_can('edit_posts');
    }
));

// Complex meta with schema
register_post_meta('product', 'settings', array(
    'show_in_rest' => array(
        'schema' => array(
            'type' => 'object',
            'properties' => array(
                'color' => array('type' => 'string'),
                'size' => array('type' => 'string'),
            ),
        ),
    ),
    'single' => true,
    'type' => 'object',
));
```

## Custom Meta Boxes

```php
// Add meta box
add_action('add_meta_boxes', 'add_product_meta_box');

function add_product_meta_box() {
    add_meta_box(
        'product_details',
        'Product Details',
        'render_product_meta_box',
        'product',
        'normal',
        'high'
    );
}

function render_product_meta_box($post) {
    wp_nonce_field('product_meta_box', 'product_meta_box_nonce');
    
    $price = get_post_meta($post->ID, 'price', true);
    $sku = get_post_meta($post->ID, 'sku', true);
    ?>
    <p>
        <label for="price">Price:</label>
        <input type="number" id="price" name="price" 
               value="<?php echo esc_attr($price); ?>" step="0.01">
    </p>
    <p>
        <label for="sku">SKU:</label>
        <input type="text" id="sku" name="sku" 
               value="<?php echo esc_attr($sku); ?>">
    </p>
    <?php
}

// Save meta box data
add_action('save_post_product', 'save_product_meta');

function save_product_meta($post_id) {
    // Verify nonce
    if (!isset($_POST['product_meta_box_nonce']) ||
        !wp_verify_nonce($_POST['product_meta_box_nonce'], 'product_meta_box')) {
        return;
    }
    
    // Check autosave
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    // Check permissions
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }
    
    // Save meta
    if (isset($_POST['price'])) {
        update_post_meta($post_id, 'price', 
            floatval($_POST['price']));
    }
    
    if (isset($_POST['sku'])) {
        update_post_meta($post_id, 'sku', 
            sanitize_text_field($_POST['sku']));
    }
}
```

## Performance Optimization

### Batch Operations

```php
// Efficient: Single query for multiple posts
$post_ids = array(1, 2, 3, 4, 5);
update_meta_cache('post', $post_ids);

// Now get_post_meta is cached for these posts
foreach ($post_ids as $id) {
    $price = get_post_meta($id, 'price', true); // Uses cache
}
```

### When to Use Custom Tables

Consider custom tables when:
- Frequently querying by meta values
- Large amounts of meta data
- Complex relationships
- Need for indexing

```php
// Signs you need a custom table:
// - Slow meta_query performance
// - Millions of meta rows
// - Complex reporting needs
```

## Best Practices

1. **Prefix meta keys** - `_myplugin_field` (underscore hides from UI)
2. **Validate and sanitize** - Always on save
3. **Use register_post_meta** - For REST API exposure
4. **Cache meta queries** - Expensive operations
5. **Consider custom tables** - For heavy meta usage

## Common Pitfalls

- Storing large amounts of data in meta
- Frequent updates causing database locks
- Not escaping output
- Querying unindexed meta fields
- Serialized data making queries impossible

## Exam Tips

- **Know the difference between `add_post_meta` and `update_post_meta`**: `add_post_meta()` adds a new meta entry and allows duplicates unless the `$unique` parameter is `true`. `update_post_meta()` updates existing meta or creates it if it doesn't exist, and by default updates the first matching entry. Use `add_post_meta()` when you want to allow multiple values for the same key, `update_post_meta()` when you want a single value that gets replaced.

- **Understand meta_query operators and type casting**: Meta query supports operators like `=`, `!=`, `>`, `>=`, `<`, `<=`, `LIKE`, `NOT LIKE`, `IN`, `NOT IN`, `BETWEEN`, `NOT BETWEEN`, `EXISTS`, `NOT EXISTS`. The `type` parameter is crucial for correct comparisons: use `NUMERIC` for numbers, `DECIMAL` for decimals, `CHAR` for strings (default), `DATE`/`DATETIME`/`TIME` for dates. Without proper type casting, numeric comparisons may fail (e.g., "10" < "2" as strings).

- **Know how to properly save meta from meta boxes**: Always verify nonces with `wp_verify_nonce()` to prevent CSRF attacks. Check `DOING_AUTOSAVE` and skip saving during autosaves if needed. Verify user capabilities with `current_user_can('edit_post', $post_id)`. Sanitize all input before saving (e.g., `sanitize_text_field()`, `absint()`, `floatval()`). Use the `save_post_{$post_type}` action hook for type-specific saves. Never trust `$_POST` data without validation.

- **Understand performance implications of meta queries**: Meta queries can be slow because `wp_postmeta` table isn't well-indexed for value searches. Queries on serialized data are impossible. Use `update_meta_cache()` to batch-load meta for multiple posts. Consider adding indexes for frequently queried meta keys. For heavy meta usage, consider custom tables with proper indexes. Cache meta query results when possible.

- **Know when to use custom tables instead**: Use custom tables when you frequently query by meta values, have large amounts of meta data, need complex relationships, require proper indexing, or need better performance. Signs you need custom tables include slow `meta_query` performance, millions of meta rows, complex reporting needs, or frequent JOIN operations. Custom tables give you full control over indexes and query optimization.
