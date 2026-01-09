# Test Coverage

## Overview

Test coverage measures how much of your code is executed during testing. While not a guarantee of quality, it helps identify untested code paths and ensures comprehensive testing.

## Types of Coverage

| Type | Description | Measures |
|------|-------------|----------|
| Line Coverage | Lines executed | Basic execution |
| Branch Coverage | Decision paths | if/else branches |
| Function Coverage | Functions called | Function invocations |
| Statement Coverage | Statements executed | Individual statements |

## Setting Up Coverage in PHPUnit

### phpunit.xml Configuration

```xml
<?xml version="1.0"?>
<phpunit
    bootstrap="tests/bootstrap.php"
    colors="true"
>
    <testsuites>
        <testsuite name="My Plugin Tests">
            <directory>./tests/</directory>
        </testsuite>
    </testsuites>
    
    <coverage>
        <include>
            <directory suffix=".php">./includes/</directory>
            <directory suffix=".php">./src/</directory>
        </include>
        <exclude>
            <directory>./vendor/</directory>
            <directory>./tests/</directory>
            <file>./includes/deprecated.php</file>
        </exclude>
        <report>
            <clover outputFile="coverage/clover.xml"/>
            <html outputDirectory="coverage/html"/>
            <text outputFile="coverage/coverage.txt"/>
        </report>
    </coverage>
</phpunit>
```

### Running Coverage

```bash
# Generate HTML coverage report
phpunit --coverage-html coverage/

# Generate text summary
phpunit --coverage-text

# Generate Clover XML (for CI)
phpunit --coverage-clover coverage/clover.xml

# Set minimum coverage threshold
phpunit --coverage-text --coverage-filter=./includes/
```

## Analyzing Coverage Reports

### HTML Report Structure

```
coverage/
├── index.html          # Dashboard
├── dashboard.html      # Summary metrics
├── includes/
│   ├── class-plugin.php.html
│   └── class-handler.php.html
└── css/                # Report styling
```

### Reading Coverage Data

```php
<?php
// Example class with coverage indicators

class My_Plugin {
    
    // ✅ Covered - executed in tests
    public function get_settings() {
        $settings = get_option('my_plugin_settings', array());
        return wp_parse_args($settings, $this->get_defaults());
    }
    
    // ⚠️ Partial - some branches not tested
    public function process_data($data) {
        if (empty($data)) {           // ✅ Covered
            return false;
        }
        
        if ($data['type'] === 'premium') {  // ❌ Not covered
            return $this->process_premium($data);
        }
        
        return $this->process_standard($data);  // ✅ Covered
    }
    
    // ❌ Not covered - no tests call this
    public function legacy_function() {
        // Deprecated functionality
    }
}
```

## Writing Tests for Coverage

### Covering All Branches

```php
<?php

class Test_My_Plugin extends WP_UnitTestCase {
    
    private $plugin;
    
    public function set_up() {
        parent::set_up();
        $this->plugin = new My_Plugin();
    }
    
    // Test the happy path
    public function test_process_data_with_standard_type() {
        $result = $this->plugin->process_data(array(
            'type' => 'standard',
            'content' => 'test',
        ));
        
        $this->assertTrue($result);
    }
    
    // Test the premium branch (previously uncovered)
    public function test_process_data_with_premium_type() {
        $result = $this->plugin->process_data(array(
            'type' => 'premium',
            'content' => 'test',
        ));
        
        $this->assertTrue($result);
    }
    
    // Test empty data branch
    public function test_process_data_with_empty_data() {
        $result = $this->plugin->process_data(array());
        
        $this->assertFalse($result);
    }
    
    // Test null data
    public function test_process_data_with_null() {
        $result = $this->plugin->process_data(null);
        
        $this->assertFalse($result);
    }
}
```

### Edge Case Coverage

```php
<?php

class Test_Edge_Cases extends WP_UnitTestCase {
    
    /**
     * @dataProvider boundary_data_provider
     */
    public function test_boundary_conditions($input, $expected) {
        $calculator = new Calculator();
        $result = $calculator->percentage($input);
        
        $this->assertEquals($expected, $result);
    }
    
    public function boundary_data_provider() {
        return array(
            'zero' => array(0, 0),
            'minimum' => array(1, 1),
            'maximum' => array(100, 100),
            'over maximum' => array(101, 100),
            'negative' => array(-1, 0),
        );
    }
    
    public function test_exception_handling() {
        $this->expectException(InvalidArgumentException::class);
        
        $handler = new Data_Handler();
        $handler->process('invalid');
    }
}
```

## Coverage Metrics

### Setting Coverage Thresholds

```xml
<!-- phpunit.xml -->
<coverage>
    <report>
        <html outputDirectory="coverage/html" lowUpperBound="50" highLowerBound="80"/>
    </report>
</coverage>
```

### Enforcing Minimum Coverage

```bash
# Fail if coverage below threshold
phpunit --coverage-text --coverage-filter=./src/ | grep -q "Lines.*100.00%" || exit 1

# Using coverage-check tool
composer require --dev richardregeer/phpunit-coverage-check
coverage-check coverage/clover.xml 80
```

### CI Configuration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.0'
          coverage: xdebug
      
      - name: Install dependencies
        run: composer install
      
      - name: Run tests with coverage
        run: vendor/bin/phpunit --coverage-clover coverage/clover.xml
      
      - name: Check coverage threshold
        run: |
          coverage=$(grep -oP 'line-rate="\K[^"]+' coverage/clover.xml)
          if (( $(echo "$coverage < 0.80" | bc -l) )); then
            echo "Coverage below 80%: $coverage"
            exit 1
          fi
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v2
        with:
          file: coverage/clover.xml
```

## JavaScript Coverage

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!src/vendor/**',
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
};
```

### Running JavaScript Coverage

```bash
# Run tests with coverage
npm test -- --coverage

# Watch mode with coverage
npm test -- --coverage --watchAll
```

## Playwright Coverage

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
    use: {
        // Enable code coverage
        contextOptions: {
            hasTouch: true,
        },
    },
});

// In test file
test('track coverage', async ({ page }) => {
    await page.coverage.startJSCoverage();
    await page.coverage.startCSSCoverage();
    
    await page.goto('/');
    
    const jsCoverage = await page.coverage.stopJSCoverage();
    const cssCoverage = await page.coverage.stopCSSCoverage();
    
    // Process coverage data
});
```

## Improving Coverage

### Identify Gaps

```php
<?php
// Find uncovered code paths

// 1. Run coverage report
// 2. Look for red (uncovered) lines
// 3. Analyze why they're not covered

class Analyzer {
    public function analyze($data) {
        // ✅ Main path - usually covered
        if ($this->is_valid($data)) {
            return $this->process($data);
        }
        
        // ❌ Error handling - often missed
        if ($this->is_recoverable($data)) {
            return $this->recover($data);
        }
        
        // ❌ Edge cases - frequently uncovered
        throw new Exception('Unrecoverable data');
    }
}
```

### Coverage Anti-Patterns

```php
<?php

// ❌ BAD: Gaming coverage metrics
public function test_just_for_coverage() {
    $obj = new MyClass();
    $obj->method1();
    $obj->method2();
    // No assertions - just calling methods
}

// ✅ GOOD: Meaningful tests with assertions
public function test_method1_returns_expected_result() {
    $obj = new MyClass();
    $result = $obj->method1();
    $this->assertEquals('expected', $result);
}
```

## Coverage Best Practices

### What to Cover

```php
<?php
// High priority for coverage:

// 1. Business logic
class Order_Calculator {
    public function calculate_total($items, $discounts) {
        // Critical business logic - must be fully covered
    }
}

// 2. Security-related code
class Input_Sanitizer {
    public function sanitize($input) {
        // Security code - cover all branches
    }
}

// 3. Public APIs
class REST_Controller {
    public function get_items($request) {
        // API endpoints - cover success and error cases
    }
}
```

### What to Exclude

```php
<?php
// Lower priority / exclude from coverage:

// 1. WordPress hooks (covered by integration tests)
add_action('init', 'my_init');

// 2. Simple getters/setters
public function get_id() {
    return $this->id;
}

// 3. Deprecated code
/**
 * @deprecated
 * @codeCoverageIgnore
 */
public function old_method() {
    // Legacy code
}
```

### Using @codeCoverageIgnore

```php
<?php

class My_Plugin {
    
    /**
     * @codeCoverageIgnore
     */
    public function debug_only_method() {
        // Only used in development
    }
    
    public function important_method() {
        // @codeCoverageIgnoreStart
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('Debug info');
        }
        // @codeCoverageIgnoreEnd
        
        return $this->do_work();
    }
}
```

## Best Practices Summary

1. **Aim for 80%+ coverage** - But don't obsess over 100%
2. **Cover critical paths first** - Business logic, security, APIs
3. **Test branches, not just lines** - All if/else paths
4. **Don't game metrics** - Meaningful tests, not empty calls
5. **Track coverage trends** - Monitor in CI
6. **Exclude appropriately** - Deprecated code, debug code

## Common Pitfalls

- Chasing 100% coverage at expense of quality
- Not testing error conditions
- Ignoring branch coverage
- Writing tests without assertions
- Not excluding vendor/generated code

## Exam Tips

- **Understand different coverage types**: Line coverage (which lines executed), branch coverage (which code paths taken), function coverage (which functions called), statement coverage (which statements executed). Branch coverage is most valuable (tests all code paths). Aim for high branch coverage, not just line coverage. Understanding coverage types helps measure test effectiveness accurately.

- **Know how to configure PHPUnit coverage**: Use `--coverage-html` for HTML report, `--coverage-clover` for XML (CI/CD). Configure in `phpunit.xml`: `<coverage><include><directory>src</directory></include></coverage>`. Exclude vendor, tests, generated code. Use Xdebug or PCOV for coverage collection. Understanding configuration enables proper coverage measurement and reporting.

- **Understand coverage thresholds**: Set minimum coverage requirements (e.g., 80% line, 70% branch). Enforce in CI/CD to prevent regressions. Balance between coverage goals and practical constraints. 100% coverage isn't always practical or valuable. Focus on critical code paths. Understanding thresholds helps maintain code quality without over-testing trivial code.

- **Know when to use @codeCoverageIgnore**: Use for code that's impractical to test (error handlers, fallbacks, deprecated code). Use sparingly - prefer testing over ignoring. Document why code is ignored. Review ignored code periodically. Too many ignores indicate testability issues. Understanding when to ignore helps maintain coverage while being practical about edge cases.

- **Understand coverage in CI/CD**: Integrate coverage reports into CI/CD pipeline. Fail builds if coverage drops below threshold. Use coverage services (Codecov, Coveralls) for tracking over time. Generate coverage reports as part of test runs. Track coverage trends, not just absolute numbers. Understanding CI/CD integration ensures coverage is maintained as code evolves.
