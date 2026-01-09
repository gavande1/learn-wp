# Block Editor Basic Architecture

## Overview

The Block Editor (Gutenberg) is WordPress's modern content editor. It treats content as discrete blocks that can be individually styled and arranged.

## Key Concepts

### Core Components

1. **Blocks** - Individual content units
2. **Block Types** - Templates for creating blocks
3. **Attributes** - Block data/configuration
4. **InnerBlocks** - Nested block capability
5. **Block Patterns** - Predefined block arrangements

### Architecture Layers

```
┌─────────────────────────────────────┐
│           React UI Layer            │
├─────────────────────────────────────┤
│         Block API (JS)              │
├─────────────────────────────────────┤
│     REST API Communication          │
├─────────────────────────────────────┤
│       PHP Block Registration        │
├─────────────────────────────────────┤
│         WordPress Database          │
└─────────────────────────────────────┘
```

## Block Registration

### Using block.json (Recommended)

```json
{
    "$schema": "https://schemas.wp.org/trunk/block.json",
    "apiVersion": 3,
    "name": "my-plugin/custom-block",
    "version": "1.0.0",
    "title": "Custom Block",
    "category": "widgets",
    "icon": "smiley",
    "description": "A custom block example",
    "keywords": ["example", "custom"],
    "supports": {
        "html": false,
        "color": {
            "background": true,
            "text": true
        },
        "typography": {
            "fontSize": true
        }
    },
    "attributes": {
        "content": {
            "type": "string",
            "source": "html",
            "selector": "p"
        },
        "alignment": {
            "type": "string",
            "default": "left"
        }
    },
    "textdomain": "my-plugin",
    "editorScript": "file:./index.js",
    "editorStyle": "file:./editor.css",
    "style": "file:./style.css",
    "render": "file:./render.php"
}
```

### PHP Registration

```php
// Register block from block.json
add_action('init', 'register_custom_block');

function register_custom_block() {
    register_block_type(__DIR__ . '/blocks/custom-block');
}

// Or manual registration
register_block_type('my-plugin/custom-block', array(
    'editor_script' => 'my-block-editor',
    'editor_style' => 'my-block-editor-style',
    'style' => 'my-block-style',
    'render_callback' => 'render_custom_block',
    'attributes' => array(
        'content' => array(
            'type' => 'string',
            'default' => '',
        ),
    ),
));
```

## Block JavaScript (Edit Component)

```javascript
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';

registerBlockType('my-plugin/custom-block', {
    edit: function Edit({ attributes, setAttributes }) {
        const { content, alignment } = attributes;
        const blockProps = useBlockProps({
            style: { textAlign: alignment }
        });

        return (
            <>
                <InspectorControls>
                    <PanelBody title="Settings">
                        <SelectControl
                            label="Alignment"
                            value={alignment}
                            options={[
                                { label: 'Left', value: 'left' },
                                { label: 'Center', value: 'center' },
                                { label: 'Right', value: 'right' },
                            ]}
                            onChange={(value) => setAttributes({ alignment: value })}
                        />
                    </PanelBody>
                </InspectorControls>
                <div {...blockProps}>
                    <RichText
                        tagName="p"
                        value={content}
                        onChange={(value) => setAttributes({ content: value })}
                        placeholder="Enter text..."
                    />
                </div>
            </>
        );
    },
    
    save: function Save({ attributes }) {
        const { content, alignment } = attributes;
        const blockProps = useBlockProps.save({
            style: { textAlign: alignment }
        });

        return (
            <div {...blockProps}>
                <RichText.Content tagName="p" value={content} />
            </div>
        );
    }
});
```

## Static vs Dynamic Blocks

### Static Blocks

Save function outputs HTML stored in post_content.

```javascript
save: function Save({ attributes }) {
    return (
        <div {...useBlockProps.save()}>
            <p>{attributes.content}</p>
        </div>
    );
}
```

### Dynamic Blocks

PHP renders output at runtime.

```php
// In block.json: "render": "file:./render.php"

// render.php
<?php
$content = $attributes['content'] ?? '';
$alignment = $attributes['alignment'] ?? 'left';
?>
<div <?php echo get_block_wrapper_attributes(); ?>>
    <p style="text-align: <?php echo esc_attr($alignment); ?>">
        <?php echo wp_kses_post($content); ?>
    </p>
</div>
```

```javascript
// In JS - return null from save for dynamic blocks
save: function() {
    return null;
}
```

## Block Attributes

### Attribute Sources

```javascript
attributes: {
    // From HTML element
    content: {
        type: 'string',
        source: 'html',
        selector: 'p'
    },
    
    // From attribute
    url: {
        type: 'string',
        source: 'attribute',
        selector: 'a',
        attribute: 'href'
    },
    
    // From text content
    title: {
        type: 'string',
        source: 'text',
        selector: '.title'
    },
    
    // Stored in comment delimiter (no source)
    showDate: {
        type: 'boolean',
        default: false
    }
}
```

## InnerBlocks

```javascript
import { InnerBlocks } from '@wordpress/block-editor';

// Allow specific blocks
const ALLOWED_BLOCKS = ['core/paragraph', 'core/heading', 'core/image'];

// Template for default content
const TEMPLATE = [
    ['core/heading', { placeholder: 'Title' }],
    ['core/paragraph', { placeholder: 'Content...' }]
];

function Edit() {
    return (
        <div {...useBlockProps()}>
            <InnerBlocks
                allowedBlocks={ALLOWED_BLOCKS}
                template={TEMPLATE}
                templateLock="all" // 'all', 'insert', false
            />
        </div>
    );
}

function Save() {
    return (
        <div {...useBlockProps.save()}>
            <InnerBlocks.Content />
        </div>
    );
}
```

## Block Supports

```json
{
    "supports": {
        "align": ["wide", "full"],
        "anchor": true,
        "className": true,
        "color": {
            "background": true,
            "text": true,
            "gradients": true
        },
        "spacing": {
            "margin": true,
            "padding": true
        },
        "typography": {
            "fontSize": true,
            "lineHeight": true
        },
        "html": false,
        "reusable": true
    }
}
```

## Block Patterns

```php
// Register a block pattern
register_block_pattern(
    'my-plugin/hero-section',
    array(
        'title' => 'Hero Section',
        'description' => 'A hero section with heading and CTA',
        'categories' => array('featured'),
        'content' => '<!-- wp:group {"align":"full"} -->
            <div class="wp-block-group alignfull">
                <!-- wp:heading {"level":1} -->
                <h1>Welcome</h1>
                <!-- /wp:heading -->
                <!-- wp:buttons -->
                <div class="wp-block-buttons">
                    <!-- wp:button -->
                    <div class="wp-block-button">
                        <a class="wp-block-button__link">Get Started</a>
                    </div>
                    <!-- /wp:button -->
                </div>
                <!-- /wp:buttons -->
            </div>
            <!-- /wp:group -->',
    )
);

// Register pattern category
register_block_pattern_category(
    'my-patterns',
    array('label' => 'My Patterns')
);
```

## Server-Side Rendering

```php
// Using render_callback
register_block_type('my-plugin/dynamic-block', array(
    'render_callback' => 'render_dynamic_block',
    'attributes' => array(
        'count' => array('type' => 'number', 'default' => 5)
    )
));

function render_dynamic_block($attributes, $content, $block) {
    $count = $attributes['count'];
    
    $posts = get_posts(array('numberposts' => $count));
    
    ob_start();
    ?>
    <div <?php echo get_block_wrapper_attributes(); ?>>
        <ul>
            <?php foreach ($posts as $post): ?>
                <li><?php echo esc_html($post->post_title); ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
    <?php
    return ob_get_clean();
}
```

## Best Practices

1. **Use block.json** - Standard, performant registration
2. **Enable block supports** - Leverage core functionality
3. **Consider dynamic blocks** - For content that changes
4. **Use proper escaping** - In both JS and PHP
5. **Follow React patterns** - Component-based architecture

## Exam Tips

- **Understand the difference between static and dynamic blocks**: Static blocks have a `save` function that outputs HTML stored in `post_content`. Dynamic blocks return `null` from `save` and use a PHP `render_callback` or `render` file to generate output at runtime. Use static blocks for content that doesn't change, dynamic blocks for content that needs server-side processing, database queries, or user-specific data.

- **Know how to register blocks using block.json**: `block.json` is the modern, recommended way to register blocks. It defines metadata, attributes, supports, scripts, and styles in a single JSON file. Use `register_block_type(__DIR__ . '/blocks/my-block')` to register from `block.json`, or manually with `register_block_type('namespace/block-name', $args)`. The JSON schema provides validation and better IDE support.

- **Understand attribute sources and types**: Attributes can have different sources: `html` (extract from HTML element), `attribute` (from HTML attribute), `text` (from text content), or no source (stored in comment delimiters). Types include `string`, `number`, `boolean`, `array`, `object`. The source determines how WordPress extracts attribute values from saved content. Understanding sources is crucial for migrating existing content or parsing HTML.

- **Know how to use InnerBlocks for nested content**: `InnerBlocks` allows blocks to contain other blocks, creating nested structures. Use `<InnerBlocks>` in the edit component and `<InnerBlocks.Content />` in save. Control allowed blocks with `allowedBlocks`, provide default content with `template`, and lock editing with `templateLock`. This is essential for container blocks like columns, groups, or custom layout blocks.

- **Understand the server-side rendering workflow**: For dynamic blocks, WordPress calls the `render_callback` function (or includes the `render` file) with `$attributes`, `$content`, and `$block` parameters. The callback should return HTML string, use `get_block_wrapper_attributes()` for wrapper attributes, and properly escape all output. Server-side rendering happens on every page load, allowing dynamic content generation from database queries or user context.
