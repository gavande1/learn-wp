# Lazy Loading

## Overview

Lazy loading defers the loading of non-critical resources until they're needed, improving initial page load time and reducing bandwidth usage. WordPress has native lazy loading support since version 5.5.

## Native WordPress Lazy Loading

### Images

```php
// WordPress 5.5+ automatically adds loading="lazy" to images
// The attribute is added via wp_get_attachment_image() and the_content filter

// Default behavior:
// <img src="image.jpg" loading="lazy" ...>

// Check if lazy loading is supported
if (wp_lazy_loading_enabled('img', 'the_content')) {
    echo 'Lazy loading is enabled';
}
```

### Iframes

```php
// WordPress 5.7+ adds loading="lazy" to iframes
// Includes YouTube embeds, Google Maps, etc.

// Default output:
// <iframe src="..." loading="lazy"></iframe>
```

### Controlling Native Lazy Loading

```php
// Disable lazy loading for specific image
add_filter('wp_img_tag_add_loading_attr', 'selective_lazy_loading', 10, 3);

function selective_lazy_loading($value, $image, $context) {
    // Skip lazy loading for images with specific class
    if (strpos($image, 'no-lazy') !== false) {
        return false;
    }
    
    // Skip for images in header
    if ($context === 'get_header_image_tag') {
        return false;
    }
    
    return $value;
}

// Disable lazy loading entirely
add_filter('wp_lazy_loading_enabled', '__return_false');

// Disable for specific context
add_filter('wp_lazy_loading_enabled', function($default, $tag_name, $context) {
    if ($context === 'the_content') {
        return false;
    }
    return $default;
}, 10, 3);
```

## LCP (Largest Contentful Paint) Optimization

### Skip Lazy Loading for LCP

```php
// Don't lazy load above-the-fold images
add_filter('wp_img_tag_add_loading_attr', 'skip_lcp_lazy_loading', 10, 3);

function skip_lcp_lazy_loading($value, $image, $context) {
    // Skip for featured images on singular pages
    if (is_singular()) {
        $post_thumbnail_id = get_post_thumbnail_id();
        if ($post_thumbnail_id && strpos($image, 'wp-image-' . $post_thumbnail_id) !== false) {
            return false;
        }
    }
    
    return $value;
}

// Add fetchpriority="high" for LCP images
add_filter('wp_get_attachment_image_attributes', 'prioritize_lcp_image', 10, 3);

function prioritize_lcp_image($attr, $attachment, $size) {
    if (is_singular() && get_post_thumbnail_id() == $attachment->ID) {
        $attr['fetchpriority'] = 'high';
        unset($attr['loading']);
    }
    return $attr;
}
```

### WordPress 6.3+ Fetchpriority

```php
// Native fetchpriority support
wp_get_attachment_image($id, 'full', false, array(
    'fetchpriority' => 'high',
    'loading' => false, // Disable lazy loading
));
```

## JavaScript Lazy Loading

### Intersection Observer Pattern

```javascript
// Modern lazy loading with Intersection Observer
class LazyLoader {
    constructor(options = {}) {
        this.options = {
            rootMargin: '50px 0px',
            threshold: 0.01,
            ...options
        };
        
        this.observer = new IntersectionObserver(
            this.handleIntersection.bind(this),
            this.options
        );
    }
    
    observe(elements) {
        elements.forEach(el => this.observer.observe(el));
    }
    
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadElement(entry.target);
                this.observer.unobserve(entry.target);
            }
        });
    }
    
    loadElement(element) {
        // Load image
        if (element.dataset.src) {
            element.src = element.dataset.src;
        }
        if (element.dataset.srcset) {
            element.srcset = element.dataset.srcset;
        }
        
        // Load background image
        if (element.dataset.bg) {
            element.style.backgroundImage = `url(${element.dataset.bg})`;
        }
        
        element.classList.add('loaded');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const lazyLoader = new LazyLoader();
    lazyLoader.observe(document.querySelectorAll('[data-src], [data-bg]'));
});
```

### Enqueue Lazy Loading Script

```php
// Enqueue JavaScript lazy loader
add_action('wp_enqueue_scripts', 'enqueue_lazy_loader');

function enqueue_lazy_loader() {
    wp_enqueue_script(
        'lazy-loader',
        get_template_directory_uri() . '/js/lazy-loader.js',
        array(),
        '1.0',
        true
    );
}

// Output images with data attributes
function lazy_image($attachment_id, $size = 'large', $attr = array()) {
    $image = wp_get_attachment_image_src($attachment_id, $size);
    $srcset = wp_get_attachment_image_srcset($attachment_id, $size);
    $alt = get_post_meta($attachment_id, '_wp_attachment_image_alt', true);
    
    // Placeholder (low-quality or solid color)
    $placeholder = get_placeholder_image($attachment_id);
    
    $default_attr = array(
        'src' => $placeholder,
        'data-src' => $image[0],
        'data-srcset' => $srcset,
        'alt' => $alt,
        'class' => 'lazy',
        'width' => $image[1],
        'height' => $image[2],
    );
    
    $attr = wp_parse_args($attr, $default_attr);
    
    $html = '<img';
    foreach ($attr as $name => $value) {
        $html .= ' ' . esc_attr($name) . '="' . esc_attr($value) . '"';
    }
    $html .= '>';
    
    return $html;
}
```

## Background Image Lazy Loading

```php
// Filter content to lazy load background images
add_filter('the_content', 'lazy_load_bg_images');

function lazy_load_bg_images($content) {
    // Find elements with inline background-image
    $pattern = '/style="[^"]*background-image:\s*url\([\'"]?([^\'")\s]+)[\'"]?\)[^"]*"/i';
    
    $content = preg_replace_callback($pattern, function($matches) {
        $bg_url = $matches[1];
        $original_style = $matches[0];
        
        // Remove background-image from style
        $new_style = preg_replace('/background-image:\s*url\([^\)]+\);?/i', '', $original_style);
        
        // Add data attribute
        return $new_style . ' data-bg="' . esc_url($bg_url) . '"';
    }, $content);
    
    return $content;
}
```

## Component Lazy Loading

### Lazy Load JavaScript Components

```php
// Enqueue scripts only when needed
add_action('wp_enqueue_scripts', 'conditional_script_loading');

function conditional_script_loading() {
    // Only load on pages that need it
    global $post;
    
    if (has_shortcode($post->post_content ?? '', 'gallery')) {
        wp_enqueue_script('gallery-lightbox', ...);
    }
    
    if (has_shortcode($post->post_content ?? '', 'map')) {
        wp_enqueue_script('google-maps', ...);
    }
}
```

```javascript
// Dynamic import for lazy loading modules
async function loadGallery() {
    if (document.querySelector('.gallery')) {
        const { Gallery } = await import('./gallery.js');
        new Gallery('.gallery');
    }
}

// Load on scroll into view
const galleryObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            loadGallery();
            galleryObserver.disconnect();
        }
    });
});

document.querySelectorAll('.gallery').forEach(el => {
    galleryObserver.observe(el);
});
```

## Iframe Lazy Loading

### YouTube Embeds

```php
// Facade pattern for YouTube embeds
function lazy_youtube_embed($video_id, $title = '') {
    $thumbnail = "https://img.youtube.com/vi/{$video_id}/maxresdefault.jpg";
    
    return sprintf(
        '<div class="youtube-facade" data-video-id="%s">
            <img src="%s" alt="%s" loading="lazy">
            <button class="play-button" aria-label="Play Video">
                <svg>...</svg>
            </button>
        </div>',
        esc_attr($video_id),
        esc_url($thumbnail),
        esc_attr($title)
    );
}
```

```javascript
// Load iframe on click
document.querySelectorAll('.youtube-facade').forEach(facade => {
    facade.addEventListener('click', function() {
        const videoId = this.dataset.videoId;
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        iframe.allow = 'autoplay; encrypted-media';
        iframe.allowFullscreen = true;
        this.replaceWith(iframe);
    });
});
```

## Comments Lazy Loading

```php
// Load comments only when scrolled to
add_action('wp_footer', 'lazy_load_comments_script');

function lazy_load_comments_script() {
    if (!is_singular() || !comments_open()) {
        return;
    }
    ?>
    <script>
    (function() {
        const commentsSection = document.getElementById('comments');
        if (!commentsSection) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Load comments via AJAX
                    fetch('<?php echo admin_url('admin-ajax.php'); ?>?action=load_comments&post_id=<?php echo get_the_ID(); ?>')
                        .then(r => r.text())
                        .then(html => {
                            commentsSection.innerHTML = html;
                        });
                    observer.disconnect();
                }
            });
        }, { rootMargin: '100px' });
        
        observer.observe(commentsSection);
    })();
    </script>
    <?php
}

// AJAX handler
add_action('wp_ajax_load_comments', 'ajax_load_comments');
add_action('wp_ajax_nopriv_load_comments', 'ajax_load_comments');

function ajax_load_comments() {
    $post_id = absint($_GET['post_id']);
    $post = get_post($post_id);
    
    if (!$post) {
        wp_die();
    }
    
    setup_postdata($post);
    comments_template();
    wp_die();
}
```

## Placeholder Strategies

### Low Quality Image Placeholder (LQIP)

```php
function generate_lqip($attachment_id) {
    // Generate tiny placeholder
    $tiny = wp_get_attachment_image_src($attachment_id, 'thumbnail');
    return $tiny[0];
}

// Or use dominant color
function get_image_dominant_color($attachment_id) {
    $color = get_post_meta($attachment_id, '_dominant_color', true);
    
    if (!$color) {
        $path = get_attached_file($attachment_id);
        // Calculate dominant color (requires image processing)
        $color = calculate_dominant_color($path);
        update_post_meta($attachment_id, '_dominant_color', $color);
    }
    
    return $color;
}
```

### SVG Placeholder

```php
function svg_placeholder($width, $height, $color = '#f0f0f0') {
    $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' . $width . '" height="' . $height . '">
        <rect width="100%" height="100%" fill="' . $color . '"/>
    </svg>';
    
    return 'data:image/svg+xml;base64,' . base64_encode($svg);
}
```

## Best Practices

1. **Don't lazy load LCP** - Above-fold images should load immediately
2. **Set dimensions** - Always specify width/height to prevent layout shift
3. **Use placeholders** - Prevent empty space while loading
4. **Test on slow connections** - Ensure good UX on 3G
5. **Monitor CLS** - Lazy loading can cause layout shifts
6. **Use native lazy loading** - Browser support is excellent

## Common Pitfalls

- Lazy loading above-the-fold content
- Not setting image dimensions (causes CLS)
- Missing alt text on lazy-loaded images
- Over-eager lazy loading (too far from viewport)
- Not providing fallbacks for JS-based solutions

## Exam Tips

- **Know WordPress native lazy loading (5.5+)**: WordPress automatically adds `loading="lazy"` to images and iframes via `wp_get_attachment_image()` and `the_content` filter. Works for images below the fold (not immediately visible). Can be disabled globally or per-image. No JavaScript required - browser native feature. Understanding native lazy loading helps leverage built-in performance optimization without custom code.

- **Understand Intersection Observer API**: JavaScript API that detects when elements enter viewport. Use for custom lazy loading implementations. More performant than scroll event listeners. Can observe multiple elements efficiently. Use for lazy loading images, videos, or triggering animations. Fallback needed for older browsers. Understanding Intersection Observer enables custom lazy loading beyond WordPress native support.

- **Know how to disable lazy loading selectively**: Use `wp_get_attachment_image($id, $size, false, array('loading' => false))` to disable per-image. Use `add_filter('wp_lazy_loading_enabled', '__return_false')` to disable globally. Use `loading="eager"` attribute to force immediate loading for above-fold images. Sometimes you need images to load immediately (hero images, logos). Understanding how to disable helps optimize critical images.

- **Understand fetchpriority attribute**: `fetchpriority="high"` hints browser to prioritize resource loading. Use for critical above-fold images. WordPress can add this automatically for featured images. Helps ensure important images load first. Use sparingly - too many high-priority resources defeats the purpose. Understanding fetchpriority helps optimize critical resource loading order.

- **Know CLS implications of lazy loading**: Cumulative Layout Shift (CLS) occurs when content shifts as images load. Always set image dimensions (`width` and `height` attributes) to reserve space. Use aspect ratio boxes for responsive images. Lazy loading without dimensions causes layout shift when images load. Understanding CLS helps maintain visual stability while lazy loading, improving Core Web Vitals scores.
