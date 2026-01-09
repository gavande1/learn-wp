# WordPress Standards

## Overview

WordPress Coding Standards ensure code consistency, readability, and maintainability across the WordPress ecosystem. Following these standards is essential for enterprise development.

## PHP Coding Standards

### Naming Conventions

```php
// Functions: lowercase with underscores
function my_plugin_process_data() {}

// Classes: StudlyCaps
class My_Plugin_Data_Handler {}

// Class methods: lowercase with underscores
public function get_user_data() {}

// Constants: uppercase with underscores
define('MY_PLUGIN_VERSION', '1.0.0');
const MAX_ITEMS = 100;

// Variables: lowercase with underscores
$user_data = get_user_data();
$post_count = 0;

// Files: lowercase with hyphens
// class-my-plugin-handler.php
// my-plugin-functions.php
```

### Brace Style

```php
// Opening brace on same line
if ($condition) {
    // code
} elseif ($other_condition) {
    // code
} else {
    // code
}

// Functions and classes
function my_function() {
    // code
}

class My_Class {
    public function method() {
        // code
    }
}
```

### Spacing

```php
// Space after commas
my_function($arg1, $arg2, $arg3);

// Spaces around operators
$result = $a + $b;
if ($a === $b) {}

// Space after control structure keywords
if ($condition) {}
foreach ($items as $item) {}
while ($condition) {}

// No space after function names
my_function();
array_map();

// Array formatting
$array = array(
    'key1' => 'value1',
    'key2' => 'value2',
);

// Short array syntax (WordPress 5.4+)
$array = [
    'key1' => 'value1',
    'key2' => 'value2',
];
```

### Indentation

```php
// Use tabs, not spaces
function my_function() {
	$value = 'test';  // Tab indented
	if ($condition) {
		do_something();  // Tab indented
	}
}
```

### Yoda Conditions

```php
// Correct - constant on left
if ('value' === $variable) {}
if (true === $is_active) {}
if (null !== $result) {}

// Incorrect
if ($variable === 'value') {}
```

## JavaScript Coding Standards

### Naming

```javascript
// Variables and functions: camelCase
const userData = {};
function getUserData() {}

// Constants: SCREAMING_SNAKE_CASE
const MAX_ITEMS = 100;
const API_ENDPOINT = '/api/v1';

// Classes: PascalCase
class UserHandler {}

// jQuery objects: prefix with $
const $container = jQuery('.container');
```

### Modern JavaScript

```javascript
// Use const and let, avoid var
const immutableValue = 'constant';
let mutableValue = 'can change';

// Arrow functions for callbacks
items.map((item) => item.id);

// Template literals
const message = `Hello, ${userName}!`;

// Destructuring
const { id, name } = user;
const [first, second] = array;

// Spread operator
const newArray = [...existingArray, newItem];
const newObject = { ...existingObject, newProp: value };
```

### WordPress JavaScript Best Practices

```javascript
// Use wp.i18n for translations
import { __ } from '@wordpress/i18n';
const label = __('Submit', 'my-plugin');

// Use wp.apiFetch for REST requests
import apiFetch from '@wordpress/api-fetch';
apiFetch({ path: '/wp/v2/posts' }).then((posts) => {
    console.log(posts);
});

// Use wp.data for state management
import { useSelect, useDispatch } from '@wordpress/data';
```

## CSS Coding Standards

### Selectors

```css
/* Lowercase with hyphens */
.my-plugin-container {}
.my-plugin-header {}

/* Specific, not overly broad */
.my-plugin .button {} /* Good */
button {} /* Too broad */

/* Avoid IDs for styling */
.my-plugin-form {} /* Good */
#my-form {} /* Avoid */
```

### Properties Order

```css
.element {
    /* Positioning */
    position: absolute;
    top: 0;
    right: 0;
    z-index: 100;

    /* Display & Box Model */
    display: flex;
    width: 100%;
    padding: 10px;
    margin: 0;
    border: 1px solid #ccc;

    /* Typography */
    font-family: sans-serif;
    font-size: 16px;
    line-height: 1.5;
    color: #333;

    /* Visual */
    background-color: #fff;
    border-radius: 4px;

    /* Animation */
    transition: all 0.3s ease;
}
```

### WordPress-Specific CSS

```css
/* Use WordPress admin color classes */
.my-plugin-button {
    background-color: var(--wp-admin-theme-color);
}

/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
    .animated {
        animation: none;
    }
}
```

## Accessibility Standards (WCAG)

### Keyboard Navigation

```php
// Ensure interactive elements are focusable
<button type="button"><?php esc_html_e('Click Me', 'my-plugin'); ?></button>

// Add skip links
<a href="#main-content" class="screen-reader-text">
    <?php esc_html_e('Skip to content', 'my-plugin'); ?>
</a>
```

### ARIA Labels

```php
<nav aria-label="<?php esc_attr_e('Main navigation', 'my-plugin'); ?>">
    <!-- navigation content -->
</nav>

<button 
    aria-expanded="false" 
    aria-controls="dropdown-menu"
>
    <?php esc_html_e('Menu', 'my-plugin'); ?>
</button>
```

### Color Contrast

```css
/* Ensure 4.5:1 contrast ratio for normal text */
.my-plugin-text {
    color: #333;  /* Dark gray on white = good contrast */
}

/* 3:1 ratio for large text (18pt+) */
.my-plugin-heading {
    color: #666;
}
```

## Code Documentation

### PHPDoc

```php
/**
 * Process user data and return formatted result.
 *
 * @since 1.0.0
 *
 * @param int    $user_id   The user ID.
 * @param string $format    Output format. Accepts 'array', 'object'.
 *                          Default 'array'.
 * @param bool   $include_meta Whether to include user meta. Default false.
 *
 * @return array|object|WP_Error Formatted user data or error.
 */
function my_plugin_process_user($user_id, $format = 'array', $include_meta = false) {
    // Implementation
}

/**
 * User data handler class.
 *
 * @since 1.0.0
 */
class My_Plugin_User_Handler {
    /**
     * User ID.
     *
     * @since 1.0.0
     * @var int
     */
    private $user_id;

    /**
     * Constructor.
     *
     * @since 1.0.0
     *
     * @param int $user_id User ID.
     */
    public function __construct($user_id) {
        $this->user_id = $user_id;
    }
}
```

### JSDoc

```javascript
/**
 * Fetch and process user data.
 *
 * @since 1.0.0
 *
 * @param {number} userId - The user ID to fetch.
 * @param {Object} options - Fetch options.
 * @param {boolean} options.includeMeta - Include user meta.
 *
 * @return {Promise<Object>} User data object.
 */
async function fetchUserData(userId, options = {}) {
    // Implementation
}
```

## Tooling

### PHPCS Configuration

```xml
<!-- phpcs.xml -->
<?xml version="1.0"?>
<ruleset name="My Plugin Coding Standards">
    <description>PHPCS ruleset for My Plugin</description>
    
    <file>.</file>
    <exclude-pattern>/vendor/*</exclude-pattern>
    <exclude-pattern>/node_modules/*</exclude-pattern>
    
    <rule ref="WordPress"/>
    <rule ref="WordPress-Core"/>
    <rule ref="WordPress-Docs"/>
    <rule ref="WordPress-Extra"/>
    
    <config name="minimum_supported_wp_version" value="6.0"/>
    <config name="text_domain" value="my-plugin"/>
</ruleset>
```

### ESLint Configuration

```json
{
    "extends": ["plugin:@wordpress/eslint-plugin/recommended"],
    "rules": {
        "no-console": "warn"
    }
}
```

## Best Practices Summary

1. **Follow WordPress standards** - Use PHPCS/ESLint
2. **Document your code** - PHPDoc/JSDoc
3. **Write accessible code** - WCAG compliance
4. **Use modern PHP/JS** - Within WP requirements
5. **Be consistent** - Follow established patterns

## Exam Tips

- **Know naming conventions for PHP, JS, and CSS**: PHP: functions and variables use `snake_case`, classes use `PascalCase`, constants use `UPPER_CASE`, all prefixed with plugin/theme name. JavaScript: use `camelCase` for variables/functions, `PascalCase` for classes/components. CSS: use lowercase with hyphens for classes/IDs (`my-plugin-class`), BEM methodology recommended. WordPress has specific conventions - follow them for consistency and compatibility. Inconsistent naming makes code harder to maintain.

- **Understand Yoda conditions**: Yoda conditions put the constant on the left: `if (true === $value)` instead of `if ($value === true)`. This prevents accidental assignment (`if ($value = true)` is valid but wrong). WordPress coding standards recommend Yoda conditions for comparisons. However, modern PHP and many developers prefer normal order. The key is being consistent within your codebase. Understand both styles as you'll see both in WordPress code.

- **Know accessibility requirements**: Follow WCAG guidelines. Use semantic HTML (`<nav>`, `<main>`, `<article>`). Provide alt text for images. Use proper ARIA attributes when needed. Ensure keyboard navigation works. Maintain proper heading hierarchy. Ensure sufficient color contrast. Make forms accessible with labels. Test with screen readers. Accessibility isn't optional - it's required for inclusive websites. WordPress has accessibility standards that all code should follow.

- **Understand documentation standards**: Use PHPDoc for PHP: `@param`, `@return`, `@since`, `@throws` tags. Use JSDoc for JavaScript. Document functions, classes, and complex logic. Include parameter types and descriptions. Document hooks with `@hook` tag. Use inline comments for complex logic. Good documentation helps other developers (and future you) understand code. WordPress core is heavily documented - follow that example.

- **Be familiar with tooling (PHPCS, ESLint)**: PHPCS (PHP CodeSniffer) checks PHP code against WordPress coding standards. ESLint checks JavaScript code quality. Use `phpcs.xml` or `.phpcs.xml` for configuration. Use `.eslintrc` for JavaScript linting. These tools catch errors, enforce standards, and improve code quality. Many WordPress projects require passing PHPCS checks. Understanding tooling helps you write standards-compliant code and catch issues early.
