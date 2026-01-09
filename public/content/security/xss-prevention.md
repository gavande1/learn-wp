# XSS Prevention

## Overview

Cross-Site Scripting (XSS) occurs when malicious scripts are injected into trusted websites. WordPress provides comprehensive escaping functions to prevent XSS attacks.

## Types of XSS

### Stored XSS

```php
// Malicious content saved to database
// Then displayed to other users without escaping

// VULNERABLE:
echo get_post_meta($post_id, 'custom_field', true);
// If custom_field contains: <script>alert('XSS')</script>
// Script executes in every user's browser
```

### Reflected XSS

```php
// VULNERABLE:
echo "Search results for: " . $_GET['q'];
// Attacker link: site.com?q=<script>steal_cookies()</script>
```

### DOM-based XSS

```javascript
// VULNERABLE JavaScript:
document.getElementById('output').innerHTML = location.hash.substring(1);
// Attacker link: site.com#<img src=x onerror=alert('XSS')>
```

## The Golden Rule

> **Escape Late** - Escape data at the point of output, not when storing.

```php
// CORRECT approach:
$title = sanitize_text_field($_POST['title']); // Sanitize on input
update_post_meta($id, 'title', $title);

// Later, when outputting:
echo esc_html(get_post_meta($id, 'title', true)); // Escape on output
```

## WordPress Escaping Functions

### esc_html()

```php
// For content in HTML context
$name = get_post_meta($id, 'author_name', true);
echo '<p>Author: ' . esc_html($name) . '</p>';

// Converts: <script>alert('xss')</script>
// To: &lt;script&gt;alert('xss')&lt;/script&gt;
```

### esc_attr()

```php
// For HTML attribute values
$value = get_option('my_setting');
echo '<input type="text" value="' . esc_attr($value) . '">';

// For data attributes
echo '<div data-id="' . esc_attr($id) . '">';

// IMPORTANT: Always quote attributes!
// BAD: <input value=<?php echo esc_attr($val); ?>>
// GOOD: <input value="<?php echo esc_attr($val); ?>">
```

### esc_url()

```php
// For URLs in href, src, etc.
$url = get_user_meta($user_id, 'website', true);
echo '<a href="' . esc_url($url) . '">Website</a>';

// For URLs in non-HTML context (like redirects)
$url = esc_url_raw($redirect_url);
wp_redirect($url);

// Prevents javascript: pseudo-protocol
// esc_url('javascript:alert(1)') returns ''
```

### esc_js()

```php
// For inline JavaScript strings
$message = get_option('welcome_message');
?>
<script>
    alert('<?php echo esc_js($message); ?>');
</script>

// Better: Use wp_localize_script()
wp_localize_script('my-script', 'myData', array(
    'message' => $message, // Automatically escaped
));
```

### esc_textarea()

```php
// For textarea content
$content = get_option('description');
echo '<textarea>' . esc_textarea($content) . '</textarea>';
```

### wp_kses() Family

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
echo wp_kses($content, $allowed);

// Allow post-level HTML
echo wp_kses_post($content);

// Allow no HTML (strip all tags)
echo wp_kses($content, array());

// Use predefined tag sets
echo wp_kses($content, 'post');
```

## Translation Escaping Functions

```php
// Escaped translations
esc_html_e('Hello World', 'my-plugin');  // Echo escaped
$text = esc_html__('Hello', 'my-plugin'); // Return escaped

// With placeholders
printf(
    esc_html__('Hello, %s!', 'my-plugin'),
    esc_html($username)
);

// For attributes
echo '<input placeholder="' . esc_attr__('Search...', 'my-plugin') . '">';
```

## Context-Specific Escaping

### HTML Context

```php
<div class="user-content">
    <?php echo esc_html($content); ?>
</div>
```

### Attribute Context

```php
<div 
    class="<?php echo esc_attr($class); ?>"
    data-user="<?php echo esc_attr($user_id); ?>"
    title="<?php echo esc_attr($title); ?>"
>
```

### URL Context

```php
<a href="<?php echo esc_url($link); ?>">
<img src="<?php echo esc_url($image_url); ?>">
<form action="<?php echo esc_url($action_url); ?>">
```

### JavaScript Context

```php
<script>
var config = <?php echo wp_json_encode($config); ?>;
</script>

// Or with wp_localize_script (preferred)
wp_localize_script('my-script', 'myConfig', $config);
```

### CSS Context

```php
// Validate CSS values
$color = sanitize_hex_color($user_color);
echo '<style>.custom { color: ' . esc_attr($color) . '; }</style>';

// For complex CSS, use wp_add_inline_style()
wp_add_inline_style('my-style', '.custom { color: ' . esc_attr($color) . '; }');
```

## JavaScript Best Practices

### Avoid innerHTML

```javascript
// BAD - vulnerable to XSS
element.innerHTML = userData;

// GOOD - use textContent for text
element.textContent = userData;

// GOOD - use DOM methods for HTML
const link = document.createElement('a');
link.href = url;
link.textContent = label;
element.appendChild(link);
```

### Safe Data Passing

```php
// PHP
wp_enqueue_script('my-script', ...);
wp_localize_script('my-script', 'wpData', array(
    'userId' => get_current_user_id(),
    'nonce' => wp_create_nonce('my-action'),
    'ajaxUrl' => admin_url('admin-ajax.php'),
));
```

```javascript
// JavaScript - data is already escaped
console.log(wpData.userId);
```

## Common XSS Vectors

### Event Handlers

```php
// VULNERABLE
echo '<div onclick="' . $user_input . '">';

// SAFE
echo '<div onclick="handleClick(' . esc_js($user_input) . ')">';

// BETTER - use data attributes
echo '<div data-action="' . esc_attr($user_input) . '">';
```

### URLs

```php
// VULNERABLE - javascript: protocol
echo '<a href="' . $user_url . '">';

// SAFE - esc_url blocks javascript: protocol
echo '<a href="' . esc_url($user_url) . '">';
```

### Style Attributes

```php
// VULNERABLE - CSS expressions
echo '<div style="' . $user_style . '">';

// SAFE - validate/whitelist CSS
$safe_color = sanitize_hex_color($user_color);
echo '<div style="color: ' . esc_attr($safe_color) . '">';
```

## Complete Secure Template Example

```php
<?php
// Secure template file
$user = wp_get_current_user();
$settings = get_option('my_plugin_settings', array());
$items = get_posts(array('post_type' => 'item', 'posts_per_page' => 10));
?>

<div class="my-plugin-wrapper">
    <h1><?php echo esc_html($settings['title'] ?? 'Items'); ?></h1>
    
    <p><?php printf(
        esc_html__('Welcome, %s!', 'my-plugin'),
        esc_html($user->display_name)
    ); ?></p>
    
    <form action="<?php echo esc_url(admin_url('admin-post.php')); ?>" method="post">
        <?php wp_nonce_field('save_settings', 'my_nonce'); ?>
        <input type="hidden" name="action" value="my_save_action">
        
        <label for="search"><?php esc_html_e('Search:', 'my-plugin'); ?></label>
        <input 
            type="text" 
            id="search"
            name="search" 
            value="<?php echo esc_attr($_GET['search'] ?? ''); ?>"
            placeholder="<?php esc_attr_e('Enter search term...', 'my-plugin'); ?>"
        >
        
        <button type="submit"><?php esc_html_e('Search', 'my-plugin'); ?></button>
    </form>
    
    <ul class="items-list">
        <?php foreach ($items as $item) : ?>
            <li>
                <a href="<?php echo esc_url(get_permalink($item)); ?>">
                    <?php echo esc_html($item->post_title); ?>
                </a>
                <span class="meta">
                    <?php echo esc_html(get_the_date('', $item)); ?>
                </span>
            </li>
        <?php endforeach; ?>
    </ul>
    
    <?php if (!empty($settings['custom_html'])) : ?>
        <div class="custom-content">
            <?php echo wp_kses_post($settings['custom_html']); ?>
        </div>
    <?php endif; ?>
</div>
```

## Best Practices

1. **Escape everything** - Even data you "trust"
2. **Escape late** - At the point of output
3. **Use correct function** - Match context
4. **Quote attributes** - Always use quotes
5. **Validate URL protocols** - Use esc_url()
6. **Avoid eval() and innerHTML** - Use safer alternatives

## Common Pitfalls

- Escaping too early (in storage)
- Using wrong escape function for context
- Forgetting to escape in templates
- Not quoting HTML attributes
- Using echo for URLs (should use esc_url)
- Trusting admin-entered content

## Exam Tips

- **Know all escape functions and their contexts**: `esc_html()` for HTML content, `esc_attr()` for HTML attributes, `esc_url()` for URLs in HTML attributes, `esc_js()` for JavaScript strings, `esc_textarea()` for textarea content. Each function escapes for its specific output context. Using the wrong function can break output or leave XSS vulnerabilities. Always match the escape function to where the data will be output. When in doubt, use `esc_html()` for general HTML content.

- **Understand esc_url() vs esc_url_raw()**: `esc_url()` escapes URLs for HTML output (in `href`, `src` attributes) - adds HTML encoding. `esc_url_raw()` sanitizes URLs for database storage or PHP code use - validates format but doesn't HTML-encode. Use `esc_url()` when outputting URLs in HTML: `<a href="<?php echo esc_url($url); ?>">`. Use `esc_url_raw()` when storing URLs: `update_option('url', esc_url_raw($_POST['url']))`. Both validate URL format, but serve different purposes.

- **Know wp_kses() and allowed HTML arrays**: `wp_kses()` filters HTML to allow only specified tags and attributes. Define allowed HTML as array: `array('a' => array('href' => array()), 'strong' => array())`. Use `wp_kses_post()` for post-style HTML (common tags). Use `wp_kses_data()` for data attributes. Always explicitly define allowed tags - never trust user HTML without filtering. `wp_kses()` is both sanitization (filtering) and escaping (making safe for output). Use when you need to preserve some HTML formatting.

- **Understand translation escaping functions**: `esc_html__()` combines translation and HTML escaping, `esc_attr__()` combines translation and attribute escaping, `esc_html_e()` translates and echoes with HTML escaping, `esc_attr_e()` translates and echoes with attribute escaping. These are convenience functions that do translation AND escaping in one step. Always use escaping versions when outputting translated strings to prevent XSS. Never use `__()` or `_e()` for output without escaping.

- **Know JavaScript escaping methods**: Use `esc_js()` for JavaScript strings: `var text = '<?php echo esc_js($text); ?>';`. Use `wp_json_encode()` for complex data (arrays, objects) - it properly encodes for JavaScript. Use `wp_localize_script()` to pass PHP data to JavaScript safely. Never output PHP variables directly in JavaScript - always escape. JavaScript context requires different escaping than HTML. `esc_js()` handles quotes, newlines, and special characters for JavaScript strings.
