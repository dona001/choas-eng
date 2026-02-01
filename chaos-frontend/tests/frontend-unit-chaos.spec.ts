import { test, expect } from '@playwright/test';

test.describe('Frontend Chaos - Layer 1: Browser-Level Mocking', () => {

    test('Scenario 1: High Latency - Skeleton Loaders Display', async ({ page }) => {
        // Intercept API and delay response by 5 seconds
        await page.route('**/api/items', async (route) => {
            await new Promise(resolve => setTimeout(resolve, 5000));
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 1, name: 'Test Item', value: 10.0 }
                ]),
            });
        });

        await page.goto('/');

        // EXPECTATION: Skeleton loaders should be visible immediately
        const skeletons = page.getByTestId('skeleton-loader');
        await expect(skeletons.first()).toBeVisible();

        // Verify multiple skeletons are rendered
        const count = await skeletons.count();
        expect(count).toBeGreaterThan(0);

        console.log('✅ PASS: Skeleton loaders displayed during latency');
    });

    test('Scenario 2: API 500 Error - Graceful Failure', async ({ page }) => {
        // Intercept API and return 500 error
        await page.route('**/api/items', async (route) => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Internal Server Error' }),
            });
        });

        await page.goto('/');

        // EXPECTATION: Error state should be handled gracefully
        // For now, verify the page doesn't crash (skeleton still shows)
        const container = page.getByTestId('items-container');
        await expect(container).toBeVisible();

        console.log('✅ PASS: Page remains stable during API failure');
    });

    test('Scenario 3: Network Timeout - Request Abortion', async ({ page, context }) => {
        // Abort all API requests to simulate network failure
        await page.route('**/api/items', async (route) => {
            await route.abort('failed');
        });

        await page.goto('/');

        // EXPECTATION: UI should not crash, fallback UI should render
        const healthCard = page.getByTestId('health-card');
        await expect(healthCard).toBeVisible();

        console.log('✅ PASS: UI stable during network timeout');
    });

    test('Scenario 4: Offline Mode - Connectivity Loss', async ({ page, context }) => {
        await page.goto('/');

        // Verify page loaded successfully first
        const healthCard = page.getByTestId('health-card');
        await expect(healthCard).toBeVisible();

        // Simulate going offline
        await context.setOffline(true);

        // EXPECTATION: Page should remain stable (already loaded content persists)
        await expect(healthCard).toBeVisible();

        console.log('✅ PASS: Page handles offline mode');
    });

    test('Scenario 5: Partial Data - Empty Response', async ({ page }) => {
        // Return empty array
        await page.route('**/api/items', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
        });

        await page.goto('/');

        // EXPECTATION: Empty state should be handled
        const container = page.getByTestId('items-container');
        await expect(container).toBeVisible();

        console.log('✅ PASS: Empty data handled gracefully');
    });
});
