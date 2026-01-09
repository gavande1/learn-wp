# PHP Sessions and Caching Issues

## Overview

PHP sessions can cause serious issues in WordPress, especially with page caching and scalable architectures. Understanding these problems and alternatives is crucial for enterprise WordPress development.

## Why PHP Sessions Are Problematic

### Caching Conflicts

```php
// BAD - Starts session, breaks page caching
session_start();
$_SESSION['user_cart'] = $cart_items;

// When session_start() runs:
// 1. Sets session cookie
// 2. Sends headers
// 3. Makes response user-specific
// 4. Page caching won't work!
```

### Scalability Issues

```
Load Balancer
    ├── Server 1 (has session)
    ├── Server 2 (no session!)
    └── Server 3 (no session!)
    
User bounces between servers = lost session data
```

### Performance Problems

- Session files lock during access
- Concurrent requests queue up
- Slows down parallel AJAX calls
- Blocks other PHP processes

## WordPress Alternatives to Sessions

### Transients for Temporary Data

```php
// Instead of: $_SESSION['temp_data'] = $data;

// Use transients
set_transient('user_' . get_current_user_id() . '_data', $data, HOUR_IN_SECONDS);

// Retrieve
$data = get_transient('user_' . get_current_user_id() . '_data');

// Delete
delete_transient('user_' . get_current_user_id() . '_data');
```

### User Meta for User-Specific Data

```php
// Instead of: $_SESSION['user_preference'] = 'dark';

// Use user meta
update_user_meta(get_current_user_id(), 'my_plugin_preference', 'dark');

// Retrieve
$preference = get_user_meta(get_current_user_id(), 'my_plugin_preference', true);
```

### Cookies for Client-Side Storage

```php
// Set cookie
setcookie(
    'my_plugin_token',
    $token,
    time() + HOUR_IN_SECONDS,
    COOKIEPATH,
    COOKIE_DOMAIN,
    is_ssl(),
    true  // HTTP only
);

// Read cookie
$token = isset($_COOKIE['my_plugin_token']) 
    ? sanitize_text_field($_COOKIE['my_plugin_token']) 
    : '';

// Delete cookie
setcookie('my_plugin_token', '', time() - 3600, COOKIEPATH, COOKIE_DOMAIN);
```

### Custom Database Table

```php
// Create table for session-like data
function my_plugin_create_sessions_table() {
    global $wpdb;
    
    $table = $wpdb->prefix . 'my_plugin_sessions';
    
    $sql = "CREATE TABLE $table (
        session_id varchar(64) NOT NULL,
        user_id bigint(20) unsigned DEFAULT 0,
        data longtext NOT NULL,
        expiry datetime NOT NULL,
        PRIMARY KEY (session_id),
        KEY user_id (user_id),
        KEY expiry (expiry)
    ) {$wpdb->get_charset_collate()};";
    
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);
}

// Custom session handler
class My_Plugin_Session {
    private $session_id;
    private $data = array();
    
    public function __construct() {
        $this->session_id = $this->get_session_id();
        $this->load();
    }
    
    private function get_session_id() {
        if (isset($_COOKIE['my_plugin_session'])) {
            return sanitize_key($_COOKIE['my_plugin_session']);
        }
        
        $session_id = wp_generate_password(32, false);
        setcookie('my_plugin_session', $session_id, 0, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true);
        
        return $session_id;
    }
    
    private function load() {
        global $wpdb;
        
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT data FROM {$wpdb->prefix}my_plugin_sessions 
             WHERE session_id = %s AND expiry > %s",
            $this->session_id,
            current_time('mysql')
        ));
        
        if ($row) {
            $this->data = maybe_unserialize($row->data);
        }
    }
    
    public function set($key, $value) {
        $this->data[$key] = $value;
        $this->save();
    }
    
    public function get($key, $default = null) {
        return isset($this->data[$key]) ? $this->data[$key] : $default;
    }
    
    private function save() {
        global $wpdb;
        
        $wpdb->replace(
            $wpdb->prefix . 'my_plugin_sessions',
            array(
                'session_id' => $this->session_id,
                'user_id' => get_current_user_id(),
                'data' => maybe_serialize($this->data),
                'expiry' => date('Y-m-d H:i:s', time() + HOUR_IN_SECONDS),
            )
        );
    }
}
```

## If You Must Use Sessions

### Check for Existing Session

```php
// Don't start a new session if one exists
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
```

### Close Session Early

```php
// Release session lock as early as possible
session_start();
$data = $_SESSION['my_data'];
session_write_close();  // Release lock!

// Now do processing without holding the lock
process_data($data);
```

### Configure Session Handling

```php
// Use database/memcached instead of files
// In wp-config.php or mu-plugin

// Use Memcached
ini_set('session.save_handler', 'memcached');
ini_set('session.save_path', 'localhost:11211');

// Or custom handler
session_set_save_handler(
    array($handler, 'open'),
    array($handler, 'close'),
    array($handler, 'read'),
    array($handler, 'write'),
    array($handler, 'destroy'),
    array($handler, 'gc')
);
```

## Caching Considerations

### Cache-Safe User Data

```php
// Don't cache pages with user-specific content
// Use nocache headers or cache exclusions

add_action('template_redirect', function() {
    if (my_plugin_has_user_content()) {
        nocache_headers();
    }
});
```

### AJAX for Dynamic Content

```php
// Static HTML (cacheable)
<div id="user-cart" data-nonce="<?php echo wp_create_nonce('cart'); ?>">
    <span class="loading">Loading cart...</span>
</div>

// Load via AJAX (not cached)
<script>
jQuery(document).ready(function($) {
    $.ajax({
        url: ajaxurl,
        data: {
            action: 'get_user_cart',
            nonce: $('#user-cart').data('nonce')
        },
        success: function(response) {
            $('#user-cart').html(response.data);
        }
    });
});
</script>
```

### ESI (Edge Side Includes)

```php
// With supported CDN/cache
// Main page is cached, ESI fragment loaded separately
<esi:include src="/cart-fragment/" />
```

## Detecting Session Issues

```php
// Log session usage
add_action('init', function() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        error_log('Session active on: ' . $_SERVER['REQUEST_URI']);
        error_log('Session started by: ' . debug_backtrace()[0]['file']);
    }
}, 1);

// Check for problematic plugins
add_action('admin_notices', function() {
    if (session_status() === PHP_SESSION_ACTIVE && current_user_can('manage_options')) {
        echo '<div class="notice notice-warning">';
        echo '<p>Warning: PHP sessions are active. This may affect caching.</p>';
        echo '</div>';
    }
});
```

## Best Practices

1. **Avoid PHP sessions** - Use WordPress alternatives
2. **Close sessions early** - If you must use them
3. **Use cookies wisely** - For non-sensitive data
4. **Store in database** - For persistent user data
5. **Consider caching** - Design for cached pages

## Common Pitfalls

- Using sessions without realizing the impact
- Not closing sessions promptly
- Breaking page caching unknowingly
- Session data lost across servers
- AJAX requests blocking each other

## Exam Tips

- **Know why sessions are problematic**: PHP sessions use cookies and server-side storage, which breaks page caching (each user gets different cached content). Sessions don't work across multiple servers (load balancing issues). They cause blocking (session files lock). WordPress doesn't use sessions by default for good reasons. Sessions prevent proper caching, CDN usage, and scalable architectures. Understanding these issues helps you avoid sessions and use better alternatives.

- **Understand WordPress alternatives**: Use transients for temporary data (with expiration). Use cookies for client-side data (with proper security). Use user meta for user-specific persistent data. Use options API for site-wide settings. Use object cache for shared temporary data. Use REST API with authentication for stateful operations. WordPress provides these alternatives that work with caching and scale better than sessions.

- **Know how to detect session usage**: Check if `session_start()` is called anywhere. Look for `$_SESSION` usage. Check if `session_id()` returns a value. Use Query Monitor or debugging tools to detect session usage. Check if `PHPSESSID` cookie is being set. Understanding how to detect sessions helps identify problematic code and plugins that break caching.

- **Understand caching implications**: Sessions make every page request unique (different session IDs), preventing page caching entirely. Object caching can't cache pages with active sessions. CDNs can't cache personalized content. This dramatically reduces performance benefits of caching. Even if you think you need sessions, the performance cost usually outweighs benefits. Always prefer stateless solutions that work with caching.

- **Know database-based session alternatives**: Use `wp_options` table for temporary data with `add_option()` and expiration. Use `wp_usermeta` for user-specific data. Use transients (which use options table) for cached data with expiration. Use object cache (Redis/Memcached) for shared temporary data. These alternatives work with WordPress's caching systems and scale across multiple servers, unlike PHP sessions.
