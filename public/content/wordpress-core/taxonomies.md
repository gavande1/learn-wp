# Taxonomies

## Overview

Taxonomies are a way to group and organize content in WordPress. Categories and tags are built-in taxonomies, but you can create custom taxonomies for any type of content organization.

## Key Concepts

### Built-in Taxonomies

| Taxonomy | Type | Use Case |
|----------|------|----------|
| `category` | Hierarchical | Broad topic grouping |
| `post_tag` | Non-hierarchical | Specific keywords |
| `post_format` | Non-hierarchical | Content format type |

### Hierarchical vs Non-Hierarchical

- **Hierarchical** (like categories): Parent-child relationships, displayed as checkboxes
- **Non-hierarchical** (like tags): Flat structure, displayed as tag input

## Registering Custom Taxonomies

### Basic Registration

```php
add_action('init', 'register_genre_taxonomy');

function register_genre_taxonomy() {
    $labels = array(
        'name' => 'Genres',
        'singular_name' => 'Genre',
        'menu_name' => 'Genres',
        'all_items' => 'All Genres',
        'edit_item' => 'Edit Genre',
        'view_item' => 'View Genre',
        'update_item' => 'Update Genre',
        'add_new_item' => 'Add New Genre',
        'new_item_name' => 'New Genre Name',
        'search_items' => 'Search Genres',
        'not_found' => 'No genres found',
    );

    $args = array(
        'labels' => $labels,
        'public' => true,
        'publicly_queryable' => true,
        'hierarchical' => true,  // Like categories
        'show_ui' => true,
        'show_in_menu' => true,
        'show_in_nav_menus' => true,
        'show_in_rest' => true,  // Enable Gutenberg support
        'show_tagcloud' => true,
        'show_admin_column' => true,
        'rewrite' => array(
            'slug' => 'genre',
            'with_front' => false,
            'hierarchical' => true,
        ),
    );

    register_taxonomy('genre', array('book'), $args);
}
```

### Non-Hierarchical Taxonomy

```php
register_taxonomy('skill', array('employee'), array(
    'labels' => array(
        'name' => 'Skills',
        'singular_name' => 'Skill',
    ),
    'hierarchical' => false,  // Like tags
    'show_in_rest' => true,
    'rewrite' => array('slug' => 'skills'),
));
```

## Working with Terms

### Creating Terms

```php
// Insert a term
$result = wp_insert_term(
    'Fiction',           // Term name
    'genre',             // Taxonomy
    array(
        'description' => 'Fiction books',
        'slug' => 'fiction',
        'parent' => 0,   // Parent term ID (for hierarchical)
    )
);

if (is_wp_error($result)) {
    echo $result->get_error_message();
} else {
    $term_id = $result['term_id'];
    $term_taxonomy_id = $result['term_taxonomy_id'];
}
```

### Getting Terms

```php
// Get all terms in a taxonomy
$terms = get_terms(array(
    'taxonomy' => 'genre',
    'hide_empty' => false,  // Include terms with no posts
));

// Get terms for a specific post
$post_terms = wp_get_post_terms($post_id, 'genre');

// Get term by slug
$term = get_term_by('slug', 'fiction', 'genre');

// Get term by ID
$term = get_term($term_id, 'genre');

// Get term children
$children = get_term_children($parent_term_id, 'genre');
```

### Updating Terms

```php
// Update a term
wp_update_term($term_id, 'genre', array(
    'name' => 'New Name',
    'description' => 'Updated description',
    'slug' => 'new-slug',
));
```

### Deleting Terms

```php
// Delete a term
wp_delete_term($term_id, 'genre');

// Force delete with reassignment
wp_delete_term($term_id, 'genre', array(
    'default' => $default_term_id,
    'force_default' => true,
));
```

## Assigning Terms to Posts

```php
// Set terms (replaces existing)
wp_set_post_terms($post_id, array('fiction', 'drama'), 'genre');

// Append terms
wp_set_post_terms($post_id, array('mystery'), 'genre', true);

// Set by term IDs
wp_set_object_terms($post_id, array(10, 20), 'genre');

// Remove all terms
wp_set_post_terms($post_id, array(), 'genre');
```

## Querying by Taxonomy

### Using WP_Query

```php
$args = array(
    'post_type' => 'book',
    'tax_query' => array(
        'relation' => 'AND',
        array(
            'taxonomy' => 'genre',
            'field' => 'slug',
            'terms' => array('fiction', 'drama'),
            'operator' => 'IN',
        ),
        array(
            'taxonomy' => 'author',
            'field' => 'term_id',
            'terms' => array(10),
            'operator' => 'NOT IN',
        ),
    ),
);

$query = new WP_Query($args);
```

### Tax Query Operators

| Operator | Description |
|----------|-------------|
| `IN` | Match any of the terms |
| `NOT IN` | Exclude posts with these terms |
| `AND` | Match all terms |
| `EXISTS` | Has any term in taxonomy |
| `NOT EXISTS` | Has no terms in taxonomy |

## Term Meta

```php
// Add term meta
add_term_meta($term_id, 'color', '#ff0000');

// Get term meta
$color = get_term_meta($term_id, 'color', true);

// Update term meta
update_term_meta($term_id, 'color', '#00ff00');

// Delete term meta
delete_term_meta($term_id, 'color');
```

## Displaying Terms

### Term Links

```php
// Get term link
$term = get_term_by('slug', 'fiction', 'genre');
$link = get_term_link($term);

// Display post terms as links
$terms = get_the_terms($post_id, 'genre');
if ($terms && !is_wp_error($terms)) {
    foreach ($terms as $term) {
        echo '<a href="' . get_term_link($term) . '">' . 
             esc_html($term->name) . '</a>';
    }
}

// Or use the_terms()
the_terms($post_id, 'genre', 'Genres: ', ', ', '');
```

### Term Archive Templates

```
taxonomy-{taxonomy}-{term}.php
taxonomy-{taxonomy}.php
taxonomy.php
archive.php
index.php
```

## Performance with Large Taxonomies

### Avoid Deep Nesting

```php
// BAD - deeply nested hierarchies cause performance issues
// Parent > Child > Grandchild > Great-grandchild...

// GOOD - keep hierarchies shallow (2-3 levels max)
```

### Optimize Term Queries

```php
// Only get what you need
$terms = get_terms(array(
    'taxonomy' => 'genre',
    'hide_empty' => true,
    'number' => 10,
    'fields' => 'names',  // Only return names
));
```

### Cache Term Queries

```php
$cache_key = 'my_genre_terms';
$terms = wp_cache_get($cache_key);

if (false === $terms) {
    $terms = get_terms(array('taxonomy' => 'genre'));
    wp_cache_set($cache_key, $terms, '', HOUR_IN_SECONDS);
}
```

## Best Practices

1. **Register early** - Use `init` hook with appropriate priority
2. **Enable REST API** - `show_in_rest => true` for Gutenberg
3. **Use descriptive slugs** - SEO-friendly URLs
4. **Keep hierarchies shallow** - Performance and usability
5. **Flush permalinks** - After registering new taxonomies

## Common Pitfalls

- Forgetting to flush permalinks after registration
- Deep hierarchical structures (performance killer)
- Not enabling REST API support
- Confusing term ID with term_taxonomy_id
- Not handling empty term arrays properly

## Exam Tips

- **Know how to register both hierarchical and non-hierarchical taxonomies**: Set `hierarchical => true` for hierarchical taxonomies (like categories) which support parent-child relationships and display as checkboxes. Set `hierarchical => false` for non-hierarchical taxonomies (like tags) which are flat structures displayed as tag inputs. The `rewrite` parameter also supports `hierarchical => true` for hierarchical URLs. Always set `show_in_rest => true` for Gutenberg support.

- **Understand tax_query in WP_Query**: `tax_query` is an array with `relation` (AND/OR) and condition arrays. Each condition needs `taxonomy`, `field` (slug/term_id/name), `terms` (array of values), and `operator` (IN/NOT IN/AND/EXISTS/NOT EXISTS). You can combine multiple taxonomies and use different operators. `EXISTS` checks if post has any term in the taxonomy, `NOT EXISTS` checks if it has none. This is essential for filtering posts by taxonomy terms.

- **Know the difference between `wp_set_post_terms` and `wp_set_object_terms`**: `wp_set_post_terms()` is specifically for posts and is a wrapper around `wp_set_object_terms()`. `wp_set_object_terms()` is the generic function that works with any object type (posts, users, etc.) and any taxonomy. Both replace existing terms unless you pass `true` as the append parameter. Use `wp_set_post_terms()` for posts (simpler), `wp_set_object_terms()` for other object types or when you need the generic function.

- **Understand term meta and when to use it**: Term meta (added in WordPress 4.4) allows storing additional data for taxonomy terms using `add_term_meta()`, `get_term_meta()`, `update_term_meta()`, `delete_term_meta()`. Use it for term-specific settings like colors, images, custom descriptions, or any data that belongs to the term itself rather than the posts. Register term meta with `register_term_meta()` for REST API support and sanitization.

- **Know performance considerations for large taxonomies**: Keep hierarchies shallow (2-3 levels max) as deep nesting causes performance issues. Use `hide_empty => true` to exclude terms with no posts when appropriate. Use `fields` parameter to return only what you need (`ids`, `names`, `id=>name`). Cache term queries with `wp_cache_set()`. Consider using `get_terms()` with `number` and `offset` for pagination instead of loading all terms. Avoid querying terms on every page load - cache them.
