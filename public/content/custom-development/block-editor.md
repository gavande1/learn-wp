# Block Editor Development

## Overview

Block Editor development involves creating custom blocks, block themes, patterns, and variations using modern JavaScript (React) and PHP.

## Key Concepts

### Block Development Stack

- **@wordpress/scripts** - Build tooling
- **@wordpress/blocks** - Block registration
- **@wordpress/block-editor** - Editor components
- **@wordpress/components** - UI components

## Setting Up Development Environment

### Package.json

```json
{
    "name": "my-blocks",
    "scripts": {
        "build": "wp-scripts build",
        "start": "wp-scripts start",
        "format": "wp-scripts format",
        "lint:js": "wp-scripts lint-js"
    },
    "devDependencies": {
        "@wordpress/scripts": "^26.0.0"
    }
}
```

### Project Structure

```
my-plugin/
├── build/
├── src/
│   └── blocks/
│       └── my-block/
│           ├── block.json
│           ├── index.js
│           ├── edit.js
│           ├── save.js
│           ├── editor.scss
│           └── style.scss
├── my-plugin.php
└── package.json
```

## Creating Custom Blocks

### block.json

```json
{
    "$schema": "https://schemas.wp.org/trunk/block.json",
    "apiVersion": 3,
    "name": "my-plugin/testimonial",
    "version": "1.0.0",
    "title": "Testimonial",
    "category": "widgets",
    "icon": "format-quote",
    "description": "Display a customer testimonial",
    "keywords": ["quote", "review", "feedback"],
    "supports": {
        "html": false,
        "align": ["wide", "full"],
        "color": {
            "background": true,
            "text": true
        }
    },
    "attributes": {
        "quote": {
            "type": "string",
            "source": "html",
            "selector": ".testimonial-quote"
        },
        "author": {
            "type": "string",
            "source": "text",
            "selector": ".testimonial-author"
        },
        "imageId": {
            "type": "number"
        },
        "imageUrl": {
            "type": "string"
        }
    },
    "editorScript": "file:./index.js",
    "editorStyle": "file:./index.css",
    "style": "file:./style-index.css"
}
```

### index.js (Entry Point)

```javascript
import { registerBlockType } from '@wordpress/blocks';
import Edit from './edit';
import Save from './save';
import metadata from './block.json';
import './editor.scss';
import './style.scss';

registerBlockType(metadata.name, {
    edit: Edit,
    save: Save,
});
```

### edit.js (Editor Component)

```javascript
import { __ } from '@wordpress/i18n';
import {
    useBlockProps,
    RichText,
    MediaUpload,
    MediaUploadCheck,
    InspectorControls,
} from '@wordpress/block-editor';
import {
    PanelBody,
    Button,
} from '@wordpress/components';

export default function Edit({ attributes, setAttributes }) {
    const { quote, author, imageId, imageUrl } = attributes;
    const blockProps = useBlockProps();

    const onSelectImage = (media) => {
        setAttributes({
            imageId: media.id,
            imageUrl: media.url,
        });
    };

    return (
        <>
            <InspectorControls>
                <PanelBody title={__('Image Settings', 'my-plugin')}>
                    <MediaUploadCheck>
                        <MediaUpload
                            onSelect={onSelectImage}
                            allowedTypes={['image']}
                            value={imageId}
                            render={({ open }) => (
                                <Button onClick={open} variant="secondary">
                                    {imageId ? __('Replace Image', 'my-plugin') : __('Add Image', 'my-plugin')}
                                </Button>
                            )}
                        />
                    </MediaUploadCheck>
                </PanelBody>
            </InspectorControls>

            <figure {...blockProps}>
                {imageUrl && (
                    <img src={imageUrl} alt="" className="testimonial-image" />
                )}
                <blockquote>
                    <RichText
                        tagName="p"
                        className="testimonial-quote"
                        value={quote}
                        onChange={(value) => setAttributes({ quote: value })}
                        placeholder={__('Enter testimonial...', 'my-plugin')}
                    />
                </blockquote>
                <figcaption>
                    <RichText
                        tagName="cite"
                        className="testimonial-author"
                        value={author}
                        onChange={(value) => setAttributes({ author: value })}
                        placeholder={__('Author name', 'my-plugin')}
                    />
                </figcaption>
            </figure>
        </>
    );
}
```

### save.js (Frontend Output)

```javascript
import { useBlockProps, RichText } from '@wordpress/block-editor';

export default function Save({ attributes }) {
    const { quote, author, imageUrl } = attributes;
    const blockProps = useBlockProps.save();

    return (
        <figure {...blockProps}>
            {imageUrl && (
                <img src={imageUrl} alt="" className="testimonial-image" />
            )}
            <blockquote>
                <RichText.Content
                    tagName="p"
                    className="testimonial-quote"
                    value={quote}
                />
            </blockquote>
            <figcaption>
                <RichText.Content
                    tagName="cite"
                    className="testimonial-author"
                    value={author}
                />
            </figcaption>
        </figure>
    );
}
```

## Block Variations

```javascript
import { registerBlockVariation } from '@wordpress/blocks';

registerBlockVariation('core/group', {
    name: 'card',
    title: 'Card',
    description: 'A card container with shadow',
    attributes: {
        className: 'is-style-card',
        style: {
            border: {
                radius: '8px',
            },
            spacing: {
                padding: '24px',
            },
        },
    },
    innerBlocks: [
        ['core/heading', { level: 3, placeholder: 'Card Title' }],
        ['core/paragraph', { placeholder: 'Card content...' }],
    ],
    scope: ['inserter', 'block', 'transform'],
    isActive: (blockAttributes) => 
        blockAttributes.className?.includes('is-style-card'),
});
```

## Block Patterns

```php
// Register pattern
register_block_pattern(
    'my-theme/hero-with-cta',
    array(
        'title' => __('Hero with CTA', 'my-theme'),
        'description' => __('A hero section with heading and buttons', 'my-theme'),
        'categories' => array('featured', 'banner'),
        'keywords' => array('hero', 'banner', 'cta'),
        'viewportWidth' => 1200,
        'content' => '
            <!-- wp:cover {"overlayColor":"primary","minHeight":500,"align":"full"} -->
            <div class="wp-block-cover alignfull" style="min-height:500px">
                <div class="wp-block-cover__inner-container">
                    <!-- wp:heading {"textAlign":"center","level":1} -->
                    <h1 class="has-text-align-center">Welcome</h1>
                    <!-- /wp:heading -->
                    <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
                    <div class="wp-block-buttons">
                        <!-- wp:button -->
                        <div class="wp-block-button"><a class="wp-block-button__link">Get Started</a></div>
                        <!-- /wp:button -->
                    </div>
                    <!-- /wp:buttons -->
                </div>
            </div>
            <!-- /wp:cover -->
        ',
    )
);
```

## Block Themes (theme.json)

```json
{
    "$schema": "https://schemas.wp.org/trunk/theme.json",
    "version": 2,
    "settings": {
        "appearanceTools": true,
        "color": {
            "palette": [
                {
                    "name": "Primary",
                    "slug": "primary",
                    "color": "#0073aa"
                },
                {
                    "name": "Secondary",
                    "slug": "secondary",
                    "color": "#23282d"
                }
            ],
            "gradients": [
                {
                    "name": "Primary to Secondary",
                    "slug": "primary-to-secondary",
                    "gradient": "linear-gradient(135deg, #0073aa 0%, #23282d 100%)"
                }
            ]
        },
        "typography": {
            "fontFamilies": [
                {
                    "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    "slug": "system",
                    "name": "System"
                }
            ],
            "fontSizes": [
                { "slug": "small", "size": "13px", "name": "Small" },
                { "slug": "medium", "size": "20px", "name": "Medium" },
                { "slug": "large", "size": "36px", "name": "Large" }
            ]
        },
        "spacing": {
            "units": ["px", "em", "rem", "%", "vw", "vh"],
            "spacingSizes": [
                { "slug": "10", "size": "0.625rem", "name": "1" },
                { "slug": "20", "size": "1.25rem", "name": "2" }
            ]
        },
        "layout": {
            "contentSize": "800px",
            "wideSize": "1200px"
        }
    },
    "styles": {
        "color": {
            "background": "var(--wp--preset--color--white)",
            "text": "var(--wp--preset--color--secondary)"
        },
        "elements": {
            "button": {
                "color": {
                    "background": "var(--wp--preset--color--primary)",
                    "text": "var(--wp--preset--color--white)"
                }
            },
            "link": {
                "color": {
                    "text": "var(--wp--preset--color--primary)"
                }
            }
        }
    }
}
```

## Dynamic Blocks

```php
// PHP render callback
register_block_type('my-plugin/recent-posts', array(
    'render_callback' => 'render_recent_posts_block',
    'attributes' => array(
        'numberOfPosts' => array(
            'type' => 'number',
            'default' => 5
        )
    )
));

function render_recent_posts_block($attributes) {
    $posts = get_posts(array(
        'numberposts' => $attributes['numberOfPosts'],
        'post_status' => 'publish'
    ));

    if (empty($posts)) {
        return '<p>No posts found.</p>';
    }

    $output = '<ul class="wp-block-my-plugin-recent-posts">';
    foreach ($posts as $post) {
        $output .= sprintf(
            '<li><a href="%s">%s</a></li>',
            esc_url(get_permalink($post)),
            esc_html($post->post_title)
        );
    }
    $output .= '</ul>';

    return $output;
}
```

## Best Practices

1. **Use block.json** - Standard registration method
2. **Leverage core blocks** - Extend rather than rebuild
3. **Support block features** - Colors, spacing, typography
4. **Make blocks accessible** - Proper ARIA attributes
5. **Test in editor and frontend** - Both views matter

## Common Pitfalls

- Not providing save function for static blocks
- Missing attribute sources
- Not handling empty states
- Forgetting to build before testing
- Not using useBlockProps

## Exam Tips

- **Know the block.json schema**: The `block.json` file defines block metadata including `name`, `title`, `category`, `icon`, `description`, `keywords`, `attributes`, `supports`, `editorScript`, `editorStyle`, `style`, `render`, `apiVersion`, and more. It's the standard way to register blocks and provides better performance than manual registration. The schema is validated, and IDEs can provide autocomplete. Understanding the schema is essential for proper block registration.

- **Understand static vs dynamic blocks**: Static blocks have a `save` function that outputs HTML stored in `post_content`. Dynamic blocks return `null` from `save` and use PHP `render_callback` or `render` file to generate output server-side. Static blocks are faster (pre-rendered) but can't access database or user context. Dynamic blocks allow server-side processing but require PHP execution on every page load. Choose based on whether content needs to be dynamic.

- **Know how to create variations and patterns**: Block variations extend existing blocks with preset configurations using `register_block_variation()`. Patterns are predefined block arrangements registered with `register_block_pattern()`. Variations modify block attributes, patterns are complete block layouts. Both help users create content faster. Variations are registered in JavaScript, patterns in PHP. Understanding both helps create better user experiences.

- **Understand theme.json configuration**: `theme.json` (in block themes) defines theme settings, styles, and template parts. It controls color palettes, typography, spacing, layout, and custom CSS properties. Settings affect the editor, styles affect output. It replaces many `add_theme_support()` calls. Understanding `theme.json` is essential for modern block theme development and provides centralized theme configuration.

- **Know the key WordPress packages and hooks**: Key packages: `@wordpress/blocks` (block registration), `@wordpress/block-editor` (editor components), `@wordpress/components` (UI components), `@wordpress/data` (state management), `@wordpress/element` (React). Key hooks: `blocks.registerBlockType` (filter block registration), `blocks.getBlockDefaultClassName` (filter CSS classes), `editor.BlockEdit` (filter edit component). Understanding packages and hooks enables extending and customizing the block editor.
