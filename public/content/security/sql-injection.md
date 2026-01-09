# SQL Injection Prevention

## Overview

SQL injection is one of the most dangerous web vulnerabilities. It occurs when untrusted data is inserted into SQL queries, allowing attackers to manipulate database operations. WordPress provides robust tools to prevent SQL injection.

## How SQL Injection Works

### Vulnerable Code Example

```php
// DANGEROUS - Never do this!
$user_input = $_GET['id'];
$query = "SELECT * FROM wp_posts WHERE ID = $user_input";
$result = $wpdb->get_results($query);

// Attacker uses: ?id=1 OR 1=1
// Results in: SELECT * FROM wp_posts WHERE ID = 1 OR 1=1
// Returns ALL posts
```

### More Dangerous Examples

```php
// DANGEROUS - String injection
$search = $_GET['search'];
$query = "SELECT * FROM wp_posts WHERE post_title LIKE '%$search%'";
// Attacker: ?search=' OR '1'='1

// DANGEROUS - Union injection
$id = $_GET['id'];
$query = "SELECT post_title FROM wp_posts WHERE ID = $id";
// Attacker: ?id=1 UNION SELECT user_pass FROM wp_users
```

## Prevention with $wpdb->prepare()

### Basic Usage

```php
global $wpdb;

// Integer placeholder
$post_id = $_GET['id'];
$result = $wpdb->get_row(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->posts} WHERE ID = %d",
        absint($post_id)
    )
);

// String placeholder
$title = $_GET['title'];
$result = $wpdb->get_row(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->posts} WHERE post_title = %s",
        sanitize_text_field($title)
    )
);

// Float placeholder
$price = $_GET['price'];
$result = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}products WHERE price <= %f",
        floatval($price)
    )
);
```

### Placeholder Types

| Placeholder | Type | Use For |
|-------------|------|---------|
| `%d` | Integer | IDs, counts, any integers |
| `%f` | Float | Prices, percentages |
| `%s` | String | Text, slugs, identifiers |

### Multiple Parameters

```php
// Multiple placeholders
$result = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->posts} 
         WHERE post_author = %d 
         AND post_status = %s 
         AND post_date > %s",
        $author_id,
        $status,
        $date
    )
);
```

## LIKE Queries

### Using esc_like()

```php
// Escape special LIKE characters (%, _)
$search = $_GET['search'];
$like = '%' . $wpdb->esc_like(sanitize_text_field($search)) . '%';

$results = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->posts} WHERE post_title LIKE %s",
        $like
    )
);
```

### Multiple LIKE Patterns

```php
$search_terms = explode(' ', sanitize_text_field($_GET['search']));
$where_clauses = array();
$prepare_args = array();

foreach ($search_terms as $term) {
    $where_clauses[] = 'post_title LIKE %s';
    $prepare_args[] = '%' . $wpdb->esc_like($term) . '%';
}

$where = implode(' AND ', $where_clauses);
$query = "SELECT * FROM {$wpdb->posts} WHERE $where";

$results = $wpdb->get_results(
    $wpdb->prepare($query, $prepare_args)
);
```

## IN Clauses

### Safe IN Query

```php
// Array of IDs
$ids = array_map('absint', $_GET['ids']);

if (!empty($ids)) {
    // Create placeholders
    $placeholders = implode(', ', array_fill(0, count($ids), '%d'));
    
    $results = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT * FROM {$wpdb->posts} WHERE ID IN ($placeholders)",
            $ids
        )
    );
}
```

### Safe IN with Strings

```php
$statuses = array('publish', 'draft', 'pending');
$user_statuses = array_intersect($_GET['statuses'], $statuses); // Whitelist

if (!empty($user_statuses)) {
    $placeholders = implode(', ', array_fill(0, count($user_statuses), '%s'));
    
    $results = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT * FROM {$wpdb->posts} WHERE post_status IN ($placeholders)",
            $user_statuses
        )
    );
}
```

## Table and Column Names

```php
// Table names can't use prepare() placeholders
// Whitelist approach for dynamic table names
$allowed_tables = array('posts', 'users', 'comments');
$table = sanitize_key($_GET['table']);

if (in_array($table, $allowed_tables, true)) {
    $full_table = $wpdb->prefix . $table;
    $results = $wpdb->get_results(
        "SELECT * FROM `$full_table` LIMIT 10"
    );
}

// Column names - whitelist approach
$allowed_columns = array('post_title', 'post_date', 'post_author');
$order_by = sanitize_key($_GET['orderby']);

if (in_array($order_by, $allowed_columns, true)) {
    $results = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT * FROM {$wpdb->posts} WHERE post_status = %s ORDER BY `$order_by`",
            'publish'
        )
    );
}
```

## Safe Insert/Update

### Using insert()

```php
// Safe insert - values are automatically escaped
$wpdb->insert(
    $wpdb->prefix . 'custom_table',
    array(
        'title' => sanitize_text_field($_POST['title']),
        'content' => wp_kses_post($_POST['content']),
        'user_id' => absint($_POST['user_id']),
        'created' => current_time('mysql'),
    ),
    array('%s', '%s', '%d', '%s') // Format specifiers
);

$new_id = $wpdb->insert_id;
```

### Using update()

```php
// Safe update
$wpdb->update(
    $wpdb->prefix . 'custom_table',
    // Data to update
    array(
        'title' => sanitize_text_field($_POST['title']),
        'status' => sanitize_key($_POST['status']),
    ),
    // WHERE clause
    array('id' => absint($_POST['id'])),
    // Data formats
    array('%s', '%s'),
    // WHERE formats
    array('%d')
);
```

### Using delete()

```php
// Safe delete
$wpdb->delete(
    $wpdb->prefix . 'custom_table',
    array('id' => absint($_GET['id'])),
    array('%d')
);
```

## Using WP_Query Instead

```php
// Prefer WP_Query for posts - handles sanitization
$query = new WP_Query(array(
    'post_type' => 'post',
    'author' => absint($_GET['author']),
    's' => sanitize_text_field($_GET['search']),
    'post_status' => 'publish',
));

// For meta queries
$query = new WP_Query(array(
    'meta_query' => array(
        array(
            'key' => 'price',
            'value' => floatval($_GET['max_price']),
            'compare' => '<=',
            'type' => 'NUMERIC',
        ),
    ),
));
```

## Order and Limit

```php
// Order direction - whitelist
$order = strtoupper($_GET['order']) === 'DESC' ? 'DESC' : 'ASC';

// Limit - sanitize as integer
$limit = min(absint($_GET['limit']), 100); // Cap at 100

$results = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT * FROM {$wpdb->posts} 
         WHERE post_status = %s 
         ORDER BY post_date $order 
         LIMIT %d",
        'publish',
        $limit
    )
);
```

## Complete Example

```php
function get_filtered_items($args) {
    global $wpdb;
    
    $defaults = array(
        'search' => '',
        'status' => 'active',
        'category' => 0,
        'orderby' => 'created',
        'order' => 'DESC',
        'limit' => 20,
        'offset' => 0,
    );
    
    $args = wp_parse_args($args, $defaults);
    
    // Whitelist for orderby
    $allowed_orderby = array('created', 'title', 'price');
    $orderby = in_array($args['orderby'], $allowed_orderby, true) 
        ? $args['orderby'] 
        : 'created';
    
    // Whitelist for order
    $order = strtoupper($args['order']) === 'ASC' ? 'ASC' : 'DESC';
    
    // Build query parts
    $where = array('1=1');
    $prepare_values = array();
    
    // Search
    if (!empty($args['search'])) {
        $where[] = 'title LIKE %s';
        $prepare_values[] = '%' . $wpdb->esc_like(sanitize_text_field($args['search'])) . '%';
    }
    
    // Status filter
    if (!empty($args['status'])) {
        $where[] = 'status = %s';
        $prepare_values[] = sanitize_key($args['status']);
    }
    
    // Category filter
    if (!empty($args['category'])) {
        $where[] = 'category_id = %d';
        $prepare_values[] = absint($args['category']);
    }
    
    // Add limit/offset
    $prepare_values[] = absint($args['limit']);
    $prepare_values[] = absint($args['offset']);
    
    $table = $wpdb->prefix . 'my_items';
    $where_clause = implode(' AND ', $where);
    
    $query = "SELECT * FROM `$table` 
              WHERE $where_clause 
              ORDER BY `$orderby` $order 
              LIMIT %d OFFSET %d";
    
    return $wpdb->get_results(
        $wpdb->prepare($query, $prepare_values)
    );
}
```

## Best Practices

1. **Always use prepare()** for queries with user input
2. **Sanitize AND escape** - defense in depth
3. **Use WordPress APIs** - WP_Query, get_posts(), etc.
4. **Whitelist** - For table names, column names, sort orders
5. **Never concatenate** user input into queries
6. **Type cast** - absint(), floatval() for numbers

## Common Pitfalls

- Forgetting to escape LIKE wildcards
- Trusting "internal" data (it may have originated from users)
- Not using format specifiers with insert/update
- Thinking sanitization alone prevents injection
- Building dynamic table/column names from user input

## Exam Tips

- **Know all prepare() placeholder types (%d, %s, %f)**: `%d` is for integers (automatically casts to int), `%s` is for strings (adds quotes and escapes), `%f` is for floats (for decimal numbers). Always use placeholders - never concatenate variables into SQL. `prepare()` handles escaping, quoting, and type conversion automatically. Using wrong placeholder type can cause errors or security issues. `%d` and `%s` are most common, `%f` is rarely needed.

- **Understand esc_like() usage**: `$wpdb->esc_like()` escapes wildcards (`%` and `_`) for LIKE queries. Use it before `prepare()`: `$search = '%' . $wpdb->esc_like($term) . '%'` then use in `prepare()`. Without `esc_like()`, users could use wildcards to match unintended data. Always escape LIKE patterns even when using `prepare()` - `prepare()` doesn't escape wildcards for LIKE queries. This prevents users from using SQL wildcards maliciously.

- **Know when to use insert/update/delete methods**: Use `$wpdb->insert()`, `$wpdb->update()`, `$wpdb->delete()` instead of raw SQL when possible - they handle escaping automatically. These methods accept arrays and handle formatting. Use raw `$wpdb->prepare()` + `$wpdb->query()` for complex queries these methods can't handle. The helper methods are safer and easier, but raw queries give more control. Always prefer helper methods when they meet your needs.

- **Understand IN clause handling**: For IN clauses with variable number of values, use `implode(',', array_fill(0, count($ids), '%d'))` to create placeholders, then use those IDs as arguments to `prepare()`. Example: `$placeholders = implode(',', array_fill(0, count($ids), '%d')); $wpdb->prepare("SELECT * FROM table WHERE id IN ($placeholders)", ...$ids)`. Never put IDs directly in IN clause - always use placeholders. This prevents SQL injection even with dynamic lists.

- **Know to whitelist table/column names**: Table and column names cannot use placeholders in `prepare()`. Always whitelist them - check against known valid names. Use `$wpdb->posts`, `$wpdb->users` etc. for core tables. For custom tables, validate against a whitelist: `$allowed_tables = array('my_table'); if (!in_array($table, $allowed_tables)) return;`. Never use user input directly as table/column names. This prevents attackers from accessing unauthorized tables or columns.
