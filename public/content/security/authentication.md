# Authentication

## Overview

Authentication verifies user identity - confirming that users are who they claim to be. WordPress provides a robust authentication system that can be extended and customized.

## WordPress Authentication Flow

### Login Process

```
1. User submits credentials
2. WordPress validates username/email
3. Password verified against hash
4. Authentication cookies set
5. User redirected to destination
```

### Core Functions

```php
// Check if user is logged in
if (is_user_logged_in()) {
    $user = wp_get_current_user();
    echo 'Hello, ' . esc_html($user->display_name);
}

// Get current user ID
$user_id = get_current_user_id(); // Returns 0 if not logged in

// Get user object
$user = wp_get_current_user();
echo $user->user_login;
echo $user->user_email;
echo $user->display_name;
```

## Programmatic Authentication

### Authenticating Users

```php
// Authenticate with credentials
$user = wp_authenticate($username, $password);

if (is_wp_error($user)) {
    $error_code = $user->get_error_code();
    $error_message = $user->get_error_message();
    // Handle error
} else {
    // User authenticated successfully
    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID);
}
```

### Signing Users In

```php
// Full sign-in process
function custom_sign_in($username, $password, $remember = false) {
    $creds = array(
        'user_login'    => $username,
        'user_password' => $password,
        'remember'      => $remember,
    );
    
    $user = wp_signon($creds, is_ssl());
    
    if (is_wp_error($user)) {
        return $user; // Return error
    }
    
    return $user; // Return user object
}
```

### Signing Users Out

```php
// Log out current user
wp_logout();

// Log out and redirect
wp_logout();
wp_redirect(home_url());
exit;

// Hook into logout
add_action('wp_logout', 'custom_logout_action');
function custom_logout_action() {
    // Clear custom cookies, sessions, etc.
}
```

## Authentication Hooks

### authenticate Filter

```php
// Custom authentication logic
add_filter('authenticate', 'custom_authenticate', 30, 3);

function custom_authenticate($user, $username, $password) {
    // Skip if already authenticated or error
    if (is_a($user, 'WP_User')) {
        return $user;
    }
    
    // Custom authentication (e.g., external API)
    $external_user = verify_with_external_service($username, $password);
    
    if ($external_user) {
        // Get or create WordPress user
        $wp_user = get_user_by('email', $external_user['email']);
        if (!$wp_user) {
            $wp_user = wp_create_user(
                $external_user['username'],
                wp_generate_password(),
                $external_user['email']
            );
        }
        return new WP_User($wp_user);
    }
    
    return $user; // Let other authentication methods try
}
```

### Login Actions

```php
// Before login form
add_action('login_form', 'add_custom_login_field');
function add_custom_login_field() {
    echo '<p class="custom-field">
        <label>Company Code<br>
        <input type="text" name="company_code" class="input">
        </label>
    </p>';
}

// During authentication
add_filter('authenticate', 'check_company_code', 40, 3);
function check_company_code($user, $username, $password) {
    if (is_wp_error($user)) {
        return $user;
    }
    
    $code = isset($_POST['company_code']) ? sanitize_text_field($_POST['company_code']) : '';
    if ($code !== 'VALID_CODE') {
        return new WP_Error('invalid_code', 'Invalid company code');
    }
    
    return $user;
}

// After successful login
add_action('wp_login', 'after_login_action', 10, 2);
function after_login_action($user_login, $user) {
    // Log login
    error_log("User {$user_login} logged in at " . current_time('mysql'));
    
    // Update last login
    update_user_meta($user->ID, 'last_login', current_time('mysql'));
}

// Failed login attempt
add_action('wp_login_failed', 'log_failed_login');
function log_failed_login($username) {
    error_log("Failed login attempt for: {$username}");
    // Implement rate limiting here
}
```

## Authentication Cookies

### How Cookies Work

```php
// WordPress sets these cookies on login:
// - wordpress_[hash] - Authentication cookie
// - wordpress_logged_in_[hash] - Logged-in cookie
// - wordpress_sec_[hash] - Secure cookie (HTTPS)

// Cookie duration
add_filter('auth_cookie_expiration', 'custom_cookie_expiration', 10, 3);
function custom_cookie_expiration($expiration, $user_id, $remember) {
    if ($remember) {
        return 30 * DAY_IN_SECONDS; // 30 days
    }
    return 2 * DAY_IN_SECONDS; // 2 days
}
```

### Secure Cookie Settings

```php
// In wp-config.php
define('COOKIEHASH', md5('your-unique-phrase'));
define('COOKIE_DOMAIN', '.example.com'); // Include subdomains

// Force secure cookies
define('FORCE_SSL_ADMIN', true);
```

## Password Handling

### Password Hashing

```php
// Hash password (WordPress uses bcrypt)
$hash = wp_hash_password('user_password');

// Verify password
if (wp_check_password($password, $stored_hash, $user_id)) {
    // Password is correct
}

// Update password
wp_set_password($new_password, $user_id);
```

### Password Validation

```php
// Validate password strength
add_action('validate_password_reset', 'enforce_password_policy', 10, 2);
add_action('user_profile_update_errors', 'enforce_password_policy', 10, 3);

function enforce_password_policy($errors, $user = null, $userdata = null) {
    $password = isset($_POST['pass1']) ? $_POST['pass1'] : '';
    
    if (strlen($password) < 12) {
        $errors->add('weak_password', 'Password must be at least 12 characters');
    }
    
    if (!preg_match('/[A-Z]/', $password)) {
        $errors->add('weak_password', 'Password must contain uppercase letter');
    }
    
    if (!preg_match('/[0-9]/', $password)) {
        $errors->add('weak_password', 'Password must contain a number');
    }
    
    if (!preg_match('/[^A-Za-z0-9]/', $password)) {
        $errors->add('weak_password', 'Password must contain a special character');
    }
    
    return $errors;
}
```

## Two-Factor Authentication

### Implementation Example

```php
// Store 2FA secret
function setup_2fa($user_id, $secret) {
    $encrypted = openssl_encrypt($secret, 'AES-256-CBC', AUTH_KEY, 0, substr(AUTH_SALT, 0, 16));
    update_user_meta($user_id, '_2fa_secret', $encrypted);
}

// Verify 2FA code
function verify_2fa_code($user_id, $code) {
    $encrypted = get_user_meta($user_id, '_2fa_secret', true);
    $secret = openssl_decrypt($encrypted, 'AES-256-CBC', AUTH_KEY, 0, substr(AUTH_SALT, 0, 16));
    
    // Use TOTP library to verify
    return verify_totp($secret, $code);
}

// Interrupt login for 2FA
add_filter('authenticate', 'check_2fa_required', 100, 3);
function check_2fa_required($user, $username, $password) {
    if (!is_a($user, 'WP_User')) {
        return $user;
    }
    
    if (get_user_meta($user->ID, '_2fa_enabled', true)) {
        // Store user ID in transient
        set_transient('2fa_pending_' . session_id(), $user->ID, 5 * MINUTE_IN_SECONDS);
        
        // Return error to show 2FA form
        return new WP_Error('2fa_required', '2FA code required');
    }
    
    return $user;
}
```

## Application Passwords

```php
// WordPress 5.6+ supports application passwords
// Useful for API authentication

// Check if request uses application password
if (wp_is_application_passwords_available()) {
    // Application passwords are supported
}

// Authenticate with application password
// Sent via Basic Auth: Authorization: Basic base64(username:app_password)

// Create application password programmatically
$app_password = WP_Application_Passwords::create_new_application_password(
    $user_id,
    array('name' => 'My App')
);
```

## Session Management

```php
// Get all user sessions
$sessions = WP_Session_Tokens::get_instance($user_id);
$all_sessions = $sessions->get_all();

// Destroy all sessions except current
$sessions->destroy_others(wp_get_session_token());

// Destroy all sessions
$sessions->destroy_all();

// Destroy specific session
$sessions->destroy($token);

// Add session management UI
add_action('show_user_profile', 'show_session_manager');
function show_session_manager($user) {
    $sessions = WP_Session_Tokens::get_instance($user->ID);
    $all = $sessions->get_all();
    
    echo '<h3>Active Sessions</h3>';
    foreach ($all as $token => $session) {
        printf(
            '<p>Login: %s, IP: %s <a href="%s">Revoke</a></p>',
            date('Y-m-d H:i', $session['login']),
            $session['ip'],
            wp_nonce_url(admin_url('profile.php?action=revoke&token=' . $token), 'revoke_session')
        );
    }
}
```

## Restricting Access

```php
// Require login for entire site
add_action('template_redirect', 'require_login');
function require_login() {
    if (!is_user_logged_in() && !is_login_page()) {
        wp_redirect(wp_login_url(get_permalink()));
        exit;
    }
}

function is_login_page() {
    return in_array($GLOBALS['pagenow'], array('wp-login.php', 'wp-register.php'));
}

// Restrict admin access
add_action('admin_init', 'restrict_admin');
function restrict_admin() {
    if (!current_user_can('edit_posts') && !wp_doing_ajax()) {
        wp_redirect(home_url());
        exit;
    }
}

// Hide admin bar for non-editors
add_action('after_setup_theme', 'manage_admin_bar');
function manage_admin_bar() {
    if (!current_user_can('edit_posts')) {
        show_admin_bar(false);
    }
}
```

## Best Practices

1. **Use HTTPS** - Always for login and authenticated pages
2. **Strong passwords** - Enforce minimum requirements
3. **Limit login attempts** - Prevent brute force
4. **Session management** - Allow users to revoke sessions
5. **2FA** - Offer for sensitive accounts
6. **Secure cookies** - Use secure, httponly flags

## Common Pitfalls

- Not using HTTPS for login
- Storing plain text passwords
- Not invalidating sessions on password change
- Allowing unlimited login attempts
- Not logging authentication events
- Exposing user enumeration

## Exam Tips

- **Know the authentication flow and hooks**: WordPress authentication uses `wp_authenticate()` which fires `authenticate` filter. Hooks: `wp_authenticate_user` (validate credentials), `wp_set_current_user` (set user), `wp_login` (after successful login), `wp_logout` (on logout). Understanding the flow helps you customize authentication, add two-factor auth, or integrate external auth systems. Always use hooks rather than modifying core files.

- **Understand cookie-based authentication**: WordPress uses secure HTTP-only cookies for authentication. Cookies set via `wp_set_auth_cookie()` with secure, httponly flags. Cookies contain user ID and session token. Session tokens stored in `wp_usermeta` table. Multiple tokens allowed (one per device/browser). Understanding cookies helps debug auth issues and implement secure custom auth. Never store sensitive data in cookies - only tokens.

- **Know wp_authenticate vs wp_signon**: `wp_authenticate($username, $password)` validates credentials and returns `WP_User` or `WP_Error` - doesn't log user in. `wp_signon($credentials)` authenticates AND logs user in (sets cookies, fires hooks). Use `wp_authenticate()` to check credentials without logging in. Use `wp_signon()` for actual login. Understanding the difference helps when building custom login flows or checking credentials without session creation.

- **Understand session token management**: WordPress uses session tokens stored in user meta for security. Each login creates new token. Tokens validated on each request. Multiple tokens allowed (different devices). Use `wp_get_session_token()` to get current token. Use `wp_destroy_all_sessions()` to logout all devices. Use `wp_destroy_other_sessions()` to logout other devices. Token management prevents session hijacking and allows device management.

- **Know application passwords (WP 5.6+)**: Application passwords allow external apps to authenticate without user password. Created per-application in user profile. Used for REST API authentication. Format: `username:xxxx xxxx xxxx xxxx`. Revocable individually. More secure than storing user passwords. Use for mobile apps, CLI tools, third-party integrations. Understanding application passwords helps secure API access without compromising main password.
