# Core REST API Usage and Customization

## Overview

The WordPress REST API provides a standardized way to interact with WordPress data using HTTP requests. It enables headless WordPress, mobile apps, and third-party integrations.

## Key Concepts

### API Base URL

The REST API is available at: `https://yoursite.com/wp-json/wp/v2/`

### HTTP Methods

| Method | Purpose |
|--------|---------|
| GET | Retrieve data |
| POST | Create new data |
| PUT/PATCH | Update existing data |
| DELETE | Remove data |

## Basic Usage

### Fetching Posts

```javascript
// JavaScript - Fetch posts
fetch('/wp-json/wp/v2/posts')
    .then(response => response.json())
    .then(posts => console.log(posts));

// With parameters
fetch('/wp-json/wp/v2/posts?per_page=5&categories=10')
    .then(response => response.json())
    .then(posts => console.log(posts));
```

### Creating a Post (Authenticated)

```javascript
fetch('/wp-json/wp/v2/posts', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': wpApiSettings.nonce
    },
    body: JSON.stringify({
        title: 'My New Post',
        content: 'Post content here',
        status: 'publish'
    })
});
```

## Authentication Methods

### 1. Cookie Authentication (for logged-in users)

```php
// Enqueue the API script with nonce
wp_enqueue_script('wp-api');
wp_localize_script('my-script', 'wpApiSettings', array(
    'root' => esc_url_raw(rest_url()),
    'nonce' => wp_create_nonce('wp_rest')
));
```

### 2. Application Passwords (WordPress 5.6+)

```bash
# Basic auth with application password
curl -u "username:xxxx xxxx xxxx xxxx" \
    https://yoursite.com/wp-json/wp/v2/posts
```

### 3. OAuth (via plugins)

External applications typically use OAuth for secure authentication.

## Registering Custom Endpoints

```php
// Register a custom REST route
add_action('rest_api_init', function() {
    register_rest_route('myplugin/v1', '/items', array(
        'methods' => 'GET',
        'callback' => 'get_items_callback',
        'permission_callback' => function() {
            return current_user_can('read');
        }
    ));
});

function get_items_callback($request) {
    $items = get_posts(array(
        'post_type' => 'item',
        'numberposts' => $request->get_param('per_page') ?: 10
    ));
    
    return new WP_REST_Response($items, 200);
}
```

## Adding Custom Fields to Existing Endpoints

```php
// Add a custom field to posts endpoint
add_action('rest_api_init', function() {
    register_rest_field('post', 'reading_time', array(
        'get_callback' => function($post) {
            $content = get_post_field('post_content', $post['id']);
            $word_count = str_word_count(strip_tags($content));
            return ceil($word_count / 200) . ' min read';
        },
        'schema' => array(
            'description' => 'Estimated reading time',
            'type' => 'string'
        )
    ));
});
```

## Request Validation and Sanitization

```php
register_rest_route('myplugin/v1', '/item/(?P<id>\d+)', array(
    'methods' => 'POST',
    'callback' => 'update_item',
    'permission_callback' => function() {
        return current_user_can('edit_posts');
    },
    'args' => array(
        'id' => array(
            'validate_callback' => function($param) {
                return is_numeric($param);
            },
            'sanitize_callback' => 'absint',
            'required' => true
        ),
        'title' => array(
            'sanitize_callback' => 'sanitize_text_field',
            'required' => true
        )
    )
));
```

## Error Handling

```php
function get_item_callback($request) {
    $id = $request->get_param('id');
    $item = get_post($id);
    
    if (!$item) {
        return new WP_Error(
            'item_not_found',
            'Item not found',
            array('status' => 404)
        );
    }
    
    return new WP_REST_Response($item, 200);
}
```

## Best Practices

1. **Always use permission callbacks** - Never skip authentication checks
2. **Validate and sanitize** - Always validate input and sanitize output
3. **Use proper HTTP status codes** - 200, 201, 400, 401, 403, 404, 500
4. **Version your API** - Use `/v1/`, `/v2/` in your namespaces
5. **Document your endpoints** - Include schema definitions

## Common Pitfalls

- Missing permission callbacks (security vulnerability)
- Not handling errors properly
- Exposing sensitive data
- Not versioning custom endpoints

## Exam Tips

- **Know the core endpoints and their parameters**: Familiarize yourself with standard endpoints like `/wp/v2/posts`, `/wp/v2/users`, `/wp/v2/categories` and their query parameters (e.g., `per_page`, `page`, `search`, `orderby`). Understanding these allows you to efficiently retrieve and manipulate WordPress data via the API.

- **Understand authentication methods and when to use each**: Cookie authentication works for logged-in users in the same domain, application passwords are for external applications, and OAuth is for third-party integrations. Each method has specific use cases - cookie auth for same-origin requests, app passwords for scripts/CLI tools, and OAuth for public applications.

- **Be able to register custom endpoints with proper validation**: You must know how to use `register_rest_route()` with proper `permission_callback` (never skip this for security), `validate_callback` and `sanitize_callback` for arguments, and proper HTTP status codes. Missing permission callbacks is a critical security vulnerability.

- **Know how to extend existing endpoints with custom fields**: Use `register_rest_field()` to add custom data to existing endpoints like posts or users. This allows you to expose custom post meta, computed values, or related data without creating entirely new endpoints, making your API more efficient and consistent.
