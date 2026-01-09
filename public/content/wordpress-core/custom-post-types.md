# Custom Post Types (CPTs)

## Overview

Custom Post Types extend WordPress beyond posts and pages, allowing you to create structured content types like products, events, portfolios, or any custom content structure.

## Key Concepts

### Built-in Post Types

- `post` - Blog posts
- `page` - Static pages
- `attachment` - Media items
- `revision` - Content revisions
- `nav_menu_item` - Navigation menu items
- `custom_css` - Custom CSS
- `customize_changeset` - Customizer changes

## Registering Custom Post Types

### Basic Registration

```php
add_action('init', 'register_book_post_type');

function register_book_post_type() {
    $labels = array(
        'name' => 'Books',
        'singular_name' => 'Book',
        'menu_name' => 'Books',
        'add_new' => 'Add New',
        'add_new_item' => 'Add New Book',
        'edit_item' => 'Edit Book',
        'new_item' => 'New Book',
        'view_item' => 'View Book',
        'view_items' => 'View Books',
        'search_items' => 'Search Books',
        'not_found' => 'No books found',
        'not_found_in_trash' => 'No books found in Trash',
        'all_items' => 'All Books',
        'archives' => 'Book Archives',
        'attributes' => 'Book Attributes',
        'insert_into_item' => 'Insert into book',
        'featured_image' => 'Cover Image',
        'set_featured_image' => 'Set cover image',
    );

    $args = array(
        'labels' => $labels,
        'public' => true,
        'publicly_queryable' => true,
        'show_ui' => true,
        'show_in_menu' => true,
        'query_var' => true,
        'rewrite' => array('slug' => 'books', 'with_front' => false),
        'capability_type' => 'post',
        'has_archive' => true,
        'hierarchical' => false,
        'menu_position' => 5,
        'menu_icon' => 'dashicons-book',
        'supports' => array(
            'title',
            'editor',
            'author',
            'thumbnail',
            'excerpt',
            'comments',
            'revisions',
            'custom-fields',
        ),
        'show_in_rest' => true,  // Enable Gutenberg
        'rest_base' => 'books',
    );

    register_post_type('book', $args);
}
```

### Hierarchical CPT (Like Pages)

```php
register_post_type('documentation', array(
    'labels' => array(
        'name' => 'Documentation',
        'singular_name' => 'Document',
    ),
    'public' => true,
    'hierarchical' => true,  // Enables parent-child relationships
    'supports' => array('title', 'editor', 'page-attributes'),
    'show_in_rest' => true,
));
```

## Custom Capabilities

### Mapping to Post Capabilities

```php
register_post_type('book', array(
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

// Grant capabilities to roles
function add_book_caps() {
    $roles = array('administrator', 'editor');
    
    foreach ($roles as $role_name) {
        $role = get_role($role_name);
        $role->add_cap('publish_books');
        $role->add_cap('edit_books');
        $role->add_cap('edit_others_books');
        $role->add_cap('delete_books');
        $role->add_cap('delete_others_books');
        $role->add_cap('read_private_books');
    }
}
register_activation_hook(__FILE__, 'add_book_caps');
```

## Associating Taxonomies

```php
// Register taxonomy and associate with CPT
register_taxonomy('genre', array('book'), array(
    'labels' => array(
        'name' => 'Genres',
        'singular_name' => 'Genre',
    ),
    'hierarchical' => true,
    'show_in_rest' => true,
    'rewrite' => array('slug' => 'genre'),
));

// Or associate existing taxonomy
register_taxonomy_for_object_type('category', 'book');
register_taxonomy_for_object_type('post_tag', 'book');
```

## Custom Rewrite Rules

```php
register_post_type('event', array(
    'public' => true,
    'rewrite' => array(
        'slug' => 'events/%year%/%monthnum%',
        'with_front' => false,
        'feeds' => true,
        'pages' => true,
    ),
    'has_archive' => 'events',
));

// Add rewrite tags
add_action('init', 'add_event_rewrite_tags');

function add_event_rewrite_tags() {
    add_rewrite_tag('%year%', '([0-9]{4})');
    add_rewrite_tag('%monthnum%', '([0-9]{2})');
}

// Filter permalink
add_filter('post_type_link', 'event_permalink', 10, 2);

function event_permalink($permalink, $post) {
    if ($post->post_type !== 'event') {
        return $permalink;
    }
    
    $date = get_the_date('Y/m', $post);
    return str_replace(
        array('%year%', '%monthnum%'),
        explode('/', $date),
        $permalink
    );
}
```

## REST API Customization

```php
register_post_type('book', array(
    'show_in_rest' => true,
    'rest_base' => 'books',
    'rest_controller_class' => 'WP_REST_Posts_Controller',
    // Or custom controller
    // 'rest_controller_class' => 'My_Custom_Controller',
));

// Add custom fields to REST response
add_action('rest_api_init', function() {
    register_rest_field('book', 'isbn', array(
        'get_callback' => function($post) {
            return get_post_meta($post['id'], 'isbn', true);
        },
        'update_callback' => function($value, $post) {
            update_post_meta($post->ID, 'isbn', sanitize_text_field($value));
        },
        'schema' => array(
            'type' => 'string',
            'description' => 'Book ISBN',
        ),
    ));
});
```

## Template Files

WordPress looks for these templates:

```
single-{post_type}.php     → single-book.php
archive-{post_type}.php    → archive-book.php
```

### Custom Archive Template Logic

```php
// In archive-book.php
if (have_posts()) {
    while (have_posts()) {
        the_post();
        get_template_part('template-parts/content', 'book');
    }
    
    the_posts_pagination();
}
```

## Admin Customization

### Custom Columns

```php
// Add custom columns
add_filter('manage_book_posts_columns', 'book_custom_columns');

function book_custom_columns($columns) {
    $new_columns = array();
    
    foreach ($columns as $key => $value) {
        $new_columns[$key] = $value;
        
        if ($key === 'title') {
            $new_columns['isbn'] = 'ISBN';
            $new_columns['genre'] = 'Genre';
        }
    }
    
    return $new_columns;
}

// Populate custom columns
add_action('manage_book_posts_custom_column', 'book_custom_column_content', 10, 2);

function book_custom_column_content($column, $post_id) {
    switch ($column) {
        case 'isbn':
            echo esc_html(get_post_meta($post_id, 'isbn', true));
            break;
        case 'genre':
            echo get_the_term_list($post_id, 'genre', '', ', ', '');
            break;
    }
}

// Make columns sortable
add_filter('manage_edit-book_sortable_columns', 'book_sortable_columns');

function book_sortable_columns($columns) {
    $columns['isbn'] = 'isbn';
    return $columns;
}
```

### Admin Filters

```php
// Add dropdown filter
add_action('restrict_manage_posts', 'book_admin_filters');

function book_admin_filters() {
    global $typenow;
    
    if ($typenow === 'book') {
        wp_dropdown_categories(array(
            'show_option_all' => 'All Genres',
            'taxonomy' => 'genre',
            'name' => 'genre',
            'selected' => isset($_GET['genre']) ? $_GET['genre'] : '',
            'value_field' => 'slug',
        ));
    }
}
```

## Best Practices

1. **Use meaningful slugs** - SEO-friendly and descriptive
2. **Enable REST API** - `show_in_rest => true` for Gutenberg
3. **Register on init** - Use appropriate hook
4. **Flush permalinks** - Only on activation
5. **Define all labels** - Better admin UX

## Common Pitfalls

- Forgetting to flush permalinks after changes
- Not enabling REST API for Gutenberg
- Using reserved post type names
- Not setting proper capabilities
- Missing taxonomy associations

## Exam Tips

- **Know all the `register_post_type()` arguments**: Key arguments include `public`, `publicly_queryable`, `show_ui`, `show_in_menu`, `show_in_rest` (for Gutenberg), `has_archive`, `rewrite` (for permalinks), `supports` (features like title, editor, thumbnail), `hierarchical`, `capability_type`, `capabilities`, `menu_icon`, `menu_position`. Understanding these allows you to fully customize how the CPT appears and behaves in WordPress.

- **Understand capability mapping**: When using custom `capability_type`, WordPress creates custom capabilities like `edit_books`, `publish_books` instead of default `edit_posts`. Set `map_meta_cap => true` to enable meta capability mapping. You must then grant these capabilities to roles using `get_role()->add_cap()`. This provides fine-grained control over who can manage your CPT, but requires manual capability assignment.

- **Know how to customize admin columns**: Use `manage_{$post_type}_posts_columns` filter to add/remove columns, `manage_{$post_type}_posts_custom_column` action to populate column content, and `manage_edit-{$post_type}_sortable_columns` filter to make columns sortable. You can display post meta, taxonomies, or computed values. This improves the admin experience by showing relevant information at a glance.

- **Understand the template hierarchy for CPTs**: WordPress looks for `single-{post_type}.php` for single posts (e.g., `single-book.php`), `archive-{post_type}.php` for archives (e.g., `archive-book.php`), then falls back to `single.php`, `archive.php`, and finally `index.php`. For hierarchical CPTs, it also checks `single-{post_type}-{slug}.php`. Understanding this helps you create appropriate templates and know which files WordPress will use.

- **Know REST API integration options**: Set `show_in_rest => true` to enable REST API endpoints. Use `rest_base` to customize the endpoint URL (defaults to post type slug). Optionally use `rest_controller_class` for custom controllers. Add custom fields with `register_rest_field()`. REST API integration is required for Gutenberg block editor support and enables headless WordPress implementations.
