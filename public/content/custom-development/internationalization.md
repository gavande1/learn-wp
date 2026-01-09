# Internationalization (i18n)

## Overview

Internationalization prepares your code for translation into different languages. WordPress provides a robust system using gettext for managing translations.

## Key Concepts

### Terminology

- **i18n** - Internationalization (preparing for translation)
- **l10n** - Localization (actual translation)
- **Text Domain** - Unique identifier for your translations
- **POT** - Portable Object Template (source strings)
- **PO** - Portable Object (translations)
- **MO** - Machine Object (compiled translations)

## Translation Functions

### Basic Functions

```php
// Simple string
$text = __('Hello World', 'my-plugin');

// Echo directly
_e('Hello World', 'my-plugin');

// With context for translators
$text = _x('Post', 'noun', 'my-plugin');
_ex('Post', 'noun', 'my-plugin');

// Singular/plural
$text = _n(
    '%d item',
    '%d items',
    $count,
    'my-plugin'
);
printf($text, $count);

// Singular/plural with context
$text = _nx(
    '%d item',
    '%d items',
    $count,
    'cart items',
    'my-plugin'
);
```

### Escaping While Translating

```php
// Escape and translate together
echo esc_html__('Hello World', 'my-plugin');
echo esc_attr__('Button Text', 'my-plugin');

// Echo versions
esc_html_e('Hello World', 'my-plugin');
esc_attr_e('Button Text', 'my-plugin');

// With context
echo esc_html_x('Post', 'noun', 'my-plugin');
```

### Variables in Translations

```php
// WRONG - Translator can't see context
__("Hello $name", 'my-plugin');

// CORRECT - Use printf/sprintf
printf(
    /* translators: %s: User name */
    __('Hello %s', 'my-plugin'),
    $name
);

// Multiple placeholders
printf(
    /* translators: 1: User name, 2: Date */
    __('Hello %1$s, today is %2$s', 'my-plugin'),
    $name,
    $date
);
```

## Loading Text Domains

### Plugins

```php
// Load plugin translations
add_action('init', 'my_plugin_load_textdomain');

function my_plugin_load_textdomain() {
    load_plugin_textdomain(
        'my-plugin',
        false,
        dirname(plugin_basename(__FILE__)) . '/languages'
    );
}
```

### Themes

```php
// Load theme translations
add_action('after_setup_theme', 'my_theme_load_textdomain');

function my_theme_load_textdomain() {
    load_theme_textdomain('my-theme', get_template_directory() . '/languages');
}
```

## JavaScript Translations

### Setting Up

```php
// Register script with translation support
wp_register_script(
    'my-plugin-script',
    plugins_url('js/script.js', __FILE__),
    array('wp-i18n'),
    '1.0.0',
    true
);

// Set script translations
wp_set_script_translations(
    'my-plugin-script',
    'my-plugin',
    plugin_dir_path(__FILE__) . 'languages'
);

wp_enqueue_script('my-plugin-script');
```

### Using in JavaScript

```javascript
import { __, _n, sprintf } from '@wordpress/i18n';

// Basic translation
const text = __('Hello World', 'my-plugin');

// With placeholders
const greeting = sprintf(
    /* translators: %s: User name */
    __('Hello %s', 'my-plugin'),
    userName
);

// Singular/plural
const itemText = sprintf(
    _n(
        '%d item in cart',
        '%d items in cart',
        itemCount,
        'my-plugin'
    ),
    itemCount
);
```

### In Block Editor

```javascript
import { __ } from '@wordpress/i18n';

registerBlockType('my-plugin/my-block', {
    title: __('My Block', 'my-plugin'),
    description: __('A custom block', 'my-plugin'),
    // ...
});
```

## Creating Translation Files

### Generate POT File

Using WP-CLI:

```bash
# Generate POT from plugin
wp i18n make-pot . languages/my-plugin.pot

# With specific options
wp i18n make-pot . languages/my-plugin.pot \
    --domain=my-plugin \
    --include="*.php,src/*.js" \
    --skip-audit
```

### Generate JSON Files for JavaScript

```bash
# Create JSON translation files
wp i18n make-json languages/ --no-purge
```

## File Structure

```
my-plugin/
├── languages/
│   ├── my-plugin.pot              # Template file
│   ├── my-plugin-de_DE.po         # German translation
│   ├── my-plugin-de_DE.mo         # Compiled German
│   ├── my-plugin-de_DE-script.json # JS translations
│   ├── my-plugin-fr_FR.po         # French translation
│   └── my-plugin-fr_FR.mo         # Compiled French
├── my-plugin.php
└── ...
```

## Translator Comments

```php
// Provide context for translators
printf(
    /* translators: %s: Plugin name */
    __('Thank you for installing %s!', 'my-plugin'),
    $plugin_name
);

/* translators: This appears in the admin menu */
$menu_title = __('Settings', 'my-plugin');

// Multi-line comments
/*
 * translators: This message appears when a user completes
 * the registration process. %1$s is their username,
 * %2$s is their email address.
 */
printf(
    __('Welcome %1$s! A confirmation has been sent to %2$s.', 'my-plugin'),
    $username,
    $email
);
```

## Date and Number Formatting

```php
// Dates (locale-aware)
$date = date_i18n(get_option('date_format'), $timestamp);
$time = date_i18n(get_option('time_format'), $timestamp);

// Numbers
$formatted = number_format_i18n($number, 2);

// Currency (requires additional handling)
// WordPress doesn't have built-in currency formatting
```

## RTL Support

```php
// Check if RTL
if (is_rtl()) {
    wp_enqueue_style('my-plugin-rtl', plugins_url('css/rtl.css', __FILE__));
}

// Or use automatic RTL stylesheets
wp_enqueue_style(
    'my-plugin-style',
    plugins_url('css/style.css', __FILE__)
);
// WordPress will look for style-rtl.css automatically
```

```css
/* In your CSS - use logical properties */
.sidebar {
    margin-inline-start: 20px;  /* Instead of margin-left */
    padding-inline-end: 10px;   /* Instead of padding-right */
}
```

## Best Practices

1. **Translate all user-facing strings** - Even error messages
2. **Use context when needed** - Same word, different meanings
3. **Provide translator comments** - Explain placeholders
4. **Don't concatenate translations** - Word order varies
5. **Keep sentences together** - Don't split translatable strings

## Common Pitfalls

- Concatenating translated strings
- Variables inside translation functions
- Missing text domain
- Not escaping translated output
- Forgetting to load text domain

## Example: Proper vs Improper

```php
// WRONG - Can't translate properly
__('There are ', 'my-plugin') . $count . __(' items', 'my-plugin');

// WRONG - Variable inside translation
__("Welcome, $name!", 'my-plugin');

// WRONG - HTML inside translation
__('<strong>Bold</strong> text', 'my-plugin');

// CORRECT
printf(
    /* translators: %d: Number of items */
    _n('There is %d item', 'There are %d items', $count, 'my-plugin'),
    $count
);

// CORRECT
printf(__('Welcome, %s!', 'my-plugin'), esc_html($name));

// CORRECT - HTML outside
'<strong>' . esc_html__('Bold', 'my-plugin') . '</strong>' . 
esc_html__(' text', 'my-plugin');

// Or use allowed HTML
printf(
    /* translators: %s: Opening/closing bold tags */
    __('%1$sBold%2$s text', 'my-plugin'),
    '<strong>',
    '</strong>'
);
```

## Exam Tips

- **Know all the translation functions and when to use each**: `__()` returns translated string, `_e()` echoes it. `_x()` and `_ex()` add context for ambiguous strings. `_n()` handles singular/plural forms. `_nx()` combines context with plural. Escaping versions: `esc_html__()`, `esc_attr__()`, `esc_html_e()`, `esc_attr_e()`. Use `__()` when assigning to variable, `_e()` when outputting directly. Always use escaping versions for output to prevent XSS.

- **Understand the difference between __, _e, esc_html__, etc.**: `__()` returns the translated string (use when assigning to variable). `_e()` echoes the translated string directly. `esc_html__()` returns translated and HTML-escaped string. `esc_attr__()` returns translated and attribute-escaped string. The `_e` versions echo directly, non-echo versions return values. Always use escaping versions (`esc_html__`, `esc_attr__`) when outputting to prevent XSS attacks.

- **Know how to properly handle variables in translations**: Never put variables inside translation strings (e.g., `__("Hello $name")`). Use `printf()` or `sprintf()` with placeholders: `printf(__('Hello %s', 'textdomain'), $name)`. Use numbered placeholders for multiple variables: `%1$s`, `%2$d`. Always include translator comments: `/* translators: %s: User name */`. This allows translators to reorder placeholders and understand context.

- **Understand the file structure for translations**: Translations go in `/languages/` directory. Files: `{textdomain}-{locale}.po` (source), `{textdomain}-{locale}.mo` (compiled). For plugins: `wp-content/plugins/my-plugin/languages/`. For themes: `wp-content/themes/my-theme/languages/`. Use `load_plugin_textdomain()` or `load_theme_textdomain()` to load. WordPress automatically loads `{textdomain}-{locale}.mo` from the languages directory.

- **Know how to set up JavaScript translations**: Use `wp_set_script_translations($handle, $domain, $path)` to register translations for JavaScript. Generate JSON translation files using `wp i18n make-json` WP-CLI command. Files are `{domain}-{locale}-{hash}.json` in the languages directory. Access translations in JS via `wp.i18n.__()`, `wp.i18n._x()`, `wp.i18n._n()`. The script must be registered as a module or have translations registered before enqueuing.
