# Data Escaping

## Overview

Output escaping ensures data is safe for its output context (HTML, attributes, URLs, JavaScript). It prevents XSS attacks by converting potentially dangerous characters.

## Key Concepts

### The Golden Rule

**Escape late, escape for context**

- Escape immediately before output
- Use the correct function for the output context

## HTML Context Escaping

### Basic HTML Output

```php
// Escape for HTML content
<p><?php echo esc_html($user_input); ?></p>

// Escape for HTML attributes
<input value="<?php echo esc_attr($value); ?>">

// Escape for textarea
<textarea><?php echo esc_textarea($content); ?></textarea>
```

### Translation + Escaping

```php
// Translate and escape in one
echo esc_html__('Welcome', 'my-plugin');

// With placeholders
printf(
    esc_html__('Hello, %s!', 'my-plugin'),
    esc_html($username)
);

// Attribute context
<input placeholder="<?php echo esc_attr__('Enter name', 'my-plugin'); ?>">
```

## URL Escaping

```php
// URL for href/src attributes
<a href="<?php echo esc_url($url); ?>">Link</a>
<img src="<?php echo esc_url($image_url); ?>">

// URL for redirects
wp_redirect(esc_url_raw($redirect_url));

// URL for database storage (no encoding)
update_option('redirect_url', esc_url_raw($url));
```

### esc_url vs esc_url_raw

```php
// esc_url() - For display (HTML entities encoded)
$display_url = esc_url('https://example.com/path?a=1&b=2');
// Output: https://example.com/path?a=1&amp;b=2

// esc_url_raw() - For database/redirects (no encoding)
$raw_url = esc_url_raw('https://example.com/path?a=1&b=2');
// Output: https://example.com/path?a=1&b=2
```

## JavaScript Escaping

```php
// Escape for inline JavaScript
<script>
var userName = <?php echo wp_json_encode($username); ?>;
var settings = <?php echo wp_json_encode($settings_array); ?>;
</script>

// Escape for onclick handlers
<button onclick="handleClick(<?php echo esc_js($value); ?>)">
    Click
</button>

// Better: Use data attributes
<button data-value="<?php echo esc_attr($value); ?>" class="js-button">
    Click
</button>
```

### wp_localize_script()

```php
// Safe way to pass data to JavaScript
wp_enqueue_script('my-script', ...);
wp_localize_script('my-script', 'myPluginData', array(
    'ajaxUrl' => admin_url('admin-ajax.php'),
    'nonce' => wp_create_nonce('my_nonce'),
    'settings' => $settings,  // Automatically JSON encoded
));

// Or wp_add_inline_script
wp_add_inline_script(
    'my-script',
    'const MY_CONFIG = ' . wp_json_encode($config) . ';',
    'before'
);
```

## SQL Escaping

```php
global $wpdb;

// Use prepare() - escapes automatically
$results = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->posts} WHERE post_title = %s AND ID = %d",
        $title,  // %s for strings
        $id      // %d for integers
    )
);

// Escape LIKE queries
$search = '%' . $wpdb->esc_like($search_term) . '%';
$results = $wpdb->prepare(
    "SELECT * FROM {$wpdb->posts} WHERE post_title LIKE %s",
    $search
);

// Escape identifiers (table/column names)
$table = esc_sql($table_name);  // Limited use - prefer whitelisting
```

## Context-Specific Examples

### HTML Attributes

```php
<div 
    id="<?php echo esc_attr($id); ?>"
    class="<?php echo esc_attr($classes); ?>"
    data-config='<?php echo esc_attr(wp_json_encode($config)); ?>'
>
    <?php echo esc_html($content); ?>
</div>
```

### URLs with Query Args

```php
// Build URL safely
$url = add_query_arg(array(
    'action' => 'edit',
    'id' => $post_id,
    'nonce' => wp_create_nonce('edit_post'),
), admin_url('admin.php'));

// Output
<a href="<?php echo esc_url($url); ?>">Edit</a>
```

### CSS Output

```php
// Escape for inline CSS
<style>
.custom-element {
    background-color: <?php echo esc_attr($color); ?>;
    font-size: <?php echo absint($size); ?>px;
}
</style>

// Or use wp_add_inline_style
wp_add_inline_style('my-style', sprintf(
    '.custom-element { background-color: %s; }',
    esc_attr($color)
));
```

### HTML in Attributes (Rare)

```php
// When HTML is intentionally in attribute (e.g., data attributes)
<div data-tooltip="<?php echo esc_attr($html_content); ?>">
    Hover me
</div>

// JavaScript reads and uses innerHTML safely
```

## Escaping in Templates

```php
// Good pattern - escape at output
<?php
$title = get_the_title();
$content = get_the_content();
$url = get_permalink();
?>

<article>
    <h1><?php echo esc_html($title); ?></h1>
    <a href="<?php echo esc_url($url); ?>">Read more</a>
    <div class="content">
        <?php 
        // the_content() is pre-escaped
        the_content(); 
        ?>
    </div>
</article>
```

## Allowed HTML with wp_kses

```php
// Allow specific HTML tags
$allowed = array(
    'a' => array(
        'href' => array(),
        'title' => array(),
    ),
    'strong' => array(),
    'em' => array(),
);

echo wp_kses($user_html, $allowed);

// Use predefined sets
echo wp_kses_post($content);  // Allow post content tags
echo wp_kses_data($data);     // Very restrictive
```

## Common Escaping Functions Summary

| Function | Context | Use Case |
|----------|---------|----------|
| `esc_html()` | HTML content | Text between tags |
| `esc_attr()` | HTML attributes | Values in quotes |
| `esc_url()` | URLs (display) | href, src attributes |
| `esc_url_raw()` | URLs (database) | Storing/redirecting |
| `esc_js()` | JavaScript | Inline JS strings |
| `wp_json_encode()` | JavaScript | Complex data |
| `esc_textarea()` | Textarea | Content in textarea |
| `wp_kses()` | HTML subset | Controlled HTML output |
| `$wpdb->prepare()` | SQL | Database queries |

## Best Practices

1. **Escape late** - Right before output, not when storing
2. **Match context** - HTML, attribute, URL, JS, SQL
3. **Double-check templates** - Every echo needs escaping
4. **Use wp_kses for HTML** - When you need some tags
5. **Never trust template functions** - Verify they escape

## Common Pitfalls

- Escaping too early (before storage)
- Wrong escape function for context
- Forgetting to escape in templates
- Assuming WordPress functions escape (some don't)
- Double-escaping

## Exam Tips

- **Know all escape functions and their contexts**: `esc_html()` for HTML content, `esc_attr()` for HTML attributes, `esc_url()` for URLs in HTML, `esc_js()` for JavaScript strings, `esc_sql()` is deprecated (use `$wpdb->prepare()`), `esc_textarea()` for textarea content. Each function escapes for its specific context. Using the wrong function can break output or leave vulnerabilities. Always escape based on where the data will be output.

- **Understand esc_url vs esc_url_raw difference**: `esc_url()` escapes URLs for HTML output (in attributes like `href` or `src`). `esc_url_raw()` sanitizes URLs for database storage or use in code (doesn't HTML-encode). Use `esc_url()` when outputting URLs in HTML. Use `esc_url_raw()` when storing URLs or using them in PHP code. Both validate URL format, but `esc_url()` adds HTML encoding while `esc_url_raw()` doesn't.

- **Know when to use wp_kses variants**: Use `wp_kses()` when you need to allow specific HTML tags in output. Use `wp_kses_post()` for content that should allow post-style HTML. Use `wp_kses_data()` for data attributes. These are both sanitization (filtering HTML) and escaping (making safe for output). Use when you need to preserve some HTML formatting while removing dangerous elements. Always define allowed tags explicitly.

- **Understand SQL escaping with prepare()**: Never use `esc_sql()` - it's deprecated and insufficient. Always use `$wpdb->prepare()` with placeholders: `%s` for strings, `%d` for integers, `%f` for floats. `prepare()` handles both escaping and type conversion. For LIKE queries, use `$wpdb->esc_like()` to escape wildcards, then use in `prepare()`. `prepare()` prevents SQL injection by properly escaping and quoting values based on their type.

- **Know which WordPress functions auto-escape**: Functions like `the_title()`, `the_content()`, `bloginfo()`, `get_the_title()` do NOT auto-escape - you must escape them. Functions like `esc_html__()`, `esc_attr__()` combine translation and escaping. Template tags generally don't escape - always escape output from WordPress functions unless the function name explicitly includes "esc". When in doubt, escape. Double-escaping is safer than not escaping.
