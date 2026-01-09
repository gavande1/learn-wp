# Secure APIs

## Overview

Building secure APIs in WordPress requires proper authentication, authorization, input validation, output encoding, and rate limiting. This covers securing both the REST API and custom AJAX endpoints.

## REST API Security

### Authentication Methods

```php
// Cookie Authentication (for logged-in users on same domain)
// Automatically handled by WordPress when nonce is provided

// Application Passwords (WordPress 5.6+)
// Header: Authorization: Basic base64(username:app_password)

// Custom Authentication
add_filter('determine_current_user', 'custom_api_authentication', 20);

function custom_api_authentication($user_id) {
    if ($user_id) {
        return $user_id; // Already authenticated
    }
    
    // Check for API key
    $api_key = isset($_SERVER['HTTP_X_API_KEY']) 
        ? sanitize_text_field($_SERVER['HTTP_X_API_KEY']) 
        : '';
    
    if (empty($api_key)) {
        return $user_id;
    }
    
    // Validate API key
    $user = get_user_by_api_key($api_key);
    if ($user) {
        return $user->ID;
    }
    
    return $user_id;
}
```

### Permission Callbacks

```php
// Always set permission_callback - NEVER skip it
register_rest_route('my-plugin/v1', '/items', array(
    array(
        'methods' => 'GET',
        'callback' => 'get_items',
        'permission_callback' => '__return_true', // Explicitly public
    ),
    array(
        'methods' => 'POST',
        'callback' => 'create_item',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        },
    ),
));

// Object-level permissions
register_rest_route('my-plugin/v1', '/items/(?P<id>\d+)', array(
    'methods' => 'PUT',
    'callback' => 'update_item',
    'permission_callback' => function($request) {
        $item_id = $request->get_param('id');
        $item = get_post($item_id);
        
        if (!$item) {
            return new WP_Error('not_found', 'Item not found', array('status' => 404));
        }
        
        return current_user_can('edit_post', $item_id);
    },
    'args' => array(
        'id' => array(
            'validate_callback' => function($param) {
                return is_numeric($param);
            },
        ),
    ),
));
```

### Input Validation and Sanitization

```php
register_rest_route('my-plugin/v1', '/items', array(
    'methods' => 'POST',
    'callback' => 'create_item',
    'permission_callback' => function() {
        return current_user_can('edit_posts');
    },
    'args' => array(
        'title' => array(
            'required' => true,
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'validate_callback' => function($value) {
                if (strlen($value) < 3) {
                    return new WP_Error('too_short', 'Title must be at least 3 characters');
                }
                if (strlen($value) > 200) {
                    return new WP_Error('too_long', 'Title must be less than 200 characters');
                }
                return true;
            },
        ),
        'content' => array(
            'type' => 'string',
            'sanitize_callback' => 'wp_kses_post',
        ),
        'status' => array(
            'type' => 'string',
            'enum' => array('draft', 'pending', 'publish'),
            'default' => 'draft',
        ),
        'category_id' => array(
            'type' => 'integer',
            'sanitize_callback' => 'absint',
            'validate_callback' => function($value) {
                return term_exists($value, 'category');
            },
        ),
        'email' => array(
            'type' => 'string',
            'format' => 'email',
            'sanitize_callback' => 'sanitize_email',
        ),
        'tags' => array(
            'type' => 'array',
            'items' => array(
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
            ),
        ),
    ),
));
```

### Secure Response Handling

```php
function get_item($request) {
    $item_id = $request->get_param('id');
    $item = get_post($item_id);
    
    if (!$item) {
        return new WP_Error(
            'not_found',
            'Item not found',
            array('status' => 404)
        );
    }
    
    // Only return necessary fields (avoid data leakage)
    return new WP_REST_Response(array(
        'id' => $item->ID,
        'title' => $item->post_title,
        'content' => apply_filters('the_content', $item->post_content),
        'date' => $item->post_date,
        'author' => array(
            'id' => $item->post_author,
            'name' => get_the_author_meta('display_name', $item->post_author),
            // Don't expose email or other sensitive data
        ),
    ), 200);
}
```

## AJAX Security

### Secure AJAX Handler

```php
// Register AJAX actions
add_action('wp_ajax_my_action', 'handle_ajax_action');
add_action('wp_ajax_nopriv_my_action', 'handle_public_ajax');

function handle_ajax_action() {
    // 1. Verify nonce
    if (!check_ajax_referer('my_action_nonce', 'nonce', false)) {
        wp_send_json_error(array(
            'message' => 'Security verification failed'
        ), 403);
    }
    
    // 2. Verify capability
    if (!current_user_can('edit_posts')) {
        wp_send_json_error(array(
            'message' => 'You are not authorized'
        ), 403);
    }
    
    // 3. Validate input
    $item_id = isset($_POST['item_id']) ? absint($_POST['item_id']) : 0;
    if (!$item_id) {
        wp_send_json_error(array(
            'message' => 'Invalid item ID'
        ), 400);
    }
    
    // 4. Sanitize input
    $title = isset($_POST['title']) ? sanitize_text_field($_POST['title']) : '';
    
    // 5. Process request
    $result = wp_update_post(array(
        'ID' => $item_id,
        'post_title' => $title,
    ));
    
    if (is_wp_error($result)) {
        wp_send_json_error(array(
            'message' => $result->get_error_message()
        ), 500);
    }
    
    wp_send_json_success(array(
        'message' => 'Item updated',
        'item_id' => $result,
    ));
}
```

### Enqueue with Nonce

```php
function enqueue_ajax_scripts() {
    wp_enqueue_script('my-ajax', plugin_dir_url(__FILE__) . 'js/ajax.js', array('jquery'), '1.0', true);
    
    wp_localize_script('my-ajax', 'myAjaxConfig', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('my_action_nonce'),
        'userId' => get_current_user_id(),
    ));
}
add_action('wp_enqueue_scripts', 'enqueue_ajax_scripts');
```

## Rate Limiting

### Transient-Based Rate Limiting

```php
function check_rate_limit($action, $limit = 60, $window = 60) {
    $user_id = get_current_user_id();
    $ip = $_SERVER['REMOTE_ADDR'];
    
    $key = 'rate_limit_' . $action . '_' . ($user_id ?: md5($ip));
    $count = get_transient($key);
    
    if ($count === false) {
        set_transient($key, 1, $window);
        return true;
    }
    
    if ($count >= $limit) {
        return false;
    }
    
    set_transient($key, $count + 1, $window);
    return true;
}

// Usage in REST API
register_rest_route('my-plugin/v1', '/submit', array(
    'methods' => 'POST',
    'callback' => function($request) {
        if (!check_rate_limit('api_submit', 10, 60)) {
            return new WP_Error(
                'rate_limited',
                'Too many requests. Please wait.',
                array('status' => 429)
            );
        }
        // Process request
    },
    'permission_callback' => '__return_true',
));
```

### Login Rate Limiting

```php
add_filter('authenticate', 'rate_limit_login', 30, 3);

function rate_limit_login($user, $username, $password) {
    if (empty($username)) {
        return $user;
    }
    
    $ip = $_SERVER['REMOTE_ADDR'];
    $key = 'login_attempts_' . md5($ip . $username);
    $attempts = get_transient($key);
    
    if ($attempts && $attempts >= 5) {
        return new WP_Error(
            'too_many_attempts',
            'Too many failed attempts. Please wait 15 minutes.'
        );
    }
    
    return $user;
}

add_action('wp_login_failed', 'record_failed_login');

function record_failed_login($username) {
    $ip = $_SERVER['REMOTE_ADDR'];
    $key = 'login_attempts_' . md5($ip . $username);
    $attempts = get_transient($key) ?: 0;
    set_transient($key, $attempts + 1, 15 * MINUTE_IN_SECONDS);
}
```

## API Key Management

```php
// Generate API key for user
function generate_api_key($user_id) {
    $key = wp_generate_password(32, false);
    $hash = wp_hash_password($key);
    
    update_user_meta($user_id, '_api_key_hash', $hash);
    
    // Return key only once (user must save it)
    return $key;
}

// Validate API key
function validate_api_key($key) {
    global $wpdb;
    
    // Find all users with API keys
    $users = $wpdb->get_results(
        "SELECT user_id, meta_value FROM {$wpdb->usermeta} 
         WHERE meta_key = '_api_key_hash'"
    );
    
    foreach ($users as $user) {
        if (wp_check_password($key, $user->meta_value)) {
            return get_user_by('id', $user->user_id);
        }
    }
    
    return false;
}

// Revoke API key
function revoke_api_key($user_id) {
    delete_user_meta($user_id, '_api_key_hash');
    return true;
}
```

## Secure Headers

```php
// Add security headers to REST API responses
add_filter('rest_post_dispatch', 'add_security_headers', 10, 3);

function add_security_headers($response, $server, $request) {
    $response->header('X-Content-Type-Options', 'nosniff');
    $response->header('X-Frame-Options', 'DENY');
    $response->header('X-XSS-Protection', '1; mode=block');
    $response->header('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Remove WordPress version
    $response->header('X-Powered-By', '');
    
    return $response;
}
```

## CORS Configuration

```php
// Configure CORS for REST API
add_action('rest_api_init', 'configure_cors', 15);

function configure_cors() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', 'custom_cors_headers');
}

function custom_cors_headers($value) {
    $allowed_origins = array(
        'https://trusted-site.com',
        'https://app.mysite.com',
    );
    
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    
    if (in_array($origin, $allowed_origins)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');
    }
    
    return $value;
}
```

## Error Handling

```php
// Secure error responses (don't leak information)
function handle_api_error($error, $request) {
    // Log full error for debugging
    error_log(sprintf(
        'API Error: %s - Request: %s %s - User: %d',
        $error->get_error_message(),
        $request->get_method(),
        $request->get_route(),
        get_current_user_id()
    ));
    
    // Return sanitized error to client
    $code = $error->get_error_code();
    $status = $error->get_error_data()['status'] ?? 500;
    
    // Map internal errors to generic messages
    $public_messages = array(
        'db_error' => 'An error occurred. Please try again.',
        'internal_error' => 'An error occurred. Please try again.',
    );
    
    if (isset($public_messages[$code])) {
        return new WP_Error($code, $public_messages[$code], array('status' => $status));
    }
    
    return $error;
}
```

## Best Practices

1. **Always use permission_callback** - Never leave it undefined
2. **Validate and sanitize** - All input data
3. **Use appropriate HTTP status codes** - 401, 403, 404, 429
4. **Implement rate limiting** - Prevent abuse
5. **Log security events** - For auditing
6. **Use HTTPS** - Always encrypt API traffic
7. **Version your API** - For backward compatibility

## Common Pitfalls

- Missing permission_callback (logs deprecation notice)
- Exposing sensitive data in responses
- Not validating input types
- Returning stack traces in production
- Allowing unlimited request rates
- Using GET for state-changing operations

## Exam Tips

- **Know REST API authentication methods**: Cookie authentication (logged-in users, same domain), Application passwords (external apps, WP 5.6+), OAuth (third-party integrations via plugins). Each method has use cases - cookies for same-origin, app passwords for scripts/CLI, OAuth for public apps. Understanding methods helps choose appropriate auth for your API consumers. Always require authentication for state-changing operations.

- **Understand permission_callback importance**: `permission_callback` in `register_rest_route()` is REQUIRED and critical for security. Returns `true` (allowed) or `WP_Error` (denied). Never skip or return `true` unconditionally. Use `current_user_can('capability')` to check permissions. Can return different permissions per HTTP method. Missing or weak callbacks are serious vulnerabilities. Always verify user has permission to perform the requested action.

- **Know arg validation and sanitization**: REST API uses `validate_callback` and `sanitize_callback` in route arguments. `validate_callback` checks if data meets requirements (returns `true` or `WP_Error`). `sanitize_callback` cleans data (returns sanitized value). Always provide both - validate format/type/range, sanitize to safe values. Use appropriate WordPress sanitization functions. Validation rejects bad data, sanitization cleans acceptable data. Both are needed for secure APIs.

- **Understand nonce usage with REST API**: REST API uses nonces with action 'wp_rest'. Create with `wp_create_nonce('wp_rest')`, pass in `X-WP-Nonce` header or `_wpnonce` parameter. Verify with `check_ajax_referer('wp_rest', null, false)` or check header directly. Nonces prevent CSRF attacks on authenticated requests. Always verify nonces for state-changing operations. Combine with `permission_callback` for defense in depth.

- **Know AJAX handler security pattern**: AJAX handlers must verify nonce with `check_ajax_referer($action)` and check capabilities with `current_user_can($capability)`. Use `wp_ajax_{action}` for logged-in users, `wp_ajax_nopriv_{action}` for non-logged-in. Always sanitize and validate input. Use `wp_send_json_success()` and `wp_send_json_error()` for responses. Never trust `$_POST`/`$_GET` data. This pattern ensures AJAX handlers are secure against CSRF and unauthorized access.
