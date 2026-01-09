# Template Hierarchy

## Overview

The Template Hierarchy is WordPress's system for determining which template file to use when displaying a page. Understanding it is crucial for theme development.

## Key Concepts

### How It Works

1. WordPress identifies the type of page being requested
2. It looks for the most specific template file
3. Falls back to more general templates if specific ones don't exist
4. Ultimately falls back to `index.php`

## The Hierarchy

### Single Post

```
single-{post-type}-{slug}.php
single-{post-type}.php
single.php
singular.php
index.php
```

**Example:** For a "book" post type with slug "my-book":
1. `single-book-my-book.php`
2. `single-book.php`
3. `single.php`
4. `singular.php`
5. `index.php`

### Page

```
{custom-template}.php (if selected)
page-{slug}.php
page-{id}.php
page.php
singular.php
index.php
```

### Category Archive

```
category-{slug}.php
category-{id}.php
category.php
archive.php
index.php
```

### Custom Post Type Archive

```
archive-{post-type}.php
archive.php
index.php
```

### Custom Taxonomy

```
taxonomy-{taxonomy}-{term}.php
taxonomy-{taxonomy}.php
taxonomy.php
archive.php
index.php
```

### Author Archive

```
author-{nicename}.php
author-{id}.php
author.php
archive.php
index.php
```

### Date Archive

```
date.php
archive.php
index.php
```

### Search Results

```
search.php
index.php
```

### 404 Page

```
404.php
index.php
```

### Home Page (Blog)

```
home.php
index.php
```

### Front Page

```
front-page.php
home.php (if showing posts)
page.php (if showing static page)
index.php
```

## Block Themes (theme.json)

In block themes, templates work differently:

### Template Files Location

```
/templates/
    index.html
    single.html
    page.html
    archive.html
    404.html

/parts/
    header.html
    footer.html
```

### theme.json Configuration

```json
{
    "$schema": "https://schemas.wp.org/trunk/theme.json",
    "version": 2,
    "settings": {
        "color": {
            "palette": [
                {
                    "slug": "primary",
                    "color": "#0073aa",
                    "name": "Primary"
                }
            ]
        },
        "typography": {
            "fontSizes": [
                {
                    "slug": "small",
                    "size": "13px",
                    "name": "Small"
                }
            ]
        }
    },
    "styles": {
        "color": {
            "background": "#ffffff",
            "text": "#000000"
        }
    },
    "templateParts": [
        {
            "name": "header",
            "area": "header"
        },
        {
            "name": "footer",
            "area": "footer"
        }
    ]
}
```

## Overriding Templates Safely

### In Child Themes

```php
// Just create a file with the same name in child theme
// child-theme/single.php overrides parent-theme/single.php
```

### Using Filters

```php
// Change template programmatically
add_filter('template_include', 'my_custom_template');

function my_custom_template($template) {
    if (is_singular('product') && get_post_meta(get_the_ID(), 'featured', true)) {
        $new_template = locate_template('single-product-featured.php');
        if ($new_template) {
            return $new_template;
        }
    }
    return $template;
}
```

### Using Template Parts

```php
// In your template file
get_template_part('template-parts/content', get_post_type());

// Loads: template-parts/content-{post-type}.php
// Falls back to: template-parts/content.php
```

## Debugging Templates

### Find Current Template

```php
// In your template or functions.php
add_action('wp_footer', function() {
    if (current_user_can('manage_options')) {
        global $template;
        echo '<!-- Template: ' . basename($template) . ' -->';
    }
});
```

### Using Query Monitor

The Query Monitor plugin shows:
- Current template file
- All templates checked
- Template parts loaded

## Template Tags

```php
// Check page type
is_single()           // Single post
is_singular()         // Any single content
is_page()             // Static page
is_archive()          // Any archive
is_category()         // Category archive
is_tax()              // Custom taxonomy archive
is_author()           // Author archive
is_search()           // Search results
is_404()              // 404 page
is_home()             // Blog home
is_front_page()       // Front page

// Combined checks
is_singular('book')   // Single book post type
is_page('about')      // About page (by slug)
is_category(array('news', 'blog'))  // Multiple categories
```

## Best Practices

1. **Start general, get specific** - Build from index.php up
2. **Use template parts** - Keep templates DRY
3. **Document custom templates** - Add Template Name headers
4. **Test the hierarchy** - Verify correct templates load
5. **Consider block themes** - Modern approach for new projects

## Common Pitfalls

- Forgetting `index.php` (required in all themes)
- Confusing `home.php` and `front-page.php`
- Not understanding how static front pages work
- Overriding without child themes (lost on updates)
- Missing singular.php fallback in hierarchy

## Exam Tips

- **Memorize the hierarchy order for common page types**: For single posts: `single-{post-type}-{slug}.php` → `single-{post-type}.php` → `single.php` → `singular.php` → `index.php`. For pages: `{custom-template}.php` → `page-{slug}.php` → `page-{id}.php` → `page.php` → `singular.php` → `index.php`. WordPress always falls back to more general templates, ending with `index.php` which is required in all themes.

- **Know the difference between `home.php` and `front-page.php`**: `home.php` is used for the blog posts index page (when "Your homepage displays" is set to "Your latest posts"). `front-page.php` is used for the front page of the site (when set to a static page or when showing posts on the front). If both exist and front page shows posts, `front-page.php` takes precedence over `home.php`.

- **Understand how block themes change the hierarchy**: Block themes use HTML template files in `/templates/` instead of PHP files, and the hierarchy works similarly but with `.html` extensions. Templates are defined in `theme.json` and use block markup. The hierarchy still applies, but templates are composed of blocks rather than PHP code. Template parts are stored in `/parts/`.

- **Know how to debug which template is being used**: Use `global $template;` to get the current template path, or use Query Monitor plugin which shows the template and all templates that were checked. Add `<!-- Template: <?php echo basename($template); ?> -->` in your footer for quick debugging. The `template_include` filter can also be used to log or modify the template.

- **Understand template parts and how they work**: Template parts are reusable template fragments loaded with `get_template_part('slug', 'name')` which looks for `{slug}-{name}.php` then `{slug}.php`. They help keep templates DRY by allowing you to reuse common sections like post content, headers, or footers across different templates. Block themes use template parts in `/parts/` as HTML files.
