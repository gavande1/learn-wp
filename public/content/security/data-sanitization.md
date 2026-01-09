# Data Sanitization

## Overview

Data sanitization cleans and normalizes input data to ensure it's safe and in the expected format. It's a critical security practice that must be applied to all untrusted data.

## Key Concepts

### Sanitization vs Validation vs Escaping

| Method | Purpose | When to Use |
|--------|---------|-------------|
| **Sanitization** | Clean/normalize data | Before storing or processing |
| **Validation** | Verify data meets rules | Before accepting input |
| **Escaping** | Make safe for output | Before displaying |

## WordPress Sanitization Functions

### Text Sanitization

```php
// Basic text field - strips tags and encodes
$clean = sanitize_text_field($_POST['name']);

// Allow some HTML tags
$allowed = wp_kses($_POST['content'], array(
    'a' => array('href' => array()),
    'strong' => array(),
    'em' => array(),
));

// Full post content sanitization
$content = wp_kses_post($_POST['content']);

// Textarea - preserves line breaks
$text = sanitize_textarea_field($_POST['description']);
```

### Number Sanitization

```php
// Positive integer
$id = absint($_POST['id']);  // Returns 0 if negative

// Any integer
$number = intval($_POST['quantity']);

// Float
$price = floatval($_POST['price']);
```

### URL and Email Sanitization

```php
// Clean URL
$url = esc_url_raw($_POST['website']);

// Clean email
$email = sanitize_email($_POST['email']);

// Sanitize for database query
$url = sanitize_url($_POST['link']);
```

### File Sanitization

```php
// Clean filename
$filename = sanitize_file_name($_POST['filename']);

// Clean path
$path = sanitize_file_path($_POST['path']);

// Clean MIME type
$mime = sanitize_mime_type($_FILES['upload']['type']);
```

### Key and Slug Sanitization

```php
// Lowercase, alphanumeric, hyphens
$slug = sanitize_title($_POST['title']);

// Key format (lowercase, alphanumeric, underscores, hyphens)
$key = sanitize_key($_POST['meta_key']);

// HTML class name
$class = sanitize_html_class($_POST['class']);
```

## Sanitizing Arrays

```php
// Sanitize array of text values
$tags = array_map('sanitize_text_field', $_POST['tags']);

// Sanitize array of integers
$ids = array_map('absint', $_POST['ids']);

// Custom array sanitization
function sanitize_settings($input) {
    $sanitized = array();
    
    $sanitized['title'] = sanitize_text_field($input['title'] ?? '');
    $sanitized['count'] = absint($input['count'] ?? 0);
    $sanitized['enabled'] = !empty($input['enabled']);
    $sanitized['email'] = sanitize_email($input['email'] ?? '');
    
    return $sanitized;
}
```

## Sanitizing for Database

```php
global $wpdb;

// Use prepare() for queries
$results = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->posts} WHERE post_author = %d AND post_status = %s",
        absint($_GET['author']),
        sanitize_key($_GET['status'])
    )
);

// Sanitize for LIKE queries
$search = '%' . $wpdb->esc_like(sanitize_text_field($_GET['search'])) . '%';
$results = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->posts} WHERE post_title LIKE %s",
        $search
    )
);
```

## wp_kses() Deep Dive

```php
// Define allowed HTML
$allowed_html = array(
    'a' => array(
        'href' => array(),
        'title' => array(),
        'target' => array(),
        'rel' => array(),
    ),
    'img' => array(
        'src' => array(),
        'alt' => array(),
        'class' => array(),
    ),
    'p' => array('class' => array()),
    'br' => array(),
    'strong' => array(),
    'em' => array(),
    'ul' => array(),
    'ol' => array(),
    'li' => array(),
);

$clean = wp_kses($untrusted_html, $allowed_html);

// Use predefined sets
$clean = wp_kses($html, 'post');  // Allow post content tags
$clean = wp_kses($html, 'data');  // Allow data attributes

// Strip all HTML
$text = wp_kses($html, array());
```

## REST API Sanitization

```php
register_rest_route('my-plugin/v1', '/items', array(
    'methods' => 'POST',
    'callback' => 'create_item',
    'args' => array(
        'title' => array(
            'required' => true,
            'sanitize_callback' => 'sanitize_text_field',
        ),
        'content' => array(
            'sanitize_callback' => 'wp_kses_post',
        ),
        'quantity' => array(
            'sanitize_callback' => 'absint',
        ),
    ),
));
```

## Custom Sanitization Functions

```php
// Custom sanitizer for specific format
function sanitize_phone_number($phone) {
    // Remove everything except digits
    return preg_replace('/[^0-9]/', '', $phone);
}

// Sanitize hex color
function sanitize_hex_color($color) {
    if (preg_match('/^#([a-fA-F0-9]{3}){1,2}$/', $color)) {
        return $color;
    }
    return '';
}

// Sanitize with whitelist
function sanitize_status($status) {
    $allowed = array('draft', 'pending', 'publish');
    return in_array($status, $allowed, true) ? $status : 'draft';
}
```

## Best Practices

1. **Sanitize early** - As soon as data enters your code
2. **Use appropriate functions** - Match sanitization to data type
3. **Never trust input** - Even from logged-in users
4. **Sanitize before storing** - Database, options, meta
5. **Chain with validation** - Sanitize AND validate

## Common Pitfalls

- Using wrong sanitization function
- Sanitizing too late (after using data)
- Skipping sanitization for "trusted" sources
- Not sanitizing array values individually
- Over-sanitizing (losing valid data)

## Exam Tips

- **Know all core sanitization functions**: Key functions include `sanitize_text_field()` (text input), `sanitize_textarea_field()` (preserves line breaks), `sanitize_email()` (email addresses), `sanitize_url()` (URLs), `absint()` (positive integers), `sanitize_key()` (keys/slugs), `sanitize_file_name()` (filenames), and `wp_kses()` variants for HTML. Each function is designed for specific data types and contexts.

- **Understand the difference from escaping**: Sanitization cleans and normalizes data before storing it in the database or using it in code. Escaping makes data safe for output in HTML, JavaScript, or URLs. Sanitize on input (when receiving data), escape on output (when displaying data). They serve different purposes in the security chain - sanitization prevents bad data from entering, escaping prevents XSS attacks on output.

- **Know when to use wp_kses() variants**: Use `wp_kses()` when you need to allow specific HTML tags and attributes. Use `wp_kses_post()` for post content (allows standard post HTML). Use `wp_kses_data()` for data attributes. Use `wp_kses()` with custom allowed HTML array for fine-grained control. Use empty array `wp_kses($html, array())` to strip all HTML. Always define allowed tags explicitly - never trust user HTML without filtering.

- **Understand database-specific sanitization**: Use `$wpdb->prepare()` with placeholders (`%s` for strings, `%d` for integers, `%f` for floats) for SQL queries. Use `$wpdb->esc_like()` for LIKE queries to escape wildcards. Use `absint()` for IDs and counts. Never concatenate unsanitized data into SQL queries. `$wpdb->prepare()` handles both sanitization and escaping for database queries, preventing SQL injection.

- **Know how to create custom sanitizers**: Create functions that accept untrusted input and return cleaned data. Use whitelist approach (allow only known good values) rather than blacklist. Validate format with regex or type checking. Return safe default if input is invalid. Use `apply_filters()` to allow customization. Custom sanitizers should follow WordPress patterns and be documented clearly. Always test edge cases and malicious input.
