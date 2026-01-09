# Unit Testing

## Overview

Unit testing verifies that individual components of your WordPress code work correctly in isolation. WordPress uses PHPUnit as its testing framework, with a specialized test suite for WordPress-specific functionality.

## Setting Up PHPUnit

### Installation

```bash
# Install PHPUnit globally
composer global require phpunit/phpunit

# Or per-project
composer require --dev phpunit/phpunit

# Install WordPress test suite
bash bin/install-wp-tests.sh wordpress_test root '' localhost latest
```

### Project Structure

```
my-plugin/
├── my-plugin.php
├── includes/
│   └── class-my-plugin.php
├── tests/
│   ├── bootstrap.php
│   ├── test-my-plugin.php
│   └── phpunit.xml
└── composer.json
```

### phpunit.xml Configuration

```xml
<?xml version="1.0"?>
<phpunit
    bootstrap="tests/bootstrap.php"
    colors="true"
    convertErrorsToExceptions="true"
    convertNoticesToExceptions="true"
    convertWarningsToExceptions="true"
>
    <testsuites>
        <testsuite name="My Plugin Tests">
            <directory suffix=".php">./tests/</directory>
        </testsuite>
    </testsuites>
    
    <coverage>
        <include>
            <directory suffix=".php">./includes/</directory>
        </include>
        <report>
            <html outputDirectory="coverage"/>
        </report>
    </coverage>
</phpunit>
```

### Bootstrap File

```php
<?php
// tests/bootstrap.php

// Load Composer autoloader
require_once dirname(__DIR__) . '/vendor/autoload.php';

// Path to WordPress test suite
$_tests_dir = getenv('WP_TESTS_DIR') ?: '/tmp/wordpress-tests-lib';

// Load WordPress test functions
require_once $_tests_dir . '/includes/functions.php';

// Load plugin before WordPress initializes
function _manually_load_plugin() {
    require dirname(__DIR__) . '/my-plugin.php';
}
tests_add_filter('muplugins_loaded', '_manually_load_plugin');

// Start WordPress test environment
require $_tests_dir . '/includes/bootstrap.php';
```

## Writing Unit Tests

### Basic Test Class

```php
<?php
// tests/test-class-calculator.php

class Test_Calculator extends WP_UnitTestCase {
    
    private $calculator;
    
    public function set_up() {
        parent::set_up();
        $this->calculator = new Calculator();
    }
    
    public function tear_down() {
        unset($this->calculator);
        parent::tear_down();
    }
    
    public function test_addition() {
        $result = $this->calculator->add(2, 3);
        $this->assertEquals(5, $result);
    }
    
    public function test_subtraction() {
        $result = $this->calculator->subtract(10, 4);
        $this->assertEquals(6, $result);
    }
    
    public function test_division_by_zero_throws_exception() {
        $this->expectException(InvalidArgumentException::class);
        $this->calculator->divide(10, 0);
    }
}
```

### Testing WordPress Functions

```php
<?php

class Test_Post_Functions extends WP_UnitTestCase {
    
    public function test_create_post() {
        $post_id = wp_insert_post(array(
            'post_title' => 'Test Post',
            'post_content' => 'Test content',
            'post_status' => 'publish',
        ));
        
        $this->assertNotWPError($post_id);
        $this->assertIsInt($post_id);
        
        $post = get_post($post_id);
        $this->assertEquals('Test Post', $post->post_title);
    }
    
    public function test_post_meta() {
        $post_id = $this->factory->post->create();
        
        update_post_meta($post_id, 'test_key', 'test_value');
        
        $value = get_post_meta($post_id, 'test_key', true);
        $this->assertEquals('test_value', $value);
    }
    
    public function test_factory_creates_posts() {
        // Create multiple posts using factory
        $posts = $this->factory->post->create_many(5);
        
        $this->assertCount(5, $posts);
        
        foreach ($posts as $post_id) {
            $this->assertIsInt($post_id);
        }
    }
}
```

### Testing Hooks

```php
<?php

class Test_Hooks extends WP_UnitTestCase {
    
    public function test_action_is_added() {
        // Check that our hook is registered
        $this->assertNotFalse(
            has_action('init', 'my_plugin_init')
        );
    }
    
    public function test_filter_modifies_content() {
        // Add our filter
        add_filter('the_content', 'my_content_filter');
        
        $content = apply_filters('the_content', 'Original content');
        
        $this->assertStringContainsString('modified', $content);
    }
    
    public function test_action_callback_executes() {
        $executed = false;
        
        add_action('my_custom_action', function() use (&$executed) {
            $executed = true;
        });
        
        do_action('my_custom_action');
        
        $this->assertTrue($executed);
    }
}
```

### Testing Custom Classes

```php
<?php

class Test_My_Plugin_Class extends WP_UnitTestCase {
    
    private $instance;
    
    public function set_up() {
        parent::set_up();
        $this->instance = new My_Plugin();
    }
    
    public function test_instance_created() {
        $this->assertInstanceOf(My_Plugin::class, $this->instance);
    }
    
    public function test_get_settings_returns_defaults() {
        $settings = $this->instance->get_settings();
        
        $this->assertIsArray($settings);
        $this->assertArrayHasKey('enabled', $settings);
        $this->assertTrue($settings['enabled']);
    }
    
    public function test_save_settings() {
        $new_settings = array(
            'enabled' => false,
            'option' => 'value',
        );
        
        $this->instance->save_settings($new_settings);
        
        $saved = get_option('my_plugin_settings');
        $this->assertEquals($new_settings, $saved);
    }
}
```

## Factory Methods

### Using WP_UnitTest_Factory

```php
<?php

class Test_With_Factories extends WP_UnitTestCase {
    
    public function test_user_factory() {
        // Create user
        $user_id = $this->factory->user->create(array(
            'role' => 'editor',
            'user_login' => 'testeditor',
        ));
        
        $user = get_user_by('id', $user_id);
        $this->assertTrue(in_array('editor', $user->roles));
    }
    
    public function test_post_factory() {
        // Create post with custom data
        $post_id = $this->factory->post->create(array(
            'post_title' => 'Factory Post',
            'post_status' => 'draft',
        ));
        
        $post = get_post($post_id);
        $this->assertEquals('draft', $post->post_status);
    }
    
    public function test_term_factory() {
        // Create category
        $term_id = $this->factory->term->create(array(
            'taxonomy' => 'category',
            'name' => 'Test Category',
        ));
        
        $term = get_term($term_id);
        $this->assertEquals('Test Category', $term->name);
    }
    
    public function test_comment_factory() {
        $post_id = $this->factory->post->create();
        
        $comment_id = $this->factory->comment->create(array(
            'comment_post_ID' => $post_id,
            'comment_content' => 'Test comment',
        ));
        
        $comment = get_comment($comment_id);
        $this->assertEquals('Test comment', $comment->comment_content);
    }
}
```

## Mocking and Stubs

### Using PHPUnit Mocks

```php
<?php

class Test_With_Mocks extends WP_UnitTestCase {
    
    public function test_with_mock_dependency() {
        // Create mock
        $api_client = $this->createMock(API_Client::class);
        
        // Configure mock behavior
        $api_client->method('fetch_data')
            ->willReturn(array('status' => 'success'));
        
        // Inject mock
        $handler = new Data_Handler($api_client);
        $result = $handler->process();
        
        $this->assertTrue($result);
    }
    
    public function test_mock_with_expectations() {
        $logger = $this->createMock(Logger::class);
        
        // Expect method to be called exactly once
        $logger->expects($this->once())
            ->method('log')
            ->with($this->equalTo('Test message'));
        
        $service = new Service($logger);
        $service->do_something();
    }
}
```

### Mocking WordPress Functions

```php
<?php

class Test_Mocked_WP_Functions extends WP_UnitTestCase {
    
    public function test_with_mocked_option() {
        // Pre-populate option
        update_option('my_option', 'mocked_value');
        
        $value = get_option('my_option');
        $this->assertEquals('mocked_value', $value);
    }
    
    public function test_with_mocked_transient() {
        set_transient('my_transient', 'cached_data', HOUR_IN_SECONDS);
        
        $data = get_transient('my_transient');
        $this->assertEquals('cached_data', $data);
    }
}
```

## Data Providers

```php
<?php

class Test_With_Data_Providers extends WP_UnitTestCase {
    
    /**
     * @dataProvider add_data_provider
     */
    public function test_addition($a, $b, $expected) {
        $calculator = new Calculator();
        $this->assertEquals($expected, $calculator->add($a, $b));
    }
    
    public function add_data_provider() {
        return array(
            'positive numbers' => array(2, 3, 5),
            'negative numbers' => array(-2, -3, -5),
            'mixed numbers' => array(-2, 5, 3),
            'with zero' => array(0, 5, 5),
        );
    }
    
    /**
     * @dataProvider post_status_provider
     */
    public function test_post_status($status, $should_be_viewable) {
        $post_id = $this->factory->post->create(array(
            'post_status' => $status,
        ));
        
        $is_viewable = is_post_publicly_viewable($post_id);
        $this->assertEquals($should_be_viewable, $is_viewable);
    }
    
    public function post_status_provider() {
        return array(
            array('publish', true),
            array('draft', false),
            array('private', false),
            array('pending', false),
        );
    }
}
```

## Testing REST API

```php
<?php

class Test_REST_API extends WP_UnitTestCase {
    
    private $server;
    
    public function set_up() {
        parent::set_up();
        
        global $wp_rest_server;
        $this->server = $wp_rest_server = new WP_REST_Server();
        do_action('rest_api_init');
    }
    
    public function test_route_registered() {
        $routes = $this->server->get_routes();
        $this->assertArrayHasKey('/my-plugin/v1/items', $routes);
    }
    
    public function test_get_items() {
        // Create test data
        $this->factory->post->create_many(3, array(
            'post_type' => 'item',
        ));
        
        $request = new WP_REST_Request('GET', '/my-plugin/v1/items');
        $response = $this->server->dispatch($request);
        
        $this->assertEquals(200, $response->get_status());
        $this->assertCount(3, $response->get_data());
    }
    
    public function test_create_item_requires_auth() {
        $request = new WP_REST_Request('POST', '/my-plugin/v1/items');
        $request->set_body_params(array('title' => 'Test'));
        
        $response = $this->server->dispatch($request);
        
        $this->assertEquals(401, $response->get_status());
    }
    
    public function test_create_item_with_auth() {
        $user_id = $this->factory->user->create(array('role' => 'editor'));
        wp_set_current_user($user_id);
        
        $request = new WP_REST_Request('POST', '/my-plugin/v1/items');
        $request->set_body_params(array('title' => 'Test Item'));
        
        $response = $this->server->dispatch($request);
        
        $this->assertEquals(201, $response->get_status());
    }
}
```

## Running Tests

```bash
# Run all tests
phpunit

# Run specific test file
phpunit tests/test-my-plugin.php

# Run specific test method
phpunit --filter test_create_post

# Run with coverage
phpunit --coverage-html coverage

# Run in verbose mode
phpunit --verbose
```

## Best Practices

1. **Test one thing per test** - Single responsibility
2. **Use descriptive names** - test_user_cannot_edit_others_posts
3. **Arrange, Act, Assert** - Clear test structure
4. **Use factories** - Don't create test data manually
5. **Clean up** - Use set_up and tear_down
6. **Test edge cases** - Empty values, boundaries

## Common Pitfalls

- Testing WordPress core instead of your code
- Not isolating tests (test interference)
- Over-mocking (testing mocks instead of code)
- Slow tests (too much database interaction)
- Missing tear_down cleanup

## Exam Tips

- **Know WP_UnitTestCase class and methods**: `WP_UnitTestCase` extends PHPUnit and provides WordPress-specific testing utilities. Key methods: `setUp()` (runs before each test), `tearDown()` (runs after each test), `factory` (creates test data), `assertWPError()` (checks for WP_Error), `go_to()` (sets up query context). Understanding the class enables proper WordPress unit test setup and teardown.

- **Understand factory methods**: `$this->factory->post->create()` creates test posts, `$this->factory->user->create()` creates test users, `$this->factory->term->create()` creates test terms. Factories create isolated test data that's cleaned up automatically. Use factories instead of direct database inserts for consistency and cleanup. Understanding factories helps create reliable, isolated tests.

- **Know how to test hooks and filters**: Test that hooks are registered: `$this->assertNotFalse(has_action('hook_name', 'callback'))`. Test filter output: `$result = apply_filters('filter_name', $input); $this->assertEquals($expected, $result)`. Test hook execution: use `did_action()` to verify hooks fired. Mock callbacks to verify they're called. Understanding hook testing ensures your plugin/theme integrates correctly with WordPress.

- **Understand REST API testing**: Use `WP_REST_Server` to make API requests in tests. Set up user context: `wp_set_current_user($user_id)`. Test endpoints: `$request = new WP_REST_Request('GET', '/wp/v2/posts')`. Verify responses: `$this->assertEquals(200, $response->get_status())`. Test authentication and permissions. Understanding REST API testing ensures your API endpoints work correctly and securely.

- **Know assertion methods**: PHPUnit provides `assertEquals()`, `assertTrue()`, `assertFalse()`, `assertEmpty()`, `assertNotEmpty()`, `assertContains()`, `assertInstanceOf()`, etc. WordPress adds `assertWPError()`, `assertNotWPError()`. Use appropriate assertions for clear test failures. Good assertions make tests self-documenting and easier to debug. Understanding assertions enables writing effective tests.
