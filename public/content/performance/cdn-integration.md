# CDN Integration

## Overview

A Content Delivery Network (CDN) distributes your static assets across global edge servers, reducing latency and improving load times for users worldwide. Proper CDN integration is essential for high-performance WordPress sites.

## How CDN Works

### Traditional vs CDN Request Flow

```
Traditional:
User (Australia) → Origin Server (USA) → Response (300ms)

With CDN:
User (Australia) → CDN Edge (Australia) → Response (30ms)
                   (Cache miss) → Origin Server → CDN Cache → Response
```

### CDN Types

| Type | Description | Use Case |
|------|-------------|----------|
| Pull CDN | Fetches from origin on first request | Most WordPress sites |
| Push CDN | You upload files directly | Large static assets |
| Full-Site CDN | Caches entire pages | High-traffic sites |

## WordPress CDN Configuration

### Rewriting Asset URLs

```php
// Simple CDN URL replacement
define('CDN_URL', 'https://cdn.example.com');

add_filter('wp_get_attachment_url', 'cdn_attachment_url');
add_filter('script_loader_src', 'cdn_static_url');
add_filter('style_loader_src', 'cdn_static_url');

function cdn_attachment_url($url) {
    if (defined('CDN_URL') && CDN_URL) {
        $upload_dir = wp_upload_dir();
        return str_replace($upload_dir['baseurl'], CDN_URL . '/wp-content/uploads', $url);
    }
    return $url;
}

function cdn_static_url($url) {
    if (defined('CDN_URL') && CDN_URL) {
        return str_replace(home_url(), CDN_URL, $url);
    }
    return $url;
}
```

### Comprehensive CDN Integration

```php
class CDN_Integration {
    private $cdn_url;
    private $site_url;
    private $upload_url;
    
    public function __construct($cdn_url) {
        $this->cdn_url = rtrim($cdn_url, '/');
        $this->site_url = home_url();
        $this->upload_url = wp_upload_dir()['baseurl'];
        
        $this->init_hooks();
    }
    
    private function init_hooks() {
        // Asset URLs
        add_filter('wp_get_attachment_url', array($this, 'rewrite_url'));
        add_filter('wp_get_attachment_image_src', array($this, 'rewrite_image_src'));
        add_filter('wp_calculate_image_srcset', array($this, 'rewrite_srcset'));
        
        // Script and style URLs
        add_filter('script_loader_src', array($this, 'rewrite_url'));
        add_filter('style_loader_src', array($this, 'rewrite_url'));
        
        // Content URLs
        add_filter('the_content', array($this, 'rewrite_content_urls'), 100);
        add_filter('widget_text', array($this, 'rewrite_content_urls'), 100);
    }
    
    public function rewrite_url($url) {
        if (empty($url) || is_admin()) {
            return $url;
        }
        
        // Only rewrite site URLs
        if (strpos($url, $this->site_url) !== 0) {
            return $url;
        }
        
        // Don't rewrite PHP files
        if (preg_match('/\.php(\?|$)/', $url)) {
            return $url;
        }
        
        return str_replace($this->site_url, $this->cdn_url, $url);
    }
    
    public function rewrite_image_src($image) {
        if ($image) {
            $image[0] = $this->rewrite_url($image[0]);
        }
        return $image;
    }
    
    public function rewrite_srcset($sources) {
        foreach ($sources as &$source) {
            $source['url'] = $this->rewrite_url($source['url']);
        }
        return $sources;
    }
    
    public function rewrite_content_urls($content) {
        // Replace URLs in content
        $pattern = '/(https?:\/\/)(' . preg_quote(parse_url($this->site_url, PHP_URL_HOST), '/') . ')([^"\'>\s]+\.(jpg|jpeg|png|gif|webp|svg|css|js|woff2?|ttf|eot))/i';
        
        return preg_replace($pattern, $this->cdn_url . '$3', $content);
    }
}

// Initialize
if (defined('CDN_URL') && CDN_URL) {
    new CDN_Integration(CDN_URL);
}
```

## CloudFlare Integration

### Page Rules Configuration

```
// CloudFlare Page Rules (configured in dashboard)

// Cache static assets aggressively
*.example.com/wp-content/uploads/*
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
- Browser Cache TTL: 1 year

// Bypass cache for admin
*.example.com/wp-admin/*
- Cache Level: Bypass

// Bypass cache for dynamic content
*.example.com/wp-json/*
- Cache Level: Bypass
```

### CloudFlare API Integration

```php
// Purge CloudFlare cache on post update
add_action('save_post', 'purge_cloudflare_cache', 10, 3);

function purge_cloudflare_cache($post_id, $post, $update) {
    if (!$update || wp_is_post_revision($post_id)) {
        return;
    }
    
    $cf_zone_id = defined('CF_ZONE_ID') ? CF_ZONE_ID : '';
    $cf_api_token = defined('CF_API_TOKEN') ? CF_API_TOKEN : '';
    
    if (!$cf_zone_id || !$cf_api_token) {
        return;
    }
    
    // URLs to purge
    $urls = array(
        get_permalink($post_id),
        home_url('/'),
        get_post_type_archive_link($post->post_type),
    );
    
    // Add category archives
    $categories = wp_get_post_categories($post_id);
    foreach ($categories as $cat_id) {
        $urls[] = get_category_link($cat_id);
    }
    
    // Purge via API
    wp_remote_request(
        "https://api.cloudflare.com/client/v4/zones/{$cf_zone_id}/purge_cache",
        array(
            'method' => 'POST',
            'headers' => array(
                'Authorization' => 'Bearer ' . $cf_api_token,
                'Content-Type' => 'application/json',
            ),
            'body' => json_encode(array('files' => array_values(array_unique($urls)))),
        )
    );
}
```

## AWS CloudFront Integration

### Origin Configuration

```php
// wp-config.php
define('CDN_URL', 'https://d1234567890.cloudfront.net');

// CloudFront signed URLs for private content
function get_signed_cloudfront_url($url, $expires = 3600) {
    $key_pair_id = 'APKAXXXXXXXX';
    $private_key = file_get_contents('/path/to/private_key.pem');
    
    $expires_time = time() + $expires;
    
    $policy = json_encode(array(
        'Statement' => array(
            array(
                'Resource' => $url,
                'Condition' => array(
                    'DateLessThan' => array(
                        'AWS:EpochTime' => $expires_time
                    )
                )
            )
        )
    ));
    
    $signature = base64_encode(
        openssl_sign($policy, $sig, $private_key, OPENSSL_ALGO_SHA1) ? $sig : ''
    );
    
    return $url . '?' . http_build_query(array(
        'Expires' => $expires_time,
        'Signature' => strtr($signature, '+/=', '-_~'),
        'Key-Pair-Id' => $key_pair_id,
    ));
}
```

### Cache Invalidation

```php
// Invalidate CloudFront cache
function invalidate_cloudfront_cache($paths) {
    $distribution_id = defined('CF_DISTRIBUTION_ID') ? CF_DISTRIBUTION_ID : '';
    
    if (!$distribution_id) {
        return;
    }
    
    // Using AWS SDK
    $cloudfront = new Aws\CloudFront\CloudFrontClient([
        'version' => 'latest',
        'region' => 'us-east-1',
    ]);
    
    $cloudfront->createInvalidation([
        'DistributionId' => $distribution_id,
        'InvalidationBatch' => [
            'CallerReference' => time(),
            'Paths' => [
                'Items' => $paths,
                'Quantity' => count($paths),
            ],
        ],
    ]);
}

// Usage
add_action('save_post', function($post_id) {
    invalidate_cloudfront_cache(array(
        '/wp-content/uploads/*',
        '/page/' . $post_id . '/*',
    ));
});
```

## CDN for Specific Content Types

### Media Library CDN

```php
// Only CDN uploads
add_filter('wp_get_attachment_url', 'cdn_uploads_only');

function cdn_uploads_only($url) {
    if (!defined('CDN_URL')) {
        return $url;
    }
    
    $upload_dir = wp_upload_dir();
    
    if (strpos($url, $upload_dir['baseurl']) !== false) {
        return str_replace(
            $upload_dir['baseurl'],
            CDN_URL . '/wp-content/uploads',
            $url
        );
    }
    
    return $url;
}
```

### Theme Assets CDN

```php
// CDN for theme assets only
function get_cdn_theme_url($path = '') {
    $base = defined('CDN_URL') ? CDN_URL : get_template_directory_uri();
    return $base . '/wp-content/themes/' . get_template() . '/' . ltrim($path, '/');
}

// Usage in theme
echo '<img src="' . esc_url(get_cdn_theme_url('images/logo.png')) . '">';
```

## Multi-CDN Strategy

```php
// Use different CDNs for different content types
class Multi_CDN {
    private static $cdns = array(
        'images' => 'https://img-cdn.example.com',
        'static' => 'https://static-cdn.example.com',
        'media' => 'https://media-cdn.example.com',
    );
    
    public static function get_url($url) {
        $extension = strtolower(pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));
        
        // Image CDN
        if (in_array($extension, array('jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'))) {
            return self::rewrite($url, 'images');
        }
        
        // Static assets CDN
        if (in_array($extension, array('css', 'js', 'woff', 'woff2', 'ttf', 'eot'))) {
            return self::rewrite($url, 'static');
        }
        
        // Media CDN (video, audio)
        if (in_array($extension, array('mp4', 'webm', 'mp3', 'ogg'))) {
            return self::rewrite($url, 'media');
        }
        
        return $url;
    }
    
    private static function rewrite($url, $cdn_type) {
        if (isset(self::$cdns[$cdn_type])) {
            return str_replace(home_url(), self::$cdns[$cdn_type], $url);
        }
        return $url;
    }
}
```

## Handling CORS

```php
// Add CORS headers for CDN requests
add_action('send_headers', 'add_cors_headers');

function add_cors_headers() {
    // Only for static assets
    $request_uri = $_SERVER['REQUEST_URI'];
    $static_extensions = array('.css', '.js', '.woff', '.woff2', '.ttf', '.eot', '.svg');
    
    foreach ($static_extensions as $ext) {
        if (strpos($request_uri, $ext) !== false) {
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: GET, OPTIONS');
            header('Access-Control-Max-Age: 86400');
            break;
        }
    }
}
```

```nginx
# Nginx CORS configuration
location ~* \.(css|js|woff2?|ttf|eot|svg)$ {
    add_header Access-Control-Allow-Origin "*";
    add_header Access-Control-Allow-Methods "GET, OPTIONS";
}
```

## Cache Headers

```php
// Set appropriate cache headers for CDN
add_filter('wp_headers', 'cdn_cache_headers');

function cdn_cache_headers($headers) {
    // Don't cache admin or logged-in users
    if (is_admin() || is_user_logged_in()) {
        $headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        return $headers;
    }
    
    // Cache static pages
    if (is_front_page() || is_page() || is_single()) {
        $headers['Cache-Control'] = 'public, max-age=3600, s-maxage=86400';
    }
    
    return $headers;
}

// For static files in .htaccess
// <IfModule mod_expires.c>
//     ExpiresActive On
//     ExpiresByType image/jpeg "access plus 1 year"
//     ExpiresByType image/png "access plus 1 year"
//     ExpiresByType text/css "access plus 1 month"
//     ExpiresByType application/javascript "access plus 1 month"
// </IfModule>
```

## Best Practices

1. **Use pull CDN** - Simpler for most WordPress sites
2. **Set proper cache headers** - Control what gets cached and for how long
3. **Purge on updates** - Clear cache when content changes
4. **Monitor cache hit ratio** - Aim for 90%+ hit rate
5. **Use HTTPS** - Ensure CDN serves over HTTPS
6. **Test from multiple locations** - Verify global performance

## Common Pitfalls

- Not purging cache on content updates
- Caching dynamic content (cart, user data)
- Missing CORS headers for fonts
- Wrong cache TTL (too short or too long)
- Not using CDN for all static assets

## Exam Tips

- **Understand pull vs push CDN**: Pull CDN fetches content from origin on first request, then caches it (CloudFlare, CloudFront). Push CDN requires you to upload content to CDN (some specialized CDNs). Pull is easier (automatic), push gives more control. Most WordPress CDN integrations use pull model. Understanding the difference helps choose appropriate CDN solution and configuration.

- **Know how to rewrite URLs for CDN**: Use filters like `wp_get_attachment_url` or `script_loader_src` to rewrite asset URLs to CDN domain. Use constants like `WP_CONTENT_URL` or plugins that handle rewriting automatically. Ensure all static assets (CSS, JS, images, fonts) are served from CDN. URL rewriting is essential for CDN to work. Understanding rewriting enables proper CDN integration.

- **Understand cache headers and TTL**: CDN respects cache headers like `Cache-Control: max-age=3600`. Set appropriate TTLs - longer for static assets (images, CSS, JS), shorter for dynamic content. Use `Cache-Control` headers to control CDN caching behavior. TTL too short wastes CDN benefits, too long serves stale content. Understanding headers helps optimize CDN caching effectiveness.

- **Know CloudFlare/CloudFront basics**: CloudFlare is reverse proxy CDN with security features (DDoS protection, WAF). CloudFront is AWS CDN service. Both provide global content distribution, SSL, caching. CloudFlare often easier to set up (DNS change). CloudFront integrates with AWS services. Understanding basics helps choose and configure appropriate CDN service for your needs.

- **Understand cache invalidation strategies**: CDN cache invalidation can be manual (purge specific URLs) or automatic (based on TTL). Use CDN purge APIs to invalidate on content updates. Some plugins auto-purge CDN on post updates. Balance between cache effectiveness and content freshness. Too frequent purging reduces CDN benefits. Understanding invalidation ensures users see updated content without sacrificing performance.
