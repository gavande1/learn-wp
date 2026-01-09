# Asset Optimization

## Overview

Optimizing CSS, JavaScript, images, and fonts is crucial for WordPress performance. Proper asset management reduces page load time and improves Core Web Vitals scores.

## Script and Style Management

### Proper Enqueueing

```php
// Enqueue scripts correctly
add_action('wp_enqueue_scripts', 'enqueue_optimized_assets');

function enqueue_optimized_assets() {
    // Version for cache busting
    $version = wp_get_theme()->get('Version');
    
    // Main stylesheet
    wp_enqueue_style(
        'theme-style',
        get_stylesheet_uri(),
        array(), // Dependencies
        $version
    );
    
    // JavaScript with dependencies
    wp_enqueue_script(
        'theme-script',
        get_template_directory_uri() . '/js/main.js',
        array('jquery'), // Load after jQuery
        $version,
        true // Load in footer
    );
    
    // Conditional loading
    if (is_singular('product')) {
        wp_enqueue_script('product-gallery', ...);
    }
}
```

### Dequeue Unnecessary Assets

```php
// Remove unused scripts/styles
add_action('wp_enqueue_scripts', 'dequeue_unused_assets', 100);

function dequeue_unused_assets() {
    // Remove block library styles if not using blocks
    if (!is_admin()) {
        wp_dequeue_style('wp-block-library');
        wp_dequeue_style('wp-block-library-theme');
        wp_dequeue_style('wc-blocks-style'); // WooCommerce blocks
    }
    
    // Remove jQuery migrate
    if (!is_admin()) {
        wp_deregister_script('jquery');
        wp_register_script('jquery', includes_url('/js/jquery/jquery.min.js'), array(), null, true);
    }
    
    // Remove emoji scripts
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('wp_print_styles', 'print_emoji_styles');
}
```

### Script Loading Strategies

```php
// Defer non-critical scripts
add_filter('script_loader_tag', 'add_defer_attribute', 10, 2);

function add_defer_attribute($tag, $handle) {
    $defer_scripts = array('theme-script', 'analytics', 'social-share');
    
    if (in_array($handle, $defer_scripts)) {
        return str_replace(' src', ' defer src', $tag);
    }
    
    return $tag;
}

// Async loading
add_filter('script_loader_tag', 'add_async_attribute', 10, 2);

function add_async_attribute($tag, $handle) {
    $async_scripts = array('analytics', 'tracking');
    
    if (in_array($handle, $async_scripts)) {
        return str_replace(' src', ' async src', $tag);
    }
    
    return $tag;
}

// Modern module loading
add_filter('script_loader_tag', 'add_module_type', 10, 2);

function add_module_type($tag, $handle) {
    if ($handle === 'modern-app') {
        return str_replace('<script ', '<script type="module" ', $tag);
    }
    return $tag;
}
```

### WordPress 6.3+ Script Strategies

```php
// Native defer/async support
wp_register_script('my-script', $src, array(), $ver, array(
    'strategy' => 'defer', // or 'async'
    'in_footer' => true,
));

// Using wp_script_add_data
wp_enqueue_script('my-script', ...);
wp_script_add_data('my-script', 'strategy', 'defer');
```

## CSS Optimization

### Critical CSS

```php
// Inline critical CSS
add_action('wp_head', 'inline_critical_css', 1);

function inline_critical_css() {
    $critical_css = file_get_contents(get_template_directory() . '/css/critical.css');
    echo '<style id="critical-css">' . $critical_css . '</style>';
}

// Load full CSS asynchronously
add_action('wp_head', 'async_load_css', 2);

function async_load_css() {
    $stylesheet = get_stylesheet_uri();
    ?>
    <link rel="preload" href="<?php echo esc_url($stylesheet); ?>" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="<?php echo esc_url($stylesheet); ?>"></noscript>
    <?php
}
```

### CSS Minification

```php
// Basic CSS minification
function minify_css($css) {
    // Remove comments
    $css = preg_replace('!/\*[^*]*\*+([^/][^*]*\*+)*/!', '', $css);
    // Remove whitespace
    $css = str_replace(array("\r\n", "\r", "\n", "\t"), '', $css);
    $css = preg_replace('/\s+/', ' ', $css);
    // Remove spaces around operators
    $css = str_replace(array(' {', '{ '), '{', $css);
    $css = str_replace(array(' }', '} '), '}', $css);
    $css = str_replace(': ', ':', $css);
    $css = str_replace('; ', ';', $css);
    
    return $css;
}
```

### Remove Unused CSS

```php
// Load CSS only where needed
add_action('wp_enqueue_scripts', 'conditional_css_loading');

function conditional_css_loading() {
    // WooCommerce styles only on shop pages
    if (!is_woocommerce() && !is_cart() && !is_checkout()) {
        wp_dequeue_style('woocommerce-general');
        wp_dequeue_style('woocommerce-layout');
        wp_dequeue_style('woocommerce-smallscreen');
    }
    
    // Contact form styles only on pages with shortcode
    global $post;
    if (!has_shortcode($post->post_content ?? '', 'contact-form')) {
        wp_dequeue_style('contact-form-7');
    }
}
```

## Image Optimization

### Responsive Images

```php
// Configure image sizes
add_action('after_setup_theme', 'setup_image_sizes');

function setup_image_sizes() {
    // Set default sizes
    update_option('thumbnail_size_w', 150);
    update_option('thumbnail_size_h', 150);
    update_option('medium_size_w', 300);
    update_option('medium_size_h', 300);
    update_option('large_size_w', 1024);
    update_option('large_size_h', 1024);
    
    // Custom sizes
    add_image_size('hero', 1920, 600, true);
    add_image_size('card', 400, 300, true);
    add_image_size('thumb-square', 150, 150, true);
}

// Output with srcset
function responsive_image($attachment_id, $size = 'large') {
    return wp_get_attachment_image($attachment_id, $size, false, array(
        'loading' => 'lazy',
        'decoding' => 'async',
        'sizes' => '(max-width: 768px) 100vw, 50vw',
    ));
}
```

### Lazy Loading

```php
// Native lazy loading (WordPress 5.5+)
// Images are lazy loaded by default

// Disable lazy loading for above-fold images
add_filter('wp_img_tag_add_loading_attr', 'disable_hero_lazy_loading', 10, 3);

function disable_hero_lazy_loading($value, $image, $context) {
    // Check if it's the hero image
    if (strpos($image, 'hero-image') !== false) {
        return false; // Don't add loading="lazy"
    }
    return $value;
}

// Add fetchpriority for LCP image
add_filter('wp_get_attachment_image_attributes', 'add_fetchpriority', 10, 3);

function add_fetchpriority($attr, $attachment, $size) {
    // Add to featured image on singular pages
    if (is_singular() && get_post_thumbnail_id() == $attachment->ID) {
        $attr['fetchpriority'] = 'high';
        unset($attr['loading']); // Remove lazy loading
    }
    return $attr;
}
```

### WebP Support

```php
// Allow WebP uploads
add_filter('upload_mimes', 'allow_webp_uploads');

function allow_webp_uploads($mimes) {
    $mimes['webp'] = 'image/webp';
    return $mimes;
}

// Serve WebP with fallback
function get_webp_image($image_url) {
    $webp_url = preg_replace('/\.(jpe?g|png)$/i', '.webp', $image_url);
    $webp_path = str_replace(
        wp_upload_dir()['baseurl'],
        wp_upload_dir()['basedir'],
        $webp_url
    );
    
    if (file_exists($webp_path)) {
        return $webp_url;
    }
    
    return $image_url;
}

// Picture element with WebP
function picture_with_webp($attachment_id, $size = 'large') {
    $image = wp_get_attachment_image_src($attachment_id, $size);
    $webp = get_webp_image($image[0]);
    
    if ($webp !== $image[0]) {
        return sprintf(
            '<picture>
                <source srcset="%s" type="image/webp">
                <img src="%s" alt="%s" loading="lazy">
            </picture>',
            esc_url($webp),
            esc_url($image[0]),
            esc_attr(get_post_meta($attachment_id, '_wp_attachment_image_alt', true))
        );
    }
    
    return wp_get_attachment_image($attachment_id, $size);
}
```

## Font Optimization

### Self-Host Google Fonts

```php
// Preconnect and preload fonts
add_action('wp_head', 'preload_fonts', 1);

function preload_fonts() {
    ?>
    <link rel="preload" href="<?php echo get_template_directory_uri(); ?>/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
    <?php
}

// Enqueue local fonts
add_action('wp_enqueue_scripts', 'enqueue_local_fonts');

function enqueue_local_fonts() {
    wp_enqueue_style('custom-fonts', get_template_directory_uri() . '/css/fonts.css');
}
```

### Font Display Swap

```css
/* In CSS */
@font-face {
    font-family: 'Inter';
    src: url('fonts/inter-var.woff2') format('woff2');
    font-display: swap; /* Prevents FOIT */
    font-weight: 100 900;
}
```

### Subset Fonts

```php
// Only load needed character sets
// Example: Latin subset only
// Use font subsetting tools to create smaller font files
```

## Resource Hints

```php
// Add resource hints
add_action('wp_head', 'add_resource_hints', 1);

function add_resource_hints() {
    // Preconnect to external domains
    $preconnects = array(
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://www.google-analytics.com',
    );
    
    foreach ($preconnects as $url) {
        echo '<link rel="preconnect" href="' . esc_url($url) . '" crossorigin>' . "\n";
    }
    
    // DNS prefetch
    $dns_prefetch = array(
        '//cdn.example.com',
        '//api.example.com',
    );
    
    foreach ($dns_prefetch as $url) {
        echo '<link rel="dns-prefetch" href="' . esc_url($url) . '">' . "\n";
    }
}

// Preload critical assets
add_action('wp_head', 'preload_critical_assets', 1);

function preload_critical_assets() {
    // Preload LCP image
    if (is_front_page()) {
        echo '<link rel="preload" href="/wp-content/uploads/hero.webp" as="image">' . "\n";
    }
    
    // Preload critical font
    echo '<link rel="preload" href="' . get_template_directory_uri() . '/fonts/main.woff2" as="font" type="font/woff2" crossorigin>' . "\n";
}
```

## Build Process Integration

```php
// Enqueue versioned assets from build
function enqueue_built_assets() {
    $manifest_path = get_template_directory() . '/dist/manifest.json';
    
    if (file_exists($manifest_path)) {
        $manifest = json_decode(file_get_contents($manifest_path), true);
        
        // CSS
        wp_enqueue_style(
            'theme-style',
            get_template_directory_uri() . '/dist/' . $manifest['main.css'],
            array(),
            null // Version is in filename
        );
        
        // JS
        wp_enqueue_script(
            'theme-script',
            get_template_directory_uri() . '/dist/' . $manifest['main.js'],
            array(),
            null,
            true
        );
    }
}
add_action('wp_enqueue_scripts', 'enqueue_built_assets');
```

## Best Practices

1. **Load scripts in footer** - Use in_footer parameter
2. **Defer non-critical JS** - Use defer/async attributes
3. **Inline critical CSS** - Above-the-fold styles
4. **Optimize images** - Compress, resize, use WebP
5. **Use resource hints** - Preconnect, preload, prefetch
6. **Conditional loading** - Only load assets where needed

## Common Pitfalls

- Loading all assets on every page
- Not using native lazy loading
- Missing font-display: swap
- Not setting appropriate image sizes
- Forgetting cache busting on updates

## Exam Tips

- **Know wp_enqueue_script/style parameters**: Key parameters: handle (unique ID), src (URL), deps (dependencies array), version (for cache busting), in_footer (scripts only), media (styles only). Use `array('in_footer' => true, 'strategy' => 'defer')` for modern script loading. Dependencies ensure correct load order. Version parameter enables cache busting. Understanding parameters enables optimal asset loading.

- **Understand defer vs async**: `defer` scripts execute after HTML parsing, in order, before DOMContentLoaded. `async` scripts execute as soon as loaded, order not guaranteed, may interrupt parsing. Use `defer` for scripts that need DOM but not immediately. Use `async` for independent scripts (analytics). Most WordPress scripts should use `defer`. Understanding the difference helps choose appropriate loading strategy for each script.

- **Know WordPress image handling functions**: `wp_get_attachment_image()` generates responsive image with srcset. `wp_get_attachment_image_url()` gets URL for specific size. `add_image_size()` registers custom sizes. Use appropriate image sizes to avoid loading oversized images. WordPress automatically generates multiple sizes. Understanding image functions enables proper responsive image implementation and performance optimization.

- **Understand resource hints (preload, preconnect)**: `preload` hints browser to fetch resource early (critical CSS, fonts). `preconnect` establishes early connection to external domain (CDN, APIs). Use `wp_resource_hints()` filter to add hints. Helps reduce latency for critical resources. Use sparingly - too many hints waste bandwidth. Understanding hints enables faster page loads for critical resources.

- **Know lazy loading implementation**: WordPress 5.5+ adds native lazy loading to images via `loading="lazy"` attribute. Use `wp_get_attachment_image()` which includes lazy loading. Can disable with `add_filter('wp_lazy_loading_enabled', '__return_false')`. For custom implementation, use Intersection Observer API. Lazy loading defers off-screen image loading, improving initial page load. Understanding lazy loading helps optimize image-heavy pages.
