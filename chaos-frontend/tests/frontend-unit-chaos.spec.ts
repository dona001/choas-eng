import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('Frontend Chaos - Layer 1: Browser-Level Mocking', () => {

    test('Scenario 1: High Latency - Skeleton Loaders Display', async ({ page }) => {
        await allure.epic('Frontend Resilience');
        await allure.feature('Network Chaos');
        await allure.story('High Latency Handling');
        await allure.severity('critical');

        await allure.step('EXPECTATION: Skeleton loaders should display immediately during 5s API delay', async () => {
            console.log('🔵 EXPECTATION: Skeleton loaders should be visible immediately');
        });

        await allure.step('Intercept API and inject 5-second latency', async () => {
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
            console.log('⚡ Chaos Injected: 5000ms latency on /api/items');
        });

        await allure.step('Navigate to dashboard', async () => {
            await page.goto('/');
            console.log('📍 Navigated to: http://localhost:3000/');
        });

        await allure.step('Verify skeleton loaders are visible', async () => {
            const skeletons = page.getByTestId('skeleton-loader');
            await expect(skeletons.first()).toBeVisible();
            const count = await skeletons.count();
            console.log(`✅ ACTUAL: ${count} skeleton loaders displayed`);
            expect(count).toBeGreaterThan(0);
        });

        await allure.step('RESULT: Test Passed', async () => {
            console.log('✅ PASS: Skeleton loaders displayed during latency');
        });
    });

    test('Scenario 2: API 500 Error - Graceful Failure', async ({ page }) => {
        await allure.epic('Frontend Resilience');
        await allure.feature('Dependency Chaos');
        await allure.story('Server Error Handling');
        await allure.severity('critical');

        await allure.step('EXPECTATION: Page should remain stable during API 500 error', async () => {
            console.log('🔵 EXPECTATION: No crash, graceful error handling');
        });

        await allure.step('Intercept API and return 500 error', async () => {
            await page.route('**/api/items', async (route) => {
                await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Internal Server Error' }),
                });
            });
            console.log('⚡ Chaos Injected: HTTP 500 on /api/items');
        });

        await allure.step('Navigate to dashboard', async () => {
            await page.goto('/');
            console.log('📍 Navigated to: http://localhost:3000/');
        });

        await allure.step('Verify page stability', async () => {
            const container = page.getByTestId('items-container');
            await expect(container).toBeVisible();
            console.log('✅ ACTUAL: Items container visible, no crash');
        });

        await allure.step('RESULT: Test Passed', async () => {
            console.log('✅ PASS: Page remains stable during API failure');
        });
    });

    test('Scenario 3: Network Timeout - Request Abortion', async ({ page }) => {
        await allure.epic('Frontend Resilience');
        await allure.feature('Network Chaos');
        await allure.story('Connection Failure');
        await allure.severity('critical');

        await allure.step('EXPECTATION: UI should not crash when requests are aborted', async () => {
            console.log('🔵 EXPECTATION: Graceful handling of aborted requests');
        });

        await allure.step('Abort all API requests', async () => {
            await page.route('**/api/items', async (route) => {
                await route.abort('failed');
            });
            console.log('⚡ Chaos Injected: All requests aborted');
        });

        await allure.step('Navigate to dashboard', async () => {
            await page.goto('/', { waitUntil: 'networkidle' });
            console.log('📍 Navigated to: http://localhost:3000/');
        });

        await allure.step('Verify UI stability', async () => {
            // The new UI uses api-card as a testId
            const apiCard = page.getByTestId('api-card');
            await expect(apiCard).toBeVisible();
            console.log('✅ ACTUAL: API status card visible, UI stable');
        });

        await allure.step('RESULT: Test Passed', async () => {
            console.log('✅ PASS: UI stable during network timeout');
        });
    });

    test('Scenario 4: Offline Mode - Connectivity Loss', async ({ page, context }) => {
        await allure.epic('Frontend Resilience');
        await allure.feature('Network Chaos');
        await allure.story('Offline Mode');
        await allure.severity('normal');

        await allure.step('EXPECTATION: Page should remain stable when offline', async () => {
            console.log('🔵 EXPECTATION: Already loaded content persists offline');
        });

        await allure.step('Navigate to dashboard', async () => {
            // Use domcontentloaded for latency tests so we don't timeout on the network
            await page.goto('/', { waitUntil: 'domcontentloaded' });
            console.log('📍 Navigated to: http://localhost:3000/');
        });

        await allure.step('Verify initial page load', async () => {
            const apiCard = page.getByTestId('api-card');
            await expect(apiCard).toBeVisible();
            console.log('✅ Page loaded successfully');
        });

        await allure.step('Simulate offline mode', async () => {
            await context.setOffline(true);
            console.log('⚡ Chaos Injected: Network offline');
        });

        await allure.step('Verify content persistence', async () => {
            const apiCard = page.getByTestId('api-card');
            await expect(apiCard).toBeVisible();
            console.log('✅ ACTUAL: Content persisted offline');
        });

        await allure.step('RESULT: Test Passed', async () => {
            console.log('✅ PASS: Page handles offline mode');
        });
    });

    test('Scenario 5: Partial Data - Empty Response', async ({ page }) => {
        await allure.epic('Frontend Resilience');
        await allure.feature('Data Handling');
        await allure.story('Empty State');
        await allure.severity('normal');

        await allure.step('EXPECTATION: Empty data should be handled gracefully', async () => {
            console.log('🔵 EXPECTATION: No crash on empty array response');
        });

        await allure.step('Return empty array from API', async () => {
            await page.route('**/api/items', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([]),
                });
            });
            console.log('⚡ Chaos Injected: Empty data response');
        });

        await allure.step('Navigate to dashboard', async () => {
            await page.goto('/', { waitUntil: 'domcontentloaded' });
            console.log('📍 Navigated to: http://localhost:3000/');
        });

        await allure.step('Verify empty state handling', async () => {
            const container = page.getByTestId('items-container');
            await expect(container).toBeVisible();
            console.log('✅ ACTUAL: Container visible with empty state');
        });

        await allure.step('RESULT: Test Passed', async () => {
            console.log('✅ PASS: Empty data handled gracefully');
        });
    });

    test('Scenario 6: POST Action Failure - Database Shutdown during Submission', async ({ page }) => {
        await allure.epic('Frontend Resilience');
        await allure.feature('Action Chaos');
        await allure.story('Form Submission Failure');
        await allure.severity('blocker');

        await allure.step('Intercept POST and simulate Database Connection Refused', async () => {
            await page.route('**/api/items', async (route) => {
                if (route.request().method() === 'POST') {
                    await route.fulfill({
                        status: 503,
                        contentType: 'application/json',
                        body: JSON.stringify({ error: 'Service Unavailable' }),
                    });
                } else {
                    await route.continue();
                }
            });
            console.log('⚡ Chaos Injected: POST /api/items -> 503 Service Unavailable');
        });

        await page.goto('/', { waitUntil: 'domcontentloaded' });

        await allure.step('User performs "Commit to Database" action', async () => {
            await page.fill('#item-name', 'Chaos Resilience Test');
            await page.fill('#item-value', '99');
            await page.click('#submit-btn');
            console.log('🖱️ User clicked Submit during outage');
        });

        await allure.step('Verify UI displays error Toast and keeps data for retry', async () => {
            const toast = page.getByTestId('toast-msg');
            await expect(toast).toBeVisible();
            // Look for Status Code specifically
            await expect(toast).toContainText('503');

            const nameVal = await page.inputValue('#item-name');
            expect(nameVal).toBe('Chaos Resilience Test');
            console.log('✅ ACTUAL: 503 Toast visible, Form data preserved');
        });

        await allure.step('RESULT: Action Resilience Passed', async () => {
            console.log('✅ PASS: System handled mid-action failure gracefully');
        });
    });

    test('Scenario 7: Sync Failure - Partial Fulfillment (POST succeeds, GET fails)', async ({ page }) => {
        await allure.epic('Frontend Resilience');
        await allure.feature('Sync Chaos');
        await allure.story('List Refresh Failure');
        await allure.severity('critical');

        await allure.step('Setup: POST succeeds but subsequent GET /items fails', async () => {
            await page.route('**/api/items', async (route) => {
                const method = route.request().method();
                if (method === 'POST') {
                    await route.fulfill({ status: 201, body: JSON.stringify({ success: true }), contentType: 'application/json' });
                } else {
                    await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Sync Error' }), contentType: 'application/json' });
                }
            });
            console.log('⚡ Chaos Injected: POST 201 (OK) but GET 500 (Fail)');
        });

        await page.goto('/', { waitUntil: 'domcontentloaded' });

        await allure.step('User submits record', async () => {
            await page.fill('#item-name', 'Partial Sync Test');
            await page.fill('#item-value', '50');
            await page.click('#submit-btn');
        });

        await allure.step('Verify Success Toast for POST, then Error Toast for GET', async () => {
            const toast = page.getByTestId('toast-msg');
            // Wait for success toast
            await expect(toast).toContainText('successfully');

            // The secondary GET 500 will trigger the next toast
            await expect(toast).toContainText('fetch', { timeout: 15000 });
            console.log('✅ ACTUAL: Handled specific sync failure after successful write');
        });
    });
});
