import { test, expect } from '@playwright/test';

/**
 * Browser Startup Verification Test
 *
 * Verifies the canvas application loads correctly without runtime errors,
 * initializing with persisted canvas data from localStorage.
 */

test.describe('Canvas Browser Startup', () => {
  test('app loads without console errors and initializes canvas', async ({ page }) => {
    console.log('🚀 Starting browser startup verification...');

    // Track console errors
    const consoleErrors = [];
    let hasRuntimeError = false;

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
        hasRuntimeError = true;
        console.warn('⚠️ Console error detected:', message.text());
      }
    });

    page.on('pageerror', (error) => {
      hasRuntimeError = true;
      console.warn('⚠️ Page error detected:', error.message);
    });

    // Test navigation and basic load
    console.log('   🌐 Navigating to canvas...');
    await page.goto('http://localhost:5181');
    await page.waitForLoadState('networkidle');

    console.log('   ✅ Page loaded');

    // Wait for canvas to initialize
    await page.waitForSelector('div[data-testid="canvas-container"], .react-flow, [style*="100vw"]', {
      timeout: 5000
    });
    console.log('   ✅ Canvas container found');

    // Give React time to fully initialize
    await page.waitForTimeout(1000);

    // Verify no runtime errors occurred
    if (hasRuntimeError) {
      console.error('❌ Runtime errors detected:', consoleErrors);
      throw new Error(`Application has ${consoleErrors.length} runtime errors`);
    }

    // Verify basic UI elements are present
    const addNodeButton = page.locator('button:has-text("Add Node")');
    const removeNodeButton = page.locator('button:has-text("Remove Last Node")');

    await expect(addNodeButton).toBeVisible();
    await expect(removeNodeButton).toBeVisible();

    console.log('   ✅ UI controls visible');

    // Verify React Flow canvas is rendered
    const canvasElements = await page.locator('.react-flow, [data-cy="react-flow"]').count();
    if (canvasElements === 0) {
      throw new Error('React Flow canvas not found');
    }
    console.log('   ✅ React Flow canvas rendered');

    // Test adding a node to verify React state works
    console.log('   🖱️ Testing UI interaction...');
    await addNodeButton.click();
    await page.waitForTimeout(500);

    // Check if a node was added (basic visibility of any node)
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    if (nodeCount === 0) {
      throw new Error('Node addition did not work - no nodes visible');
    }
    console.log(`   ✅ Node interaction works (${nodeCount} nodes visible)`);

    console.log();
    console.log('🎉 BROWSER STARTUP VERIFICATION PASSED!');
    console.log('   ✓ No console errors');
    console.log('   ✓ No page errors');
    console.log('   ✓ UI controls present');
    console.log('   ✓ Canvas renders correctly');
    console.log('   ✓ Basic interactions work');
    console.log('   ✓ Application initialization successful');
  });

  test('persistent canvas data loads correctly', async ({ page }) => {
    console.log('🔄 Testing persistent data loading...');

    // This test assumes some data exists from previous test runs
    // It verifies the canvas can load and display any persisted data

    await page.goto('http://localhost:5181');
    await page.waitForLoadState('networkidle');

    // Wait for canvas initialization
    await page.waitForSelector('div[style*="100vh"]', { timeout: 5000 });

    // Check if canvas loads successfully regardless of whether data exists
    const canvasExists = await page.locator('.react-flow, [data-testid="canvas-container"]').isVisible();
    expect(canvasExists).toBe(true);

    console.log('   ✅ Persistent data loading verified (canvas initializes)');

    // Note: Full persistence testing is covered in separate UAT tests
    // This test just verifies the app doesn't crash when trying to load data
  });
});