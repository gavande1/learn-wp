# Query Optimization

## Overview

Efficient database queries are essential for WordPress performance. Poor queries can cripple a site, especially at scale.

## Key Concepts

### Query Performance Metrics

- Execution time
- Rows examined vs returned
- Index usage
- Memory consumption

## Optimizing WP_Query

### Use Specific Parameters

```php
// BAD - Gets everything
$query = new WP_Query(array(
    'post_type' => 'post',
    'posts_per_page' => -1,
));

// GOOD - Only what you need
$query = new WP_Query(array(
    'post_type' => 'post',
    'posts_per_page' => 10,
    'no_found_rows' => true,  // Skip pagination count
    'update_post_meta_cache' => false,  // Skip meta caching
    'update_post_term_cache' => false,  // Skip term caching
    'fields' => 'ids',  // Only get IDs
));
```

### Avoid Meta Queries When Possible

```php
// SLOW - Meta query on unindexed field
$query = new WP_Query(array(
    'meta_query' => array(
        array(
            'key' => 'price',
            'value' => 100,
            'compare' => '>=',
            'type' => 'NUMERIC',
        ),
    ),
));

// BETTER - Use taxonomy for filterable data
// Or add index to meta_value column
```

### Limit Post Types

```php
// BAD - All public post types
'post_type' => 'any',

// GOOD - Specific types
'post_type' => array('post', 'product'),
```

## Direct Database Queries

### Use $wpdb->prepare()

```php
global $wpdb;

// GOOD - Prepared statement
$results = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT ID, post_title 
         FROM {$wpdb->posts} 
         WHERE post_type = %s 
         AND post_status = %s 
         LIMIT %d",
        'post',
        'publish',
        10
    )
);
```

### Select Only Needed Columns

```php
// BAD - Select all columns
$wpdb->get_results("SELECT * FROM {$wpdb->posts}");

// GOOD - Only needed columns
$wpdb->get_results("SELECT ID, post_title FROM {$wpdb->posts}");
```

## Using EXPLAIN

```php
// Analyze query performance
global $wpdb;
$explain = $wpdb->get_results(
    "EXPLAIN SELECT * FROM {$wpdb->posts} WHERE post_type = 'post'"
);

// Check for:
// - type: 'ALL' is bad (full table scan)
// - rows: High numbers indicate inefficiency
// - Extra: 'Using index' is good
```

## Indexing Strategies

```sql
-- Add index to frequently queried meta key
ALTER TABLE wp_postmeta ADD INDEX meta_key_value (meta_key, meta_value(20));

-- Add index for specific queries
ALTER TABLE wp_posts ADD INDEX post_type_status_date (post_type, post_status, post_date);
```

## Caching Query Results

```php
// Cache expensive query results
$cache_key = 'my_expensive_query_results';
$results = wp_cache_get($cache_key);

if (false === $results) {
    $results = $wpdb->get_results("...");
    wp_cache_set($cache_key, $results, '', HOUR_IN_SECONDS);
}
```

## Best Practices

1. **Never use posts_per_page => -1** in production
2. **Disable unnecessary caching** when not needed
3. **Use fields parameter** to limit returned data
4. **Add indexes** for frequently queried columns
5. **Monitor slow queries** with Query Monitor

## Exam Tips

- **Know WP_Query optimization parameters**: Use `no_found_rows => true` to skip pagination count (expensive). Use `update_post_meta_cache => false` and `update_post_term_cache => false` when you don't need that data. Use `fields => 'ids'` to return only IDs instead of full post objects. Use `posts_per_page` to limit results. These parameters significantly reduce query overhead and database load. Always use them when you don't need the extra data.

- **Understand when to use direct queries vs WP_Query**: Use `WP_Query` for standard post queries with WordPress features (meta, taxonomies, pagination). Use direct `$wpdb->get_results()` for custom tables, complex JOINs, or when you need raw SQL performance. `WP_Query` is easier but has overhead. Direct queries are faster but require manual escaping and don't integrate with WordPress features. Choose based on complexity and performance needs.

- **Know how to analyze queries with EXPLAIN**: Use `EXPLAIN` before SQL queries to see execution plan: `EXPLAIN SELECT ...`. Shows which indexes are used, table scan vs index scan, join types. Look for "Using filesort" (bad), "Using index" (good), "Using where" (filtering). Helps identify missing indexes or inefficient queries. Use Query Monitor plugin to see EXPLAIN for WordPress queries. Understanding EXPLAIN helps optimize slow queries.

- **Understand indexing basics**: Indexes speed up WHERE, ORDER BY, and JOIN clauses. Add indexes on frequently queried columns (post_author, post_status, meta_key). Use composite indexes for multiple column queries. Don't over-index (slows writes). WordPress automatically indexes primary keys. For custom tables, add indexes on foreign keys and frequently queried columns. Understanding indexes helps optimize database performance significantly.

- **Know common performance pitfalls**: Querying all posts to count them (use `no_found_rows`). Loading unnecessary post meta/terms (disable caches). Complex meta queries on large datasets (consider custom tables). N+1 queries (load related data in batches). Missing indexes on queried columns. Querying in loops (query once, loop results). Understanding these pitfalls helps avoid performance problems before they occur.
