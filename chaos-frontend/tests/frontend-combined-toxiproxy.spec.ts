import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

/**
 * FULL-STACK COMBINED CHAOS TEST
 * This test uses Toxiproxy to inject real latency into the backend Database.
 * It validates that the Frontend handles this "combined" delay gracefully by
 * displaying skeleton loaders and eventually rendering the data once the backend recovers.
 */

import * as fs from 'fs';
import * as path from 'path';

// Helper to read ports from the backend generated env file
const getBackendConfig = () => {
    const envPath = path.resolve(__dirname, '../../chaos-spring-ms/infra/.env.generated');
    const config = { msPort: '8003', toxiPort: '8004' }; // default fallbacks

    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const msMatch = content.match(/MS_PORT=(\d+)/);
        const toxiMatch = content.match(/TOXIPROXY_PORT=(\d+)/);
        if (msMatch) config.msPort = msMatch[1];
        if (toxiMatch) config.toxiPort = toxiMatch[1];
    }
    return config;
};

const config = getBackendConfig();
const TOXIPROXY_URL = `http://localhost:${config.toxiPort}`;
const MS_URL = `http://localhost:${config.msPort}`;
const MS_INTERNAL_URL = `127.0.0.1:${config.msPort}`;

test.describe('Frontend + Backend Combined Chaos (Toxiproxy Latency)', () => {

    const cleanupToxics = async () => {
        const proxies = ['db_proxy', 'redis_proxy', 'ext_proxy'];
        for (const proxy of proxies) {
            try {
                const res = await fetch(`${TOXIPROXY_URL}/proxies/${proxy}/toxics`);
                if (res.ok) {
                    const toxics = await res.json();
                    for (const toxic of toxics) {
                        await fetch(`${TOXIPROXY_URL}/proxies/${proxy}/toxics/${toxic.name}`, { method: 'DELETE' });
                    }
                }
            } catch (e) {
                // Ignore errors during cleanup
            }
        }
    };

    test.beforeEach(async () => {
        console.log('🧹 Cleaning up all Toxiproxy proxies...');
        await cleanupToxics();
    });

    test.afterEach(async () => {
        console.log('🧹 Cleaning up Toxiproxy after test...');
        await cleanupToxics();
    });

    test.afterAll(async () => {
        console.log('🧹 Final cleanup of Toxiproxy...');
        await cleanupToxics();
    });

    test('Combined Scenario: 5s Real Database Latency -> Skeleton Loaders Display', async ({ page }) => {
        await allure.epic('Full-Stack Resilience');
        await allure.feature('Combined Chaos');
        await allure.story('Database Latency Propagation');
        await allure.severity('critical');

        // 1. Inject Chaos via Toxiproxy (External to Frontend)
        await allure.step('STEP 1: Inject 5000ms latency into DB Proxy via Toxiproxy', async () => {
            console.log('⚡ Injecting 5000ms latency into DB...');
            const response = await fetch(`${TOXIPROXY_URL}/proxies/db_proxy/toxics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'db-latency',
                    type: 'latency',
                    toxicity: 1,
                    attributes: { latency: 5000 }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to inject latency: ${errorText}`);
            }
            console.log('✅ Toxiproxy latency injected successfully');
        });

        // 2. Load Frontend
        await allure.step('STEP 2: Navigate to Frontend Dashboard and Link to Real MS', async () => {
            console.log('📍 Linking /api to real Backend (localhost:8000)...');

            // Re-route frontend requests to the actual microservice
            await page.route('**/api/**', async (route) => {
                const originalUrl = route.request().url();
                const targetUrl = originalUrl.replace('localhost:3000', MS_INTERNAL_URL);
                console.log(`🔀 Redirecting: ${originalUrl} -> ${targetUrl}`);

                try {
                    // Use playwright's fetch to get the data from the real MS
                    const response = await page.request.fetch(targetUrl, {
                        method: route.request().method(),
                        headers: route.request().headers(),
                        data: route.request().postData() || undefined,
                    });

                    console.log(`✅ MS Response: ${response.status()} ${response.statusText()}`);
                    await route.fulfill({
                        response,
                        // Override CORS if needed (though local is usually fine)
                        headers: {
                            ...response.headers(),
                            'Access-Control-Allow-Origin': '*',
                        }
                    });
                } catch (e: any) {
                    console.error(`❌ MS Request Failed: ${e.message}`);
                    await route.fulfill({
                        status: 502,
                        body: JSON.stringify({ error: 'MS Unreachable via Proxy' })
                    });
                }
            });

            await page.goto('/', { waitUntil: 'domcontentloaded' });
            console.log('📍 Navigated to dashboard');
        });

        // 3. Verify Frontend Reactions
        await allure.step('STEP 3: Verify Skeleton Loaders are visible during delay', async () => {
            const skeletons = page.getByTestId('skeleton-loader');

            // Should be visible immediately because DB is slow
            await expect(skeletons.first()).toBeVisible({ timeout: 5000 });
            const count = await skeletons.count();
            console.log(`✅ ACTUAL: ${count} skeleton loaders displayed during real DB delay`);

            // Wait for 2 more seconds to ensure they stay there (not flickering)
            await page.waitForTimeout(2000);
            await expect(skeletons.first()).toBeVisible();
        });

        // 4. Verify Recovery
        await allure.step('STEP 4: Verify Data eventually loads after latency', async () => {
            console.log('⏳ Waiting for data to load (should be > 5s total)...');
            const items = page.getByTestId('items-container');

            // Data or "No records" should appear eventually. Total timeout 15s.
            await expect(async () => {
                const text = await items.innerText();
                expect(text).toMatch(/ID:|No records found/);
            }).toPass({ timeout: 15000 });

            console.log('✅ ACTUAL: Data (or empty state) rendered successfully after slow DB response');

            const skeletons = page.getByTestId('skeleton-loader');
            await expect(skeletons.first()).not.toBeVisible();
        });

        // 5. Cleanup
        await allure.step('STEP 5: Remove Toxiproxy latency', async () => {
            await cleanupToxics();
            console.log('🧹 Latency removed, system back to baseline');
        });
    });

    test('Combined Scenario 2: Real Database Connection Cut -> Error Toast Display', async ({ page }) => {
        await allure.epic('Full-Stack Resilience');
        await allure.feature('Combined Chaos');
        await allure.story('Database Connection Loss');
        await allure.severity('critical');

        // Setup route interception first
        await page.route('**/api/**', async (route) => {
            const originalUrl = route.request().url();
            const targetUrl = originalUrl.replace('localhost:3000', MS_INTERNAL_URL);

            try {
                const response = await page.request.fetch(targetUrl, {
                    method: route.request().method(),
                    headers: route.request().headers(),
                    data: route.request().postData() || undefined,
                });

                console.log(`✅ MS Response: ${response.status()}`);
                await route.fulfill({
                    response,
                    headers: {
                        ...response.headers(),
                        'Access-Control-Allow-Origin': '*',
                    }
                });
            } catch (e: any) {
                console.error(`❌ MS Request Failed: ${e.message}`);
                await route.fulfill({
                    status: 502,
                    body: JSON.stringify({ error: 'MS Unreachable' })
                });
            }
        });

        await allure.step('STEP 1: Inject Database Bandwidth Cut via Toxiproxy', async () => {
            console.log('⚡ Cutting database connection (bandwidth = 0)...');
            const response = await fetch(`${TOXIPROXY_URL}/proxies/db_proxy/toxics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'db-cut',
                    type: 'bandwidth',
                    toxicity: 1,
                    attributes: { rate: 0 }
                })
            });

            if (!response.ok) throw new Error(`Failed to cut DB: ${await response.text()}`);
            console.log('✅ Database connection severed');
        });

        await allure.step('STEP 2: Navigate to Frontend and trigger API call', async () => {
            await page.goto('/', { waitUntil: 'domcontentloaded' });
            console.log('📍 Dashboard loaded, waiting for error...');
        });

        await allure.step('STEP 3: Verify Error Toast is displayed', async () => {
            const toast = page.getByTestId('toast-msg');
            await expect(toast).toBeVisible({ timeout: 15000 });
            await expect(toast).toContainText(/fetch|error|failed/i);
            console.log('✅ ACTUAL: Error toast displayed for DB outage');
        });

        await allure.step('STEP 4: Cleanup - Remove bandwidth cut', async () => {
            await fetch(`${TOXIPROXY_URL}/proxies/db_proxy/toxics/db-cut`, { method: 'DELETE' });
            console.log('🧹 Database connection restored');
        });
    });

    test('Combined Scenario 3: Real Redis Cache Cut -> Fallback to DB (slower response)', async ({ page }) => {
        await allure.epic('Full-Stack Resilience');
        await allure.feature('Combined Chaos');
        await allure.story('Cache Failure Fallback');
        await allure.severity('normal');

        // Setup route interception
        await page.route('**/api/**', async (route) => {
            const originalUrl = route.request().url();
            const targetUrl = originalUrl.replace('localhost:3000', MS_INTERNAL_URL);

            try {
                const response = await page.request.fetch(targetUrl, {
                    method: route.request().method(),
                    headers: route.request().headers(),
                    data: route.request().postData() || undefined,
                });

                await route.fulfill({
                    response,
                    headers: {
                        ...response.headers(),
                        'Access-Control-Allow-Origin': '*',
                    }
                });
            } catch (e: any) {
                await route.fulfill({
                    status: 502,
                    body: JSON.stringify({ error: 'MS Unreachable' })
                });
            }
        });

        await allure.step('STEP 1: Inject Redis Connection Cut via Toxiproxy', async () => {
            console.log('⚡ Cutting Redis connection...');
            const response = await fetch(`${TOXIPROXY_URL}/proxies/redis_proxy/toxics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'redis-cut',
                    type: 'bandwidth',
                    toxicity: 1,
                    attributes: { rate: 0 }
                })
            });

            if (!response.ok) throw new Error(`Failed to cut Redis: ${await response.text()}`);
            console.log('✅ Redis connection severed (should fallback to DB)');

            // Inject a bit of DB latency to ensure skeletons show up during fallback
            await fetch(`${TOXIPROXY_URL}/proxies/db_proxy/toxics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'db-fallback-latency',
                    type: 'latency',
                    toxicity: 1,
                    attributes: { latency: 5000 }
                })
            });
        });

        await allure.step('STEP 2: Navigate to Frontend', async () => {
            await page.goto('/', { waitUntil: 'domcontentloaded' });
            console.log('📍 Dashboard loaded');
        });

        await allure.step('STEP 3: Verify Skeleton Loaders appear (slower without cache)', async () => {
            const skeletons = page.getByTestId('skeleton-loader');
            await expect(skeletons.first()).toBeVisible({ timeout: 5000 });
            console.log('✅ ACTUAL: Skeleton loaders displayed during fallback');
        });

        await allure.step('STEP 4: Verify Data still loads (via DB fallback)', async () => {
            const items = page.getByTestId('items-container');

            await expect(async () => {
                const text = await items.innerText();
                expect(text).toMatch(/ID:|No records found/);
            }).toPass({ timeout: 30000 });

            console.log('✅ ACTUAL: Data loaded successfully despite Redis failure (DB fallback worked)');
        });

        await allure.step('STEP 5: Cleanup - Restore Redis and DB', async () => {
            await cleanupToxics();
            console.log('🧹 Redis and DB restored');
        });
    });

    test('Combined Scenario 4: Complete Microservice Container Kill -> Connection Refused', async ({ page }) => {
        await allure.epic('Full-Stack Resilience');
        await allure.feature('Combined Chaos');
        await allure.story('Complete Service Outage');
        await allure.severity('blocker');

        // Setup route interception with better error handling
        await page.route('**/api/**', async (route) => {
            const originalUrl = route.request().url();
            const targetUrl = originalUrl.replace('localhost:3000', MS_INTERNAL_URL);

            try {
                const response = await page.request.fetch(targetUrl, {
                    method: route.request().method(),
                    headers: route.request().headers(),
                    data: route.request().postData() || undefined,
                    timeout: 5000, // Quick timeout for this test
                });

                await route.fulfill({ response });
            } catch (e: any) {
                console.log(`🔴 MS Down: ${e.message}`);
                // Simulate connection refused
                await route.abort('connectionrefused');
            }
        });

        await allure.step('STEP 1: Kill microservice container via Docker', async () => {
            console.log('⚡ Killing chaos-ms container...');
            const { execSync } = require('child_process');
            try {
                const running = execSync('docker ps -q -f name=chaos-ms').toString().trim();
                if (running) {
                    execSync('docker kill chaos-ms');
                    console.log('✅ Microservice killed');
                } else {
                    console.log('⚠️ Microservice already down');
                }
            } catch (e: any) {
                console.error(`Docker command failed: ${e.message}`);
            }
        });

        await allure.step('STEP 2: Navigate to Frontend during outage', async () => {
            await page.goto('/', { waitUntil: 'domcontentloaded' });
            console.log('📍 Dashboard loaded, MS should be down');
        });

        await allure.step('STEP 3: Verify Error Toast for connection refused', async () => {
            const toast = page.getByTestId('toast-msg');
            await expect(toast).toBeVisible({ timeout: 10000 });
            await expect(toast).toContainText(/fetch|error|failed/i);
            console.log('✅ ACTUAL: Error toast displayed for MS outage');
        });

        await allure.step('STEP 4: Wait for auto-restart and verify recovery', async () => {
            console.log('⏳ Waiting for Docker to auto-restart chaos-ms (up to 30s)...');

            // Wait for container to restart
            await page.waitForTimeout(15000);

            // Try to refresh and see if we can get data
            await page.reload({ waitUntil: 'domcontentloaded' });

            const items = page.getByTestId('items-container');
            await expect(items).toBeVisible({ timeout: 15000 });
            console.log('✅ ACTUAL: Microservice recovered, data visible again');
        });
    });
});
