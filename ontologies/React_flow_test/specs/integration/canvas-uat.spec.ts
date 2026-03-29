import { test, expect } from '@playwright/test';

test('Canvas UAT: add nodes via UI, reload page, verify persistence', async ({ page }) => {
  await page.goto('http://localhost:5173');

  let consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  await page.waitForLoadState('networkidle');

  // Add nodes using UI controls
  await page.locator('button').filter({ hasText: 'Add Node' }).click();
  await page.locator('button').filter({ hasText: 'Add Node' }).click();

  // Verify nodes were added
  let nodeCount = await page.locator('[data-id]').count();
  expect(nodeCount).toBe(2);

  // Clear errors before reload
  consoleErrors = [];

  // Reload page to test persistence
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Ensure no console errors during reload
  expect(consoleErrors).toHaveLength(0);

  // Verify canvas state was restored
  nodeCount = await page.locator('[data-id]').count();
  expect(nodeCount).toBe(2);
});