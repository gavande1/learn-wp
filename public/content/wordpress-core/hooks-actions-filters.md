# Hooks (Actions and Filters)

## Overview

Hooks are the backbone of WordPress extensibility. They allow you to "hook into" WordPress at specific points to run your own code or modify data without editing core files.

## Key Concepts

### Actions vs Filters

**Actions** are used to execute code at specific points. They don't return anything.

**Filters** are used to modify data. They must return a value.

## Basic Examples

### Adding an Action

```php
// Add custom code when WordPress initializes
add_action('init', 'my_custom_init_function');

function my_custom_init_function() {
    // Your code here
    register_post_type('book', array(
        'public' => true,
        'label'  => 'Books'
    ));
}
```

### Adding a Filter

```php
// Modify the post title
add_filter('the_title', 'my_custom_title_filter', 10, 2);

function my_custom_title_filter($title, $post_id) {
    if (get_post_type($post_id) === 'book') {
        return '📚 ' . $title;
    }
    return $title;
}
```

## Hook Priority

The third parameter in `add_action()` and `add_filter()` is priority (default: 10). Lower numbers run earlier.

```php
// This runs first (priority 5)
add_action('init', 'run_first', 5);

// This runs second (priority 10, default)
add_action('init', 'run_second');

// This runs last (priority 99)
add_action('init', 'run_last', 99);
```

## Important Core Hooks

### Common Actions

| Hook | When It Fires |
|------|---------------|
| `init` | After WordPress loads but before headers |
| `wp_enqueue_scripts` | When scripts/styles should be enqueued |
| `admin_init` | First thing in admin screens |
| `save_post` | When a post is saved |
| `wp_footer` | Before closing body tag |

### Common Filters

| Filter | What It Modifies |
|--------|------------------|
| `the_content` | Post content before display |
| `the_title` | Post title before display |
| `body_class` | CSS classes on body tag |
| `query_vars` | Query variables |

## Creating Custom Hooks

```php
// In your plugin/theme - create a custom action
do_action('my_plugin_before_output', $data);

// In your plugin/theme - create a custom filter
$output = apply_filters('my_plugin_modify_output', $original_output);

// Other code can then hook in
add_action('my_plugin_before_output', function($data) {
    error_log('Data: ' . print_r($data, true));
});
```

## Best Practices

1. **Use specific hooks** - Choose the most specific hook for your use case
2. **Check hook availability** - Use `did_action()` to check if an action has fired
3. **Remove hooks properly** - Use `remove_action()` and `remove_filter()` when needed
4. **Document your hooks** - Make custom hooks discoverable for other developers

## Common Pitfalls

- **Forgetting to return in filters** - Filters must return a value
- **Incorrect priority** - Your hook may run at the wrong time
- **Hooking too early** - Some hooks require WordPress to be fully loaded
- **Memory leaks** - Not removing hooks in long-running processes

## Exam Tips

- **Know the difference between `do_action()` and `apply_filters()`**: `do_action()` is used to fire actions that execute code at specific points and don't return values, while `apply_filters()` is used to modify data and must return a value. Actions are for "doing something" while filters are for "changing something."

- **Understand hook priority and accepted arguments**: Hook priority (the third parameter) determines execution order - lower numbers run earlier. The fourth parameter specifies how many arguments the callback function accepts. Understanding this is crucial for controlling when your code runs and ensuring it receives the correct data.

- **Be familiar with common core hooks and when they fire**: Know key hooks like `init` (after WordPress loads), `wp_enqueue_scripts` (for enqueuing assets), `save_post` (when posts are saved), and their timing in the WordPress load sequence. This helps you choose the right hook for your use case.

- **Know how to debug hook conflicts**: Use functions like `did_action()` to check if an action has fired, inspect hook callbacks with `$wp_filter`, and use tools like Query Monitor to see all registered hooks. Understanding hook conflicts helps troubleshoot issues where code runs at the wrong time or doesn't execute at all.
