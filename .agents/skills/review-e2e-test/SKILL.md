---
name: review-e2e-test
description: Use this guide when reviewing Playwright E2E tests to ensure quality and maintainability.
---

Review the test changes made in the current session using the following guideline and suggest changes appropriately.

# Test Review Guidelines

Use this guide when reviewing Playwright E2E tests to ensure quality and maintainability.

## Testing Philosophy

• **Test user-visible behavior** - Verify what end users see and interact with, not implementation details
• **Ensure test isolation** - Each test must be completely independent and not rely on other tests
• **Avoid testing third-party dependencies** - Only test code you control, mock external services
• **Focus on critical user journeys** - Prioritize testing the most important user workflows

## Best Practices

• **Use semantic locators** - Prefer `getByRole`, `getByText`, `getByLabel` over CSS selectors or XPath
• **Chain and filter locators** - Build specific locators by combining multiple methods
• **Use web-first assertions** - Always await assertions that automatically wait and retry
• **Write descriptive test names** - Test names should clearly describe the expected behavior
• **Keep tests focused** - Each test should verify one specific behavior or user flow
• **Use consistent test structure** - Follow arrange-act-assert pattern consistently
• **Handle async operations properly** - Always await page interactions and assertions
• **Use appropriate waiting strategies** - Avoid hard waits, use Playwright's built-in waiting

## Examples

<example>
**Good locator usage:**
```javascript
await page.getByRole('button', { name: 'Submit' }).click();
await expect(page.getByText('Success message')).toBeVisible();
```

**Poor locator usage:**
```javascript
await page.locator('.btn-submit').click(); // CSS class dependency
await page.locator('xpath=//button[1]').click(); // Brittle XPath
```
</example>

<example>
**Good test isolation:**
```javascript
test.beforeEach(async ({ page }) => {
  await page.goto('/dashboard');
  await loginAsTestUser(page);
});

test('should display user profile', async ({ page }) => {
  // Test starts with clean, known state
});
```

**Poor test isolation:**
```javascript
test('login user', async ({ page }) => {
  // Changes global state
});

test('check profile', async ({ page }) => {
  // Depends on previous test
});
```
</example>

<example>
**Good assertion usage:**
```javascript
await expect(page.getByText('Loading...')).toBeHidden();
await expect(page.getByRole('list')).toContainText('Item 1');
```

**Poor assertion usage:**
```javascript
const isVisible = await page.getByText('Loading...').isVisible();
expect(isVisible).toBe(false); // No auto-waiting
```
</example>

## Review Checklist

- [ ] Tests use semantic locators (getByRole, getByText, getByLabel)
- [ ] All assertions are awaited and use web-first methods
- [ ] Tests are isolated and don't depend on each other
- [ ] Test names clearly describe expected behavior
- [ ] No hard-coded waits or timeouts without justification
- [ ] External dependencies are mocked appropriately
- [ ] Tests follow consistent structure and patterns
