import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('Frontend Chaos - Layer 2: Full-Stack Integration', () => {

    test('Integration 1: Real Backend Latency + UI Response', async ({ page }) => {
        await allure.epic('Frontend Resilience');
        await allure.feature('Full-Stack Chaos');
        await allure.severity('critical');

        await allure.step('Navigate to real production dashboard with forced 2s latency', async () => {
            await page.route('**/api/items', async (route) => {
                await new Promise(resolve => setTimeout(resolve, 2000));
                await route.continue();
            });
            await page.goto('/', { waitUntil: 'domcontentloaded' });
        });

        await allure.step('Verify UI renders loading state (Skeletons) during initial fetch', async () => {
            const skeletons = page.getByTestId('skeleton-loader');
            await expect(skeletons.first()).toBeVisible({ timeout: 10000 });
            console.log('✅ PASS: UI renders loading state during real backend latency');
        });
    });

    test('Integration 2: Backend Outage + Error Handling', async ({ page }) => {
        await allure.epic('Frontend Resilience');
        await allure.feature('Full-Stack Chaos');
        await allure.severity('blocker');

        await allure.step('Simulate connection refused for backend', async () => {
            await page.route('**/api/**', async (route) => {
                await route.abort('connectionrefused');
            });
        });

        await page.goto('/', { waitUntil: 'domcontentloaded' });

        await allure.step('Verify Registry shows error state gracefully', async () => {
            const container = page.getByTestId('items-container');
            await expect(container).toBeVisible();
            // Should show the "Failed to fetch items" toast due to the background GET failing on load
            const toast = page.getByTestId('toast-msg');
            await expect(toast).toContainText('fetch');
            console.log('✅ PASS: Error handled gracefully during backend outage');
        });
    });

    test('Integration 3: User Action during Outage', async ({ page }) => {
        await allure.epic('Frontend Resilience');
        await allure.feature('Full-Stack Chaos');
        await allure.severity('critical');

        await allure.step('Intercept all API traffic and return 503', async () => {
            await page.route('**/api/**', async (route) => {
                await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
            });
        });

        await page.goto('/', { waitUntil: 'domcontentloaded' });

        await allure.step('User attempts to create item during outage', async () => {
            await page.fill('#item-name', 'Integration Chaos Test');
            await page.fill('#item-value', '100');
            await page.click('#submit-btn');
        });

        await allure.step('Verify Chaos Toast is shown', async () => {
            const toast = page.getByTestId('toast-msg');
            await expect(toast).toContainText('503');
            console.log('✅ PASS: User action chaos handled in integration mode');
        });
    });
});
