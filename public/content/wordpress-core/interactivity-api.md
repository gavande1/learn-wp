# Interactivity API

## Overview

The Interactivity API (introduced in WordPress 6.5) provides a standardized way to add client-side interactivity to blocks without requiring full JavaScript frameworks. It enables reactive, stateful behavior using directives.

## Key Concepts

### What It Enables

- Reactive state management in blocks
- Client-side interactivity without React/Vue
- Server-rendered content with progressive enhancement
- Accessible, performant interactions

### Core Directives

| Directive | Purpose |
|-----------|---------|
| `data-wp-interactive` | Define interactive region |
| `data-wp-context` | Provide local state |
| `data-wp-bind` | Bind attributes |
| `data-wp-class` | Toggle classes |
| `data-wp-style` | Dynamic styles |
| `data-wp-text` | Set text content |
| `data-wp-on` | Event handlers |
| `data-wp-watch` | Side effects |

## Basic Usage

### Server-Side (PHP)

```php
<?php
// render.php for your block
$context = array(
    'isOpen' => false,
    'count' => 0,
);
?>

<div 
    <?php echo get_block_wrapper_attributes(); ?>
    data-wp-interactive="myPlugin"
    <?php echo wp_interactivity_data_wp_context($context); ?>
>
    <button 
        data-wp-on--click="actions.toggle"
        data-wp-bind--aria-expanded="context.isOpen"
    >
        Toggle
    </button>
    
    <div data-wp-bind--hidden="!context.isOpen">
        <p>Hidden content revealed!</p>
        <p>Count: <span data-wp-text="context.count"></span></p>
        <button data-wp-on--click="actions.increment">
            Increment
        </button>
    </div>
</div>
```

### Client-Side (JavaScript)

```javascript
// view.js
import { store, getContext } from '@wordpress/interactivity';

store('myPlugin', {
    actions: {
        toggle() {
            const context = getContext();
            context.isOpen = !context.isOpen;
        },
        increment() {
            const context = getContext();
            context.count++;
        },
    },
    callbacks: {
        logState() {
            const context = getContext();
            console.log('Current count:', context.count);
        },
    },
});
```

### Block.json Setup

```json
{
    "name": "my-plugin/interactive-block",
    "title": "Interactive Block",
    "viewScriptModule": "file:./view.js",
    "supports": {
        "interactivity": true
    }
}
```

## Directives In Depth

### data-wp-context

Defines local state scoped to an element and its descendants.

```php
<?php
$context = array(
    'user' => array(
        'name' => 'John',
        'email' => 'john@example.com'
    ),
    'isEditing' => false,
);
?>
<div data-wp-interactive="myPlugin"
     <?php echo wp_interactivity_data_wp_context($context); ?>>
    <span data-wp-text="context.user.name"></span>
</div>
```

### data-wp-bind

Binds element attributes to state values.

```html
<a data-wp-bind--href="context.url"
   data-wp-bind--class="context.linkClass">
    Link
</a>

<input data-wp-bind--value="context.inputValue"
       data-wp-bind--disabled="context.isDisabled">

<img data-wp-bind--src="context.imageUrl"
     data-wp-bind--alt="context.imageAlt">
```

### data-wp-class

Toggles CSS classes based on state.

```html
<div data-wp-class--active="context.isActive"
     data-wp-class--loading="state.isLoading"
     data-wp-class--error="context.hasError">
    Content
</div>
```

### data-wp-style

Sets inline styles dynamically.

```html
<div data-wp-style--color="context.textColor"
     data-wp-style--background-color="context.bgColor"
     data-wp-style--display="context.isVisible ? 'block' : 'none'">
    Styled content
</div>
```

### data-wp-on

Attaches event handlers.

```html
<button data-wp-on--click="actions.handleClick">Click</button>
<input data-wp-on--input="actions.handleInput"
       data-wp-on--focus="actions.handleFocus"
       data-wp-on--blur="actions.handleBlur">
<form data-wp-on--submit="actions.handleSubmit">
```

### data-wp-watch

Runs side effects when state changes.

```html
<div data-wp-watch="callbacks.onCountChange">
    Count: <span data-wp-text="context.count"></span>
</div>
```

```javascript
store('myPlugin', {
    callbacks: {
        onCountChange() {
            const context = getContext();
            // Runs whenever context.count changes
            if (context.count > 10) {
                console.log('Count exceeded 10!');
            }
        },
    },
});
```

## Global State vs Context

### Global State

Shared across all instances of the store.

```javascript
store('myPlugin', {
    state: {
        globalCounter: 0,
        settings: {
            theme: 'dark',
        },
    },
    actions: {
        incrementGlobal() {
            const { state } = store('myPlugin');
            state.globalCounter++;
        },
    },
});
```

```html
<span data-wp-text="state.globalCounter"></span>
```

### Local Context

Scoped to specific elements.

```php
<div data-wp-context='{"localCount": 0}'>
    <span data-wp-text="context.localCount"></span>
</div>

<div data-wp-context='{"localCount": 100}'>
    <!-- Different instance, different context -->
    <span data-wp-text="context.localCount"></span>
</div>
```

## Async Operations

```javascript
store('myPlugin', {
    actions: {
        *fetchData() {
            const context = getContext();
            const { state } = store('myPlugin');
            
            state.isLoading = true;
            
            try {
                const response = yield fetch('/wp-json/wp/v2/posts');
                const posts = yield response.json();
                context.posts = posts;
            } catch (error) {
                context.error = error.message;
            } finally {
                state.isLoading = false;
            }
        },
    },
});
```

## Accessing DOM Elements

```javascript
store('myPlugin', {
    actions: {
        handleClick() {
            const context = getContext();
            const element = getElement();
            
            // Access the actual DOM element
            console.log(element.ref);  // DOM reference
            console.log(element.attributes);  // Attributes
        },
    },
});
```

## Complete Example: Accordion

### PHP (render.php)

```php
<?php
$items = array(
    array('title' => 'Section 1', 'content' => 'Content 1'),
    array('title' => 'Section 2', 'content' => 'Content 2'),
);
?>

<div <?php echo get_block_wrapper_attributes(); ?>
     data-wp-interactive="myPlugin/accordion">
    <?php foreach ($items as $index => $item): 
        $item_context = array('isOpen' => $index === 0);
    ?>
    <div class="accordion-item"
         <?php echo wp_interactivity_data_wp_context($item_context); ?>>
        <button 
            class="accordion-header"
            data-wp-on--click="actions.toggle"
            data-wp-bind--aria-expanded="context.isOpen">
            <?php echo esc_html($item['title']); ?>
        </button>
        <div class="accordion-content"
             data-wp-bind--hidden="!context.isOpen">
            <?php echo wp_kses_post($item['content']); ?>
        </div>
    </div>
    <?php endforeach; ?>
</div>
```

### JavaScript (view.js)

```javascript
import { store, getContext } from '@wordpress/interactivity';

store('myPlugin/accordion', {
    actions: {
        toggle() {
            const context = getContext();
            context.isOpen = !context.isOpen;
        },
    },
});
```

## Best Practices

1. **Progressive enhancement** - Work without JS when possible
2. **Keep state minimal** - Only store what's needed
3. **Use context for local state** - Global state for shared data
4. **Follow accessibility** - Use proper ARIA attributes
5. **Test without JS** - Ensure graceful degradation

## Common Pitfalls

- Storing too much in global state
- Not handling loading/error states
- Missing accessibility attributes
- Complex nested contexts
- Not testing server-rendered state

## Exam Tips

- **Understand the difference between state and context**: Global `state` is shared across all instances of a store namespace and accessed via `store('namespace').state`. Local `context` is scoped to specific elements via `data-wp-context` and accessed via `getContext()`. Use state for shared data (like settings or global counters), context for instance-specific data (like whether an accordion item is open). Each block instance can have its own context but shares state.

- **Know all the available directives**: `data-wp-interactive` defines the interactive region and namespace. `data-wp-context` provides local state. `data-wp-bind` binds HTML attributes to values. `data-wp-class` toggles CSS classes. `data-wp-style` sets inline styles. `data-wp-text` sets text content. `data-wp-on` attaches event handlers (e.g., `data-wp-on--click`). `data-wp-watch` runs side effects on state changes. Understanding these directives is essential for building interactive blocks.

- **Understand how to set up blocks for interactivity**: Enable in `block.json` with `"supports": { "interactivity": true }` and add `"viewScriptModule": "file:./view.js"`. Register the store in JavaScript with `store('namespace', { actions, callbacks, state })`. Use `data-wp-interactive="namespace"` in PHP render output. Use `wp_interactivity_data_wp_context()` helper to output context safely. The block must be registered and the view script must be enqueued.

- **Know how to handle async operations**: Use generator functions (`*functionName()`) for async actions. Use `yield` for promises (fetch, API calls). Handle loading states by setting `state.isLoading = true` before async operations and `false` after. Use try-catch-finally for error handling. The Interactivity API handles generator functions automatically, making async operations straightforward without complex promise chains.

- **Understand progressive enhancement principles**: Blocks should work without JavaScript - server-rendered content should be functional. JavaScript enhances the experience with interactivity. Use semantic HTML, proper ARIA attributes, and ensure core functionality works server-side. Test with JavaScript disabled to ensure graceful degradation. The Interactivity API is designed for progressive enhancement - it enhances rather than replaces server-rendered content.
