# Permalinks and Rewrite Rules

## Overview

Permalinks are the permanent URLs to your posts, pages, and other content. The Rewrite API allows you to create custom URL structures and rules for routing requests.

## Key Concepts

### Default Permalink Structures

| Structure | Example |
|-----------|---------|
| Plain | `?p=123` |
| Day and name | `/2024/01/15/sample-post/` |
| Month and name | `/2024/01/sample-post/` |
| Numeric | `/archives/123` |
| Post name | `/sample-post/` |
| Custom | `/%category%/%postname%/` |

### Permalink Tags

```
%year%        - 4-digit year
%monthnum%    - 2-digit month
%day%         - 2-digit day
%hour%        - 2-digit hour
%minute%      - 2-digit minute
%second%      - 2-digit second
%post_id%     - Post ID
%postname%    - Sanitized post title (slug)
%category%    - Category slug
%author%      - Author nicename
```

## Custom Rewrite Rules

### Adding Rewrite Rules

```php
// Add a custom rewrite rule
add_action('init', 'my_custom_rewrite_rules');

function my_custom_rewrite_rules() {
    // Maps /products/123 to ?product_id=123
    add_rewrite_rule(
        '^products/([0-9]+)/?$',
        'index.php?product_id=$matches[1]',
        'top'  // Priority: 'top' or 'bottom'
    );
    
    // Maps /api/v1/users to ?api_route=users&api_version=1
    add_rewrite_rule(
        '^api/v([0-9]+)/([a-z]+)/?$',
        'index.php?api_version=$matches[1]&api_route=$matches[2]',
        'top'
    );
}
```

### Registering Query Variables

```php
// Register custom query vars
add_filter('query_vars', 'my_custom_query_vars');

function my_custom_query_vars($vars) {
    $vars[] = 'product_id';
    $vars[] = 'api_version';
    $vars[] = 'api_route';
    return $vars;
}
```

### Using Custom Query Variables

```php
// In your template or plugin
add_action('template_redirect', 'handle_custom_routes');

function handle_custom_routes() {
    $product_id = get_query_var('product_id');
    
    if ($product_id) {
        // Handle the product request
        include get_template_directory() . '/product-single.php';
        exit;
    }
}
```

## Custom Post Type Permalinks

```php
// Register CPT with custom permalink structure
register_post_type('book', array(
    'public' => true,
    'label' => 'Books',
    'rewrite' => array(
        'slug' => 'library/books',
        'with_front' => false,  // Don't prepend blog prefix
        'feeds' => true,
        'pages' => true
    ),
    'has_archive' => 'library/books',  // Archive URL
));

// Result: /library/books/my-book-title/
```

## Custom Taxonomy Permalinks

```php
// Register taxonomy with custom permalink
register_taxonomy('genre', 'book', array(
    'public' => true,
    'rewrite' => array(
        'slug' => 'library/genre',
        'with_front' => false,
        'hierarchical' => true
    ),
));

// Result: /library/genre/fiction/
```

## Flushing Rewrite Rules

### When to Flush

- After adding new rewrite rules
- After registering new post types/taxonomies
- After changing permalink settings

### How to Flush

```php
// Method 1: Visit Settings > Permalinks (just save)

// Method 2: Programmatically on activation
register_activation_hook(__FILE__, 'my_plugin_activate');

function my_plugin_activate() {
    // Register post types/taxonomies first
    register_book_post_type();
    
    // Then flush
    flush_rewrite_rules();
}

// Method 3: WP-CLI
// wp rewrite flush
```

### Important: Never Flush on Every Request!

```php
// BAD - Slows down every page load!
add_action('init', function() {
    add_rewrite_rule(...);
    flush_rewrite_rules(); // DON'T DO THIS!
});

// GOOD - Only flush when needed
register_activation_hook(__FILE__, function() {
    my_register_rules();
    flush_rewrite_rules();
});
```

## Advanced Rewrite Techniques

### Adding Rewrite Endpoints

```php
// Add endpoint to all URLs
add_action('init', function() {
    add_rewrite_endpoint('json', EP_PERMALINK | EP_PAGES);
});

// Adds ?json=1 or /json/ to posts and pages
// Use: get_query_var('json')
```

### Custom Permastruct

```php
// Add a custom permastruct
add_action('init', function() {
    add_permastruct('event', 'events/%year%/%monthnum%/%event%', array(
        'with_front' => false,
    ));
});
```

### Rewrite Tags

```php
// Add custom rewrite tag
add_action('init', function() {
    add_rewrite_tag('%event%', '([^/]+)', 'event=');
});
```

## Troubleshooting

### Common Issues

```php
// Check current rewrite rules
global $wp_rewrite;
echo '<pre>' . print_r($wp_rewrite->rules, true) . '</pre>';

// Or use WP-CLI
// wp rewrite list
```

### Debug Matching

```php
add_action('parse_request', function($wp) {
    if (current_user_can('manage_options')) {
        error_log('Matched rule: ' . $wp->matched_rule);
        error_log('Query string: ' . $wp->matched_query);
    }
});
```

## Multilingual Permalinks

```php
// Handle translated slugs
add_filter('post_type_link', 'translate_post_type_link', 10, 2);

function translate_post_type_link($link, $post) {
    if ($post->post_type === 'book') {
        $lang = get_post_meta($post->ID, 'language', true);
        if ($lang === 'es') {
            $link = str_replace('/books/', '/libros/', $link);
        }
    }
    return $link;
}
```

## Best Practices

1. **Flush only on activation/deactivation** - Never on init
2. **Use meaningful slugs** - SEO-friendly and descriptive
3. **Avoid conflicts** - Check for existing rules
4. **Test thoroughly** - Rewrite issues are hard to debug
5. **Document custom rules** - Future developers will thank you

## Common Pitfalls

- Flushing on every page load (performance killer)
- Forgetting to register query vars
- Rule order conflicts (specificity matters)
- Not flushing after adding new rules
- Forgetting `with_front` setting

## Exam Tips

- **Know when and how to flush rewrite rules properly**: Flush rewrite rules only when necessary - on plugin activation/deactivation, after registering new post types or taxonomies, or after changing permalink settings. Use `flush_rewrite_rules()` programmatically in activation hooks, or have users visit Settings > Permalinks. Never flush on `init` or every page load as it's a performance killer.

- **Understand the difference between endpoints and rules**: Rewrite endpoints (added with `add_rewrite_endpoint()`) add query variables to existing URLs (e.g., `/post-name/json/` adds `?json=1`). Rewrite rules (added with `add_rewrite_rule()`) create entirely new URL patterns that map to query strings. Endpoints are simpler and work with existing content, while rules create custom URL structures.

- **Know how to register custom query variables**: Use the `query_vars` filter to register custom query variables that will be available via `get_query_var()`. Without registering, WordPress won't recognize your custom variables even if they're in the URL. Always sanitize and validate query variables before using them.

- **Understand permalink structure for CPTs and taxonomies**: Custom post types use the `rewrite` parameter with `slug`, `with_front`, `feeds`, and `pages` options. Taxonomies also have a `rewrite` parameter. The `with_front` option controls whether the blog prefix is prepended. Set `has_archive` for CPTs to enable archive pages. Remember to flush rules after changes.

- **Be able to debug rewrite rule issues**: Use `global $wp_rewrite; print_r($wp_rewrite->rules);` to see all registered rules, or use WP-CLI's `wp rewrite list`. Check `get_query_var()` to see if variables are being parsed correctly. Use the `parse_request` action to log matched rules. Always test after flushing rules to ensure they work as expected.
