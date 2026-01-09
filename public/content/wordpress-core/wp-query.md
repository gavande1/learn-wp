# WP_Query

## Overview

WP_Query is WordPress's powerful class for querying posts from the database. It's the foundation for displaying content and is highly customizable through its many parameters.

## Key Concepts

### WP_Query vs get_posts() vs query_posts()

| Method | Use Case |
|--------|----------|
| `WP_Query` | Custom queries, loops, full control |
| `get_posts()` | Simple queries, returns array |
| `query_posts()` | **NEVER USE** - modifies main query |

## Basic Usage

### Creating a Custom Query

```php
$args = array(
    'post_type' => 'post',
    'posts_per_page' => 10,
    'orderby' => 'date',
    'order' => 'DESC'
);

$query = new WP_Query($args);

if ($query->have_posts()) {
    while ($query->have_posts()) {
        $query->the_post();
        ?>
        <h2><?php the_title(); ?></h2>
        <div><?php the_excerpt(); ?></div>
        <?php
    }
    wp_reset_postdata(); // Always reset!
} else {
    echo 'No posts found';
}
```

### Using get_posts()

```php
$posts = get_posts(array(
    'post_type' => 'post',
    'numberposts' => 10
));

foreach ($posts as $post) {
    setup_postdata($post);
    the_title();
    the_excerpt();
}
wp_reset_postdata();
```

## Common Parameters

### Post Type and Status

```php
$args = array(
    'post_type' => array('post', 'page', 'book'),
    'post_status' => 'publish',  // publish, draft, pending, future, private
);
```

### Pagination

```php
$args = array(
    'posts_per_page' => 10,
    'paged' => get_query_var('paged') ? get_query_var('paged') : 1,
    'offset' => 5,  // Skip first 5 posts
);
```

### Ordering

```php
$args = array(
    'orderby' => 'date',  // date, title, modified, rand, menu_order, meta_value
    'order' => 'DESC',    // ASC or DESC
    
    // Multiple orderby
    'orderby' => array(
        'menu_order' => 'ASC',
        'date' => 'DESC'
    ),
);
```

### Category and Tag Queries

```php
// By category
$args = array(
    'cat' => 5,                    // Category ID
    'category_name' => 'news',     // Category slug
    'category__in' => array(1, 2), // Posts in these categories
    'category__not_in' => array(3),// Exclude categories
    'category__and' => array(1, 2),// Must be in both
);

// By tag
$args = array(
    'tag' => 'featured',           // Tag slug
    'tag_id' => 5,                 // Tag ID
    'tag__in' => array(1, 2),      // Posts with any of these tags
    'tag__and' => array(1, 2),     // Posts with all these tags
);
```

### Taxonomy Queries

```php
$args = array(
    'tax_query' => array(
        'relation' => 'AND', // AND or OR
        array(
            'taxonomy' => 'genre',
            'field' => 'slug',    // slug, term_id, name
            'terms' => array('fiction', 'drama'),
            'operator' => 'IN',   // IN, NOT IN, AND, EXISTS
        ),
        array(
            'taxonomy' => 'author',
            'field' => 'term_id',
            'terms' => array(10, 20),
        ),
    ),
);
```

### Meta Queries

```php
$args = array(
    'meta_query' => array(
        'relation' => 'AND',
        array(
            'key' => 'price',
            'value' => 100,
            'compare' => '>=',
            'type' => 'NUMERIC',
        ),
        array(
            'key' => 'featured',
            'value' => '1',
            'compare' => '=',
        ),
    ),
);

// Simple meta query
$args = array(
    'meta_key' => 'price',
    'meta_value' => 100,
    'meta_compare' => '>=',
    'meta_type' => 'NUMERIC',
);

// Order by meta
$args = array(
    'meta_key' => 'price',
    'orderby' => 'meta_value_num',
    'order' => 'ASC',
);
```

### Date Queries

```php
$args = array(
    'date_query' => array(
        array(
            'after' => 'January 1st, 2024',
            'before' => array(
                'year' => 2024,
                'month' => 12,
                'day' => 31,
            ),
            'inclusive' => true,
        ),
        array(
            'hour' => 9,
            'compare' => '>=',
        ),
        array(
            'dayofweek' => array(1, 5), // Monday to Friday
            'compare' => 'BETWEEN',
        ),
    ),
    'date_query' => array(
        'relation' => 'OR',
        // ... multiple conditions
    ),
);
```

### Author Queries

```php
$args = array(
    'author' => 1,                      // Author ID
    'author_name' => 'john',            // Author nicename
    'author__in' => array(1, 2, 3),     // Multiple authors
    'author__not_in' => array(4, 5),    // Exclude authors
);
```

### Search

```php
$args = array(
    's' => 'search term',
    'exact' => true,      // Exact match
    'sentence' => true,   // Search as phrase
);
```

### Include/Exclude

```php
$args = array(
    'post__in' => array(1, 2, 3),      // Only these posts
    'post__not_in' => array(4, 5, 6),  // Exclude these posts
    'post_parent' => 10,                // Children of post 10
    'post_parent__in' => array(10, 20),
);
```

## Performance Optimization

### Disable Unnecessary Queries

```php
$args = array(
    'no_found_rows' => true,           // Skip pagination count
    'update_post_meta_cache' => false, // Don't cache post meta
    'update_post_term_cache' => false, // Don't cache taxonomies
    'fields' => 'ids',                 // Return only IDs
);
```

### Cache Results

```php
$cache_key = 'my_custom_query_' . md5(serialize($args));
$posts = wp_cache_get($cache_key);

if (false === $posts) {
    $query = new WP_Query($args);
    $posts = $query->posts;
    wp_cache_set($cache_key, $posts, '', HOUR_IN_SECONDS);
}
```

## Modifying the Main Query

```php
// Use pre_get_posts to modify the main query
add_action('pre_get_posts', 'modify_main_query');

function modify_main_query($query) {
    // Only modify main query on frontend
    if (!is_admin() && $query->is_main_query()) {
        
        // Modify home page query
        if ($query->is_home()) {
            $query->set('posts_per_page', 5);
            $query->set('category_name', 'featured');
        }
        
        // Modify search query
        if ($query->is_search()) {
            $query->set('post_type', array('post', 'page', 'book'));
        }
    }
}
```

## Pagination

```php
// Display pagination
$query = new WP_Query($args);

// After the loop
$big = 999999999;
echo paginate_links(array(
    'base' => str_replace($big, '%#%', esc_url(get_pagenum_link($big))),
    'format' => '?paged=%#%',
    'current' => max(1, get_query_var('paged')),
    'total' => $query->max_num_pages,
    'prev_text' => '&laquo; Previous',
    'next_text' => 'Next &raquo;',
));
```

## Best Practices

1. **Always reset post data** - Use `wp_reset_postdata()` after custom queries
2. **Use pre_get_posts** - For modifying the main query
3. **Never use query_posts()** - It breaks things
4. **Optimize for performance** - Use `no_found_rows` when pagination isn't needed
5. **Cache expensive queries** - Use transients or object cache

## Common Pitfalls

- Forgetting `wp_reset_postdata()`
- Using `query_posts()` instead of proper methods
- Not handling empty results
- Performance issues with meta queries
- Wrong pagination on custom queries

## Exam Tips

- **Know the difference between WP_Query, get_posts, and query_posts**: `WP_Query` is the main class for custom queries with full control and proper loop handling. `get_posts()` is a wrapper that returns an array of post objects, simpler but less flexible. `query_posts()` should NEVER be used - it modifies the main query and breaks pagination, themes, and plugins. Always use `WP_Query` for custom queries or `pre_get_posts` to modify the main query.

- **Understand tax_query and meta_query syntax**: Both use array structures with `relation` (AND/OR) and nested arrays for conditions. `tax_query` uses `taxonomy`, `field` (slug/term_id/name), `terms`, and `operator` (IN/NOT IN/AND/EXISTS). `meta_query` uses `key`, `value`, `compare` (operators like >=, <, LIKE), and `type` (NUMERIC/CHAR/DATE). Understanding the syntax is crucial for complex queries combining multiple conditions.

- **Know how to optimize queries for performance**: Use `no_found_rows => true` when pagination isn't needed to skip the expensive count query. Use `update_post_meta_cache => false` and `update_post_term_cache => false` when you don't need that data. Use `fields => 'ids'` to return only IDs instead of full post objects. Cache expensive queries with transients. Avoid querying unindexed meta fields frequently.

- **Understand pre_get_posts and when to use it**: `pre_get_posts` is the proper way to modify the main query (the query WordPress uses for the current page). Use it to change post types, add taxonomies, modify pagination, or filter results on archive pages. Always check `is_main_query()` and `!is_admin()` to avoid affecting admin or secondary queries. This is the correct alternative to `query_posts()`.

- **Know how to properly paginate custom queries**: For custom `WP_Query`, use `paged` parameter with `get_query_var('paged')`. Use `paginate_links()` with the query's `max_num_pages` for pagination links. Always use `wp_reset_postdata()` after custom query loops to restore global `$post`. For main query modifications via `pre_get_posts`, WordPress handles pagination automatically.
