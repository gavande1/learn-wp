# Integration Testing

## Overview

Integration testing verifies that different components of your WordPress plugin or theme work together correctly. Unlike unit tests that test isolated components, integration tests examine how multiple parts interact.

## Integration vs Unit Testing

| Aspect | Unit Testing | Integration Testing |
|--------|--------------|---------------------|
| Scope | Single function/class | Multiple components |
| Database | Usually mocked | Real test database |
| Speed | Fast | Slower |
| Purpose | Verify logic | Verify interaction |

## Setting Up Integration Tests

### Database Configuration

```php
<?php
// tests/bootstrap.php

// Define test database
define('DB_NAME', 'wordpress_test');
define('DB_USER', 'root');
define('DB_PASSWORD', '');
define('DB_HOST', 'localhost');

// Load WordPress test suite
$_tests_dir = getenv('WP_TESTS_DIR') ?: '/tmp/wordpress-tests-lib';
require_once $_tests_dir . '/includes/functions.php';

// Load your plugin
function _manually_load_plugin() {
    require dirname(__DIR__) . '/my-plugin.php';
}
tests_add_filter('muplugins_loaded', '_manually_load_plugin');

require $_tests_dir . '/includes/bootstrap.php';
```

### Test Isolation

```php
<?php

class Integration_Test_Case extends WP_UnitTestCase {
    
    protected static $original_options;
    
    public static function set_up_before_class() {
        parent::set_up_before_class();
        
        // Store original state
        self::$original_options = get_option('my_plugin_settings');
    }
    
    public static function tear_down_after_class() {
        // Restore original state
        update_option('my_plugin_settings', self::$original_options);
        
        parent::tear_down_after_class();
    }
    
    public function set_up() {
        parent::set_up();
        
        // Reset to clean state before each test
        delete_option('my_plugin_settings');
    }
}
```

## Testing Plugin Activation

```php
<?php

class Test_Plugin_Activation extends WP_UnitTestCase {
    
    public function test_activation_creates_tables() {
        global $wpdb;
        
        // Deactivate and reactivate
        deactivate_plugins('my-plugin/my-plugin.php');
        activate_plugin('my-plugin/my-plugin.php');
        
        // Check table exists
        $table_name = $wpdb->prefix . 'my_plugin_data';
        $table_exists = $wpdb->get_var(
            $wpdb->prepare(
                "SHOW TABLES LIKE %s",
                $table_name
            )
        ) === $table_name;
        
        $this->assertTrue($table_exists);
    }
    
    public function test_activation_sets_default_options() {
        activate_plugin('my-plugin/my-plugin.php');
        
        $settings = get_option('my_plugin_settings');
        
        $this->assertIsArray($settings);
        $this->assertArrayHasKey('version', $settings);
        $this->assertArrayHasKey('enabled', $settings);
    }
    
    public function test_activation_schedules_cron() {
        activate_plugin('my-plugin/my-plugin.php');
        
        $timestamp = wp_next_scheduled('my_plugin_daily_event');
        
        $this->assertNotFalse($timestamp);
    }
}
```

## Testing Custom Post Types

```php
<?php

class Test_Custom_Post_Type_Integration extends WP_UnitTestCase {
    
    public function test_cpt_registration() {
        // Trigger init action
        do_action('init');
        
        $this->assertTrue(post_type_exists('product'));
    }
    
    public function test_cpt_with_taxonomy() {
        // Create product with category
        $product_id = $this->factory->post->create(array(
            'post_type' => 'product',
            'post_title' => 'Test Product',
        ));
        
        $term_id = $this->factory->term->create(array(
            'taxonomy' => 'product_category',
            'name' => 'Electronics',
        ));
        
        wp_set_object_terms($product_id, $term_id, 'product_category');
        
        // Verify relationship
        $terms = wp_get_object_terms($product_id, 'product_category');
        $this->assertCount(1, $terms);
        $this->assertEquals('Electronics', $terms[0]->name);
    }
    
    public function test_cpt_meta_integration() {
        $product_id = $this->factory->post->create(array(
            'post_type' => 'product',
        ));
        
        // Save product meta through plugin function
        my_plugin_save_product_meta($product_id, array(
            'price' => 99.99,
            'sku' => 'PROD-001',
        ));
        
        // Verify meta saved correctly
        $price = get_post_meta($product_id, '_price', true);
        $sku = get_post_meta($product_id, '_sku', true);
        
        $this->assertEquals(99.99, $price);
        $this->assertEquals('PROD-001', $sku);
    }
}
```

## Testing User Interactions

```php
<?php

class Test_User_Integration extends WP_UnitTestCase {
    
    private $admin_id;
    private $editor_id;
    private $subscriber_id;
    
    public function set_up() {
        parent::set_up();
        
        $this->admin_id = $this->factory->user->create(array('role' => 'administrator'));
        $this->editor_id = $this->factory->user->create(array('role' => 'editor'));
        $this->subscriber_id = $this->factory->user->create(array('role' => 'subscriber'));
    }
    
    public function test_admin_can_manage_settings() {
        wp_set_current_user($this->admin_id);
        
        $result = my_plugin_update_settings(array(
            'option' => 'value',
        ));
        
        $this->assertTrue($result);
    }
    
    public function test_editor_cannot_manage_settings() {
        wp_set_current_user($this->editor_id);
        
        $result = my_plugin_update_settings(array(
            'option' => 'value',
        ));
        
        $this->assertFalse($result);
    }
    
    public function test_user_profile_integration() {
        wp_set_current_user($this->subscriber_id);
        
        // User updates profile through plugin
        my_plugin_update_user_preferences($this->subscriber_id, array(
            'notifications' => true,
            'theme' => 'dark',
        ));
        
        $prefs = my_plugin_get_user_preferences($this->subscriber_id);
        
        $this->assertTrue($prefs['notifications']);
        $this->assertEquals('dark', $prefs['theme']);
    }
}
```

## Testing Database Operations

```php
<?php

class Test_Database_Integration extends WP_UnitTestCase {
    
    public function test_custom_table_crud() {
        global $wpdb;
        $table = $wpdb->prefix . 'my_plugin_items';
        
        // Create
        $item_id = my_plugin_create_item(array(
            'name' => 'Test Item',
            'status' => 'active',
        ));
        
        $this->assertIsInt($item_id);
        
        // Read
        $item = my_plugin_get_item($item_id);
        $this->assertEquals('Test Item', $item->name);
        
        // Update
        my_plugin_update_item($item_id, array('name' => 'Updated Item'));
        $item = my_plugin_get_item($item_id);
        $this->assertEquals('Updated Item', $item->name);
        
        // Delete
        my_plugin_delete_item($item_id);
        $item = my_plugin_get_item($item_id);
        $this->assertNull($item);
    }
    
    public function test_transaction_rollback() {
        global $wpdb;
        
        $initial_count = $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->prefix}my_plugin_items"
        );
        
        try {
            $wpdb->query('START TRANSACTION');
            
            my_plugin_create_item(array('name' => 'Item 1'));
            my_plugin_create_item(array('name' => 'Item 2'));
            
            // Simulate error
            throw new Exception('Test error');
            
            $wpdb->query('COMMIT');
        } catch (Exception $e) {
            $wpdb->query('ROLLBACK');
        }
        
        $final_count = $wpdb->get_var(
            "SELECT COUNT(*) FROM {$wpdb->prefix}my_plugin_items"
        );
        
        $this->assertEquals($initial_count, $final_count);
    }
}
```

## Testing AJAX Handlers

```php
<?php

class Test_AJAX_Integration extends WP_UnitTestCase {
    
    public function set_up() {
        parent::set_up();
        
        // Set up AJAX environment
        if (!defined('DOING_AJAX')) {
            define('DOING_AJAX', true);
        }
    }
    
    public function test_ajax_handler_integration() {
        $user_id = $this->factory->user->create(array('role' => 'editor'));
        wp_set_current_user($user_id);
        
        // Set up request
        $_POST['action'] = 'my_plugin_save_data';
        $_POST['nonce'] = wp_create_nonce('my_plugin_nonce');
        $_POST['title'] = 'Test Title';
        $_POST['content'] = 'Test Content';
        
        // Capture output
        try {
            ob_start();
            do_action('wp_ajax_my_plugin_save_data');
            $response = ob_get_clean();
        } catch (WPDieException $e) {
            $response = ob_get_clean();
        }
        
        $data = json_decode($response, true);
        
        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('post_id', $data['data']);
    }
    
    public function test_ajax_nonce_verification() {
        wp_set_current_user(1);
        
        $_POST['action'] = 'my_plugin_save_data';
        $_POST['nonce'] = 'invalid_nonce';
        
        try {
            ob_start();
            do_action('wp_ajax_my_plugin_save_data');
            $response = ob_get_clean();
        } catch (WPDieException $e) {
            $response = ob_get_clean();
        }
        
        $data = json_decode($response, true);
        
        $this->assertFalse($data['success']);
    }
}
```

## Testing Cron Jobs

```php
<?php

class Test_Cron_Integration extends WP_UnitTestCase {
    
    public function test_cron_event_scheduled() {
        // Activate plugin (which schedules cron)
        activate_plugin('my-plugin/my-plugin.php');
        
        $next_run = wp_next_scheduled('my_plugin_hourly_task');
        
        $this->assertNotFalse($next_run);
    }
    
    public function test_cron_callback_executes() {
        // Create test data that cron should process
        $post_id = $this->factory->post->create(array(
            'post_status' => 'draft',
            'meta_input' => array(
                '_schedule_publish' => time() - 3600, // 1 hour ago
            ),
        ));
        
        // Run cron callback
        do_action('my_plugin_hourly_task');
        
        // Verify post was processed
        $post = get_post($post_id);
        $this->assertEquals('publish', $post->post_status);
    }
    
    public function test_cron_cleanup_old_data() {
        global $wpdb;
        $table = $wpdb->prefix . 'my_plugin_logs';
        
        // Insert old log entries
        for ($i = 0; $i < 10; $i++) {
            $wpdb->insert($table, array(
                'message' => 'Old log',
                'created_at' => date('Y-m-d H:i:s', strtotime('-60 days')),
            ));
        }
        
        $before_count = $wpdb->get_var("SELECT COUNT(*) FROM {$table}");
        
        // Run cleanup cron
        do_action('my_plugin_daily_cleanup');
        
        $after_count = $wpdb->get_var("SELECT COUNT(*) FROM {$table}");
        
        $this->assertLessThan($before_count, $after_count);
    }
}
```

## Testing Email Integration

```php
<?php

class Test_Email_Integration extends WP_UnitTestCase {
    
    public function set_up() {
        parent::set_up();
        
        // Reset mail
        reset_phpmailer_instance();
    }
    
    public function test_notification_email_sent() {
        $user_id = $this->factory->user->create(array(
            'user_email' => 'test@example.com',
        ));
        
        // Trigger action that sends email
        my_plugin_send_notification($user_id, 'Welcome!');
        
        $mailer = tests_retrieve_phpmailer_instance();
        
        $this->assertTrue($mailer->get_sent()->recipients[0][0] === 'test@example.com');
        $this->assertStringContainsString('Welcome!', $mailer->get_sent()->body);
    }
    
    public function test_email_content() {
        my_plugin_send_notification(1, 'Test Subject');
        
        $mailer = tests_retrieve_phpmailer_instance();
        $sent = $mailer->get_sent();
        
        $this->assertEquals('Test Subject', $sent->subject);
        $this->assertStringContainsString('text/html', $sent->content_type);
    }
}
```

## Full Workflow Integration Test

```php
<?php

class Test_Complete_Workflow extends WP_UnitTestCase {
    
    public function test_order_creation_workflow() {
        // 1. Create user
        $user_id = $this->factory->user->create(array(
            'role' => 'customer',
            'user_email' => 'customer@example.com',
        ));
        wp_set_current_user($user_id);
        
        // 2. Create product
        $product_id = my_plugin_create_product(array(
            'name' => 'Test Product',
            'price' => 99.99,
            'stock' => 10,
        ));
        
        // 3. Add to cart
        $cart_id = my_plugin_add_to_cart($product_id, 2);
        $this->assertNotFalse($cart_id);
        
        // 4. Create order
        $order_id = my_plugin_create_order($cart_id, array(
            'payment_method' => 'test',
            'shipping_address' => '123 Test St',
        ));
        
        $this->assertNotFalse($order_id);
        
        // 5. Verify order details
        $order = my_plugin_get_order($order_id);
        $this->assertEquals('pending', $order->status);
        $this->assertEquals(199.98, $order->total);
        
        // 6. Verify stock reduced
        $product = my_plugin_get_product($product_id);
        $this->assertEquals(8, $product->stock);
        
        // 7. Verify email sent
        $mailer = tests_retrieve_phpmailer_instance();
        $this->assertStringContainsString(
            'Order Confirmation',
            $mailer->get_sent()->subject
        );
    }
}
```

## Best Practices

1. **Test realistic scenarios** - Mirror actual user workflows
2. **Use transactions** - Roll back database changes
3. **Test with multiple users** - Different roles and permissions
4. **Verify side effects** - Emails, cron, meta data
5. **Clean up properly** - Don't leave test data

## Common Pitfalls

- Not isolating tests properly
- Forgetting to reset global state
- Testing too much in one test
- Not testing error conditions
- Ignoring performance of tests

## Exam Tips

- **Understand integration vs unit testing**: Unit tests test isolated functions/classes with mocks. Integration tests test components working together (database, WordPress functions, plugins). Integration tests are slower but catch real-world issues. Use unit tests for logic, integration tests for WordPress integration. Understanding the difference helps choose appropriate test type for each scenario.

- **Know how to test AJAX handlers**: Set up user context: `wp_set_current_user($user_id)`. Create nonce: `$_REQUEST['_ajax_nonce'] = wp_create_nonce('action')`. Set up request: `$_POST['data'] = 'value'`. Call handler: `try { $this->_handleAjax('action'); } catch (WPAjaxDieStopException $e) {}`. Verify response. Test both logged-in and non-logged-in scenarios. Understanding AJAX testing ensures handlers work correctly and securely.

- **Understand database testing patterns**: WordPress tests use separate test database that's reset between tests. Use `$this->factory` to create test data. Clean up in `tearDown()` if needed. Test database operations: create, read, update, delete. Verify data integrity. Don't test WordPress core database functions - test your code that uses them. Understanding database testing ensures data operations work correctly.

- **Know how to test cron jobs**: Use `wp_schedule_event()` to schedule test events. Use `spawn_cron()` or `wp_cron()` to run cron. Verify events are scheduled: `$this->assertNotFalse(wp_next_scheduled('event'))`. Test event execution and cleanup. Mock time-dependent functions if needed. Understanding cron testing ensures scheduled tasks work correctly and clean up properly.

- **Understand user permission testing**: Test with different user roles: create users with `$this->factory->user->create(array('role' => 'editor'))`. Set current user: `wp_set_current_user($user_id)`. Test capability checks: `$this->assertTrue(current_user_can('capability'))`. Test both authorized and unauthorized scenarios. Understanding permission testing ensures security checks work correctly for all user types.
