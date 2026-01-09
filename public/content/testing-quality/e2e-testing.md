# End-to-End Testing

## Overview

End-to-end (E2E) testing verifies that entire user flows work correctly from start to finish, testing the application as a real user would experience it through the browser.

## Testing Tools

### Playwright (Recommended)

```bash
# Install Playwright
npm init playwright@latest

# Install WordPress E2E test utils
npm install @wordpress/e2e-test-utils-playwright --save-dev
```

### Cypress

```bash
# Install Cypress
npm install cypress --save-dev

# Open Cypress
npx cypress open
```

## Playwright Configuration

### playwright.config.ts

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    expect: {
        timeout: 5000
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:8888',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    webServer: {
        command: 'wp-env start',
        url: 'http://localhost:8888',
        reuseExistingServer: !process.env.CI,
    },
});
```

### WordPress Test Utilities

```typescript
// tests/e2e/utils.ts
import { test as base, expect } from '@playwright/test';
import { Admin, Editor, RequestUtils } from '@wordpress/e2e-test-utils-playwright';

export const test = base.extend<{
    admin: Admin;
    editor: Editor;
    requestUtils: RequestUtils;
}>({
    admin: async ({ page }, use) => {
        await use(new Admin({ page }));
    },
    editor: async ({ page }, use) => {
        await use(new Editor({ page }));
    },
    requestUtils: async ({}, use) => {
        const requestUtils = await RequestUtils.setup({
            baseURL: 'http://localhost:8888',
            user: { username: 'admin', password: 'password' },
        });
        await use(requestUtils);
    },
});

export { expect };
```

## Writing E2E Tests

### Basic Page Test

```typescript
// tests/e2e/front-page.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Front Page', () => {
    test('displays site title', async ({ page }) => {
        await page.goto('/');
        
        await expect(page).toHaveTitle(/My WordPress Site/);
    });
    
    test('shows recent posts', async ({ page }) => {
        await page.goto('/');
        
        const posts = page.locator('.post');
        await expect(posts).toHaveCount(10);
    });
    
    test('navigation works', async ({ page }) => {
        await page.goto('/');
        
        await page.click('a:text("About")');
        
        await expect(page).toHaveURL('/about/');
        await expect(page.locator('h1')).toHaveText('About Us');
    });
});
```

### Testing Login Flow

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from './utils';

test.describe('Login', () => {
    test('user can log in', async ({ page }) => {
        await page.goto('/wp-login.php');
        
        await page.fill('#user_login', 'testuser');
        await page.fill('#user_pass', 'password');
        await page.click('#wp-submit');
        
        await expect(page).toHaveURL(/wp-admin/);
        await expect(page.locator('#wpadminbar')).toBeVisible();
    });
    
    test('shows error for invalid credentials', async ({ page }) => {
        await page.goto('/wp-login.php');
        
        await page.fill('#user_login', 'invalid');
        await page.fill('#user_pass', 'wrong');
        await page.click('#wp-submit');
        
        await expect(page.locator('#login_error')).toBeVisible();
    });
    
    test('remember me persists session', async ({ page, context }) => {
        await page.goto('/wp-login.php');
        
        await page.fill('#user_login', 'testuser');
        await page.fill('#user_pass', 'password');
        await page.check('#rememberme');
        await page.click('#wp-submit');
        
        // Check cookies
        const cookies = await context.cookies();
        const authCookie = cookies.find(c => c.name.startsWith('wordpress_logged_in'));
        
        expect(authCookie).toBeDefined();
        expect(authCookie!.expires).toBeGreaterThan(Date.now() / 1000 + 86400);
    });
});
```

### Testing Post Creation

```typescript
// tests/e2e/post-editor.spec.ts
import { test, expect } from './utils';

test.describe('Post Editor', () => {
    test.beforeEach(async ({ admin }) => {
        await admin.visitAdminPage('post-new.php');
    });
    
    test('can create a new post', async ({ page, admin }) => {
        // Add title
        await page.click('role=textbox[name="Add title"]');
        await page.keyboard.type('E2E Test Post');
        
        // Add content
        await page.click('role=button[name="Add default block"]');
        await page.keyboard.type('This is test content from E2E test.');
        
        // Publish
        await page.click('role=button[name="Publish"]');
        await page.click('role=button[name="Publish"]:visible');
        
        // Verify published
        await expect(page.locator('text=Post published')).toBeVisible();
    });
    
    test('can add featured image', async ({ page, admin }) => {
        await page.click('role=textbox[name="Add title"]');
        await page.keyboard.type('Post with Image');
        
        // Open featured image panel
        await page.click('role=button[name="Post"]');
        await page.click('role=button[name="Set featured image"]');
        
        // Select from media library
        await page.click('role=tab[name="Media Library"]');
        await page.click('.attachment:first-child');
        await page.click('role=button[name="Set featured image"]');
        
        // Verify image set
        await expect(page.locator('.editor-post-featured-image__preview')).toBeVisible();
    });
});
```

### Testing Plugin Features

```typescript
// tests/e2e/my-plugin.spec.ts
import { test, expect } from './utils';

test.describe('My Plugin', () => {
    test('settings page loads', async ({ admin, page }) => {
        await admin.visitAdminPage('admin.php', 'page=my-plugin-settings');
        
        await expect(page.locator('h1')).toHaveText('My Plugin Settings');
    });
    
    test('can save settings', async ({ admin, page }) => {
        await admin.visitAdminPage('admin.php', 'page=my-plugin-settings');
        
        await page.fill('#my_plugin_option', 'test value');
        await page.click('#submit');
        
        await expect(page.locator('.notice-success')).toBeVisible();
        
        // Verify saved
        await page.reload();
        await expect(page.locator('#my_plugin_option')).toHaveValue('test value');
    });
    
    test('shortcode renders correctly', async ({ requestUtils, page }) => {
        // Create page with shortcode
        const pageId = await requestUtils.createPage({
            title: 'Shortcode Test',
            content: '[my_plugin_shortcode title="Test"]',
            status: 'publish',
        });
        
        await page.goto(`/?p=${pageId}`);
        
        await expect(page.locator('.my-plugin-output')).toBeVisible();
        await expect(page.locator('.my-plugin-output')).toContainText('Test');
    });
});
```

### Testing Forms

```typescript
// tests/e2e/contact-form.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Contact Form', () => {
    test('submits successfully', async ({ page }) => {
        await page.goto('/contact/');
        
        await page.fill('input[name="name"]', 'John Doe');
        await page.fill('input[name="email"]', 'john@example.com');
        await page.fill('textarea[name="message"]', 'Test message');
        
        await page.click('button[type="submit"]');
        
        await expect(page.locator('.success-message')).toBeVisible();
        await expect(page.locator('.success-message')).toContainText('Thank you');
    });
    
    test('validates required fields', async ({ page }) => {
        await page.goto('/contact/');
        
        await page.click('button[type="submit"]');
        
        await expect(page.locator('.error-message')).toBeVisible();
        await expect(page.locator('input[name="name"]:invalid')).toBeVisible();
    });
    
    test('validates email format', async ({ page }) => {
        await page.goto('/contact/');
        
        await page.fill('input[name="name"]', 'John');
        await page.fill('input[name="email"]', 'invalid-email');
        await page.fill('textarea[name="message"]', 'Test');
        
        await page.click('button[type="submit"]');
        
        await expect(page.locator('.error-message')).toContainText('valid email');
    });
});
```

### Testing AJAX Interactions

```typescript
// tests/e2e/ajax.spec.ts
import { test, expect } from '@playwright/test';

test.describe('AJAX Features', () => {
    test('loads more posts on scroll', async ({ page }) => {
        await page.goto('/blog/');
        
        const initialPosts = await page.locator('.post').count();
        
        // Scroll to bottom
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        
        // Wait for AJAX
        await page.waitForResponse(response => 
            response.url().includes('admin-ajax.php') && 
            response.status() === 200
        );
        
        const newPosts = await page.locator('.post').count();
        expect(newPosts).toBeGreaterThan(initialPosts);
    });
    
    test('live search works', async ({ page }) => {
        await page.goto('/');
        
        await page.fill('.search-input', 'wordpress');
        
        // Wait for search results
        await page.waitForSelector('.search-results');
        
        const results = page.locator('.search-result');
        await expect(results.first()).toBeVisible();
    });
});
```

## Visual Regression Testing

```typescript
// tests/e2e/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
    test('homepage matches snapshot', async ({ page }) => {
        await page.goto('/');
        
        await expect(page).toHaveScreenshot('homepage.png', {
            fullPage: true,
            maxDiffPixels: 100,
        });
    });
    
    test('single post matches snapshot', async ({ page }) => {
        await page.goto('/sample-post/');
        
        await expect(page).toHaveScreenshot('single-post.png');
    });
    
    test('responsive design - mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        
        await expect(page).toHaveScreenshot('homepage-mobile.png');
    });
});
```

## Test Fixtures

```typescript
// tests/e2e/fixtures.ts
import { test as base } from '@playwright/test';

interface TestFixtures {
    authenticatedPage: any;
    testPost: { id: number; url: string };
}

export const test = base.extend<TestFixtures>({
    authenticatedPage: async ({ page, context }, use) => {
        // Login
        await page.goto('/wp-login.php');
        await page.fill('#user_login', 'admin');
        await page.fill('#user_pass', 'password');
        await page.click('#wp-submit');
        await page.waitForURL(/wp-admin/);
        
        await use(page);
    },
    
    testPost: async ({ request }, use) => {
        // Create test post via REST API
        const response = await request.post('/wp-json/wp/v2/posts', {
            data: {
                title: 'E2E Test Post',
                content: 'Test content',
                status: 'publish',
            },
            headers: {
                'X-WP-Nonce': 'test-nonce',
            },
        });
        
        const post = await response.json();
        
        await use({ id: post.id, url: post.link });
        
        // Cleanup
        await request.delete(`/wp-json/wp/v2/posts/${post.id}?force=true`);
    },
});
```

## Running E2E Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test login.spec.ts

# Run with UI
npx playwright test --ui

# Run in headed mode
npx playwright test --headed

# Generate report
npx playwright show-report
```

## Best Practices

1. **Test user journeys** - Complete workflows, not isolated clicks
2. **Use stable selectors** - Prefer role, text, data-testid
3. **Wait for elements** - Don't use arbitrary delays
4. **Clean up test data** - Don't pollute the database
5. **Run in CI** - Catch regressions early
6. **Use page objects** - Organize selectors and actions

## Common Pitfalls

- Flaky tests due to timing issues
- Hardcoded URLs and credentials
- Not cleaning up test data
- Testing implementation details
- Too many E2E tests (use unit tests for logic)

## Exam Tips

- **Understand E2E vs other test types**: E2E tests simulate real user interactions in browser (clicking, typing, navigating). Unit tests test isolated code. Integration tests test components together. E2E tests are slowest but catch real user experience issues. Use E2E for critical user flows, unit/integration for logic. Understanding E2E helps choose when browser testing is needed vs faster test types.

- **Know common testing tools (Playwright, Cypress)**: Playwright supports multiple browsers, fast, good API. Cypress has great developer experience, time-travel debugging, but Chrome-only. Both can test WordPress sites. Choose based on needs: Playwright for cross-browser, Cypress for developer experience. Understanding tools helps select appropriate E2E testing solution for your project.

- **Understand selector strategies**: Use data attributes (`data-testid`) for stable selectors instead of CSS classes (change with styling). Use semantic selectors (roles, labels) for accessibility. Avoid brittle selectors (nth-child, complex CSS). Prefer IDs for unique elements. Good selectors make tests resilient to UI changes. Understanding selectors helps write maintainable E2E tests.

- **Know how to handle async operations**: Wait for elements: `await page.waitForSelector('.element')`. Wait for navigation: `await page.waitForNavigation()`. Wait for network: `await page.waitForResponse()`. Use appropriate wait strategies (visible, hidden, attached). Avoid fixed timeouts when possible. Understanding async handling prevents flaky tests and ensures reliable E2E testing.

- **Understand visual regression testing**: Compares screenshots of pages to detect visual changes. Tools like Percy, Chromatic, or Playwright screenshots. Catches unintended visual changes (CSS bugs, layout shifts). Use for critical pages/components. Can be expensive to maintain. Understanding visual testing helps catch UI regressions that functional tests might miss.
