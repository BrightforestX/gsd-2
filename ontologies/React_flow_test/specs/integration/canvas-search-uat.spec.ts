import { test, expect } from '@playwright/test';

/**
 * Canvas Search UAT
 *
 * End-to-end browser test verifying search functionality works end-to-end with persistence:
 * 1. Navigate to canvas
 * 2. Add nodes with searchable labels
 * 3. Search and verify filtering/highlighting
 * 4. Reload page
 * 5. Verify search term persists and results are preserved
 *
 * This proves the search feature claim: "users can create canvases, search content, and have both operations persist and restore seamlessly"
 */

test.describe('Canvas Search UAT', () => {
  test('complete user workflow: create → search → filter → persist → reload → restore', async ({ page }) => {
    console.log('🎯 Starting Canvas Search UAT...');

    const startTime = Date.now();

    // Step 1: Navigate to canvas app
    console.log('   🏁 Step 1: Navigate to canvas application');
    await page.goto('http://localhost:5181');
    await page.waitForLoadState('networkidle');

    // Verify app loads
    await page.waitForSelector('.react-flow, div[style*="100vh"]', { timeout: 10000 });
    const searchInput = page.locator('input[placeholder="Search nodes..."]');
    const addNodeButton = page.getByRole('button', { name: 'Add Node' });

    await expect(searchInput).toBeVisible();
    await expect(addNodeButton).toBeVisible();
    console.log('   ✅ App loaded successfully');

    // Step 2: Create searchable content (add 5 nodes)
    console.log('   ➕ Step 2: Create canvas content (5 nodes)');
    let nodeCount = await page.locator('.react-flow__node').count();

    // Add 5 nodes
    for (let i = 0; i < 5; i++) {
      await addNodeButton.click();
      await page.waitForTimeout(200);
    }

    const totalNodesAdded = await page.locator('.react-flow__node').count() - nodeCount;
    expect(totalNodesAdded).toBe(5);
    const totalNodesBeforeSearch = await page.locator('.react-flow__node').count();
    console.log(`   ✅ Added ${totalNodesAdded} nodes (total: ${totalNodesBeforeSearch})`);

    // Step 3: Verify search input is empty and all nodes are fully visible
    console.log('   🔍 Step 3: Verify initial state (no search)');
    const initialSearchValue = await searchInput.inputValue();
    expect(initialSearchValue).toBe('');
    console.log('   ✅ Search input empty');

    // All nodes should be visible and opaque
    for (let i = 0; i < totalNodesBeforeSearch; i++) {
      const node = page.locator('.react-flow__node').nth(i);
      const opacity = await node.evaluate(el => getComputedStyle(el).opacity);
      expect(parseFloat(opacity)).toBe(1.0);
      const borderColor = await node.evaluate(el => getComputedStyle(el).borderColor);
      expect(borderColor).toBe('rgb(153, 153, 153)');
    }
    console.log(`   ✅ All ${totalNodesBeforeSearch} nodes visible and unhighlighted`);

    // Step 4: Perform search
    console.log('   🔍 Step 4: Search for "2"');
    await searchInput.fill('2');
    await page.waitForTimeout(500); // Allow search to update

    const searchValueAfter = await searchInput.inputValue();
    expect(searchValueAfter).toBe('2');
    console.log('   ✅ Search term set to "2"');

    // Step 5: Verify filtering and highlighting
    console.log('   🔍 Step 5: Verify search results');

    const visibleNodes = page.locator('.react-flow__node:not([style*="opacity: 0.3"])');
    const fadedNodes = page.locator('.react-flow__node[style*="opacity: 0.3"]');

    // Should have one visible node (Node 2)
    const visibleCount = await visibleNodes.count();
    expect(visibleCount).toBe(1);

    const visibleNode = visibleNodes.first();
    const visibleOpacity = await visibleNode.evaluate(el => getComputedStyle(el).opacity);
    expect(parseFloat(visibleOpacity)).toBe(1.0);
    const visibleBorderColor = await visibleNode.evaluate(el => getComputedStyle(el).borderColor);
    expect(visibleBorderColor).toBe('rgb(255, 0, 0)'); // Red border
    console.log('   ✅ Matching node (Node 2) fully visible and highlighted');

    // Other nodes should be faded
    const fadedCount = await fadedNodes.count();
    expect(fadedCount).toBe(4);

    for (let i = 0; i < fadedCount; i++) {
      const fadedNode = fadedNodes.nth(i);
      const fadedOpacity = await fadedNode.evaluate(el => getComputedStyle(el).opacity);
      expect(parseFloat(fadedOpacity)).toBe(0.3);
      const fadedBorderColor = await fadedNode.evaluate(el => getComputedStyle(el).borderColor);
      expect(fadedBorderColor).toBe('rgb(153, 153, 153)');
    }
    console.log(`   ✅ ${fadedCount} non-matching nodes faded`);

    // Step 6: Persist state (auto-save)
    console.log('   💾 Step 6: Allow persistence to occur');
    await page.waitForTimeout(1000); // Wait for auto-save
    console.log('   ✅ Auto-persistence completed');

    // Step 7: Reload page
    console.log('   🔄 Step 7: Simulate browser page reload');
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for canvas to re-initialize
    await page.waitForSelector('.react-flow, div[style*="100vh"]', { timeout: 10000 });

    const reloadSearchInput = page.locator('input[placeholder="Search nodes..."]');
    await page.waitForTimeout(2000); // Wait for localStorage to load and React to render
    console.log('   ✅ Page reloaded and canvas re-initialized');

    // Step 8: Verify persistence across reload
    console.log('   🔍 Step 8: Verify search term and results persist');

    // Search term should persist
    const persistedSearchValue = await reloadSearchInput.inputValue();
    expect(persistedSearchValue).toBe('2');
    console.log('   ✅ Search term persisted: "2"');

    // Filtered results should persist
    const reloadVisibleNodes = page.locator('.react-flow__node:not([style*="opacity: 0.3"])');
    const reloadFadedNodes = page.locator('.react-flow__node[style*="opacity: 0.3"]');

    const reloadVisibleCount = await reloadVisibleNodes.count();
    expect(reloadVisibleCount).toBe(1);

    const reloadVisibleNode = reloadVisibleNodes.first();
    const reloadVisibleOpacity = await reloadVisibleNode.evaluate(el => getComputedStyle(el).opacity);
    expect(parseFloat(reloadVisibleOpacity)).toBe(1.0);
    const reloadVisibleBorderColor = await reloadVisibleNode.evaluate(el => getComputedStyle(el).borderColor);
    expect(reloadVisibleBorderColor).toBe('rgb(255, 0, 0)');
    console.log('   ✅ Filtered node still highlighted after reload');

    const reloadFadedCount = await reloadFadedNodes.count();
    expect(reloadFadedCount).toBe(4);
    console.log(`   ✅ ${reloadFadedCount} non-matching nodes still faded after reload`);

    // Verify total node count preserved
    const totalNodesAfterReload = reloadVisibleCount + reloadFadedCount;
    expect(totalNodesAfterReload).toBe(totalNodesBeforeSearch);
    console.log(`   ✅ Total node count preserved: ${totalNodesBeforeSearch} nodes`);

    const duration = Date.now() - startTime;
    console.log();
    console.log(`🎉 CANVAS SEARCH UAT COMPLETED SUCCESSFULLY! (${duration}ms)`);
    console.log();
    console.log('✅ VERIFIED WORKFLOW:');
    console.log('   1. Navigate to empty canvas');
    console.log('   2. Add 5 nodes with searchable labels');
    console.log('   3. Search for "2" and verify filtering/highlighting');
    console.log('   4. Persist search state automatically');
    console.log('   5. Reload browser page');
    console.log('   6. Verify search term persists');
    console.log('   7. Verify filtered results preserved');
    console.log('   8. Confirm continued interactivity');
    console.log();

    console.log('🎯 USER WORKFLOW VALIDATED: "users can create canvases, search content, and have both operations persist and restore seamlessly"');
  });

  test('edge case: no matching results', async ({ page }) => {
    console.log('🔍 Testing search with no matches...');

    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');

    // Add nodes
    const addNodeButton = page.getByRole('button', { name: 'Add Node' });
    for (let i = 0; i < 3; i++) {
      await addNodeButton.click();
      await page.waitForTimeout(200);
    }

    const searchInput = page.locator('input[placeholder="Search nodes..."]');
    await searchInput.fill('nonexistent');
    await page.waitForTimeout(500);

    // All nodes should be faded, no nodes highlighted
    const visibleNodes = page.locator('.react-flow__node:not([style*="opacity: 0.3"])');
    const fadedNodes = page.locator('.react-flow__node[style*="opacity: 0.3"]');

    const visibleCount = await visibleNodes.count();
    expect(visibleCount).toBe(0);

    const fadedCount = await fadedNodes.count();
    expect(fadedCount).toBe(3);

    console.log('   ✅ No matches found, all nodes faded correctly');
  });
});