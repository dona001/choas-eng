import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: false, // Run sequentially for better visual observation
    forbidOnly: !!process.env.CI,
    retries: 0, // No retries for chaos tests
    workers: 1, // Single worker for sequential execution
    reporter: [
        ['list'], // Console output
        ['allure-playwright', {
            outputFolder: 'allure-results',
            detail: true,
            suiteTitle: true,
        }],
    ],
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on',
        screenshot: 'on',
        video: 'on',
        headless: false, // Show browser during tests
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
            slowMo: 500, // Slow down actions for visibility
        },
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'npm run build && npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
    },
});
