/**
 * MOBILE CHAOS TESTS — LAYER 3: MOBILE-SPECIFIC CHAOS
 * 
 * These scenarios test mobile-ONLY failure modes that DON'T exist in web.
 * Uses xcrun simctl for iOS simulator control.
 * 
 * Uses: Detox + xcrun simctl + Toxiproxy
 * Target: iOS Simulator
 * 
 * Scenarios:
 *   1. Airplane Mode Toggle → App Handles Connectivity State
 *   2. Background/Foreground → State Persistence
 *   3. Memory Warning → No Crash
 *   4. Low Battery State → UI Remains Functional
 *   5. Slow 3G Network → Degraded Performance Handling
 *   6. App Termination & Restart → State Recovery
 *   7. Orientation Change During API Call → No Crash
 *   8. URL Blacklist (Selective Network Failure) → Partial Degradation
 */

import { device, element, by, expect, waitFor } from 'detox';
import { simctl, toxiproxy, msHealth, MS_URL } from './helpers/chaos-utils';

describe('Mobile Chaos – Layer 3: Mobile-Specific Chaos (xcrun simctl)', () => {

    beforeAll(async () => {
        // Ensure backend is healthy
        await msHealth.waitForReady(30000);

        await device.launchApp({
            newInstance: true,
            launchArgs: {
                EXPO_PUBLIC_API_BASE_URL: MS_URL,
                DETOX: "true",
            },
        });
    });

    beforeEach(async () => {
        await toxiproxy.cleanupAll();
        await device.reloadReactNative();
        // Give app time to settle
        await new Promise(resolve => setTimeout(resolve, 2000));
        simctl.clearStatusBarOverrides();
    });

    afterEach(async () => {
        await toxiproxy.cleanupAll();
        simctl.clearStatusBarOverrides();
        await device.setURLBlacklist([]);
    });

    // ─────────────────────────────────────────────────────────
    // Scenario 1: Airplane Mode Toggle
    // ─────────────────────────────────────────────────────────
    test('Mobile Scenario 1: Airplane Mode Toggle', async () => {
        console.log('🔵 EXPECTATION: App survives airplane mode toggle');

        // Wait for initial load
        await waitFor(element(by.id('items-container')))
            .toBeVisible()
            .withTimeout(10000);
        console.log('✅ Initial data loaded');

        // Simulate airplane mode via URL blacklist (Detox approach)
        console.log('✈️ Enabling airplane mode (URL blacklist)...');
        await device.setURLBlacklist(['.*']);

        // Wait for network state to propagate
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Try to refresh — should fail gracefully
        await element(by.id('main-scroll')).scrollTo('top');
        await element(by.id('refresh-btn')).tap();

        // Wait for failed request
        await new Promise(resolve => setTimeout(resolve, 2000));

        // App should still be visible (not crashed)
        await expect(element(by.id('main-scroll'))).toBeVisible();
        console.log('✅ App remains alive during airplane mode');

        // Disable airplane mode
        console.log('📶 Restoring network...');
        await device.setURLBlacklist([]);

        // Wait for recovery
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Refresh again — should work now
        await element(by.id('refresh-btn')).tap();

        await waitFor(element(by.id('items-container')))
            .toBeVisible()
            .withTimeout(15000);

        console.log('✅ PASS: App recovered after airplane mode toggle');
    });

    // ─────────────────────────────────────────────────────────
    // Scenario 2: Background / Foreground Transitions
    // ─────────────────────────────────────────────────────────
    test('Mobile Scenario 2: Background/Foreground State Transition', async () => {
        console.log('🔵 EXPECTATION: App maintains state after background/foreground');

        // Wait for initial load
        await waitFor(element(by.id('items-container')))
            .toBeVisible()
            .withTimeout(10000);

        // Fill form data - use replaceText to avoid keyboard quirks
        await element(by.id('item-name')).tap();
        await element(by.id('item-name')).replaceText('BG Test');
        console.log('📝 Form data entered');

        // Send app to background
        console.log('📱 Sending app to background...');
        await device.sendToHome();

        // Wait in background for 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Bring back to foreground
        console.log('📱 Bringing app back to foreground...');
        await device.launchApp({ newInstance: false });

        // Verify UI is still visible
        await expect(element(by.id('main-scroll'))).toBeVisible();

        // Verify form data is preserved
        await expect(element(by.id('item-name'))).toHaveText('BG Test');

        console.log('✅ PASS: App state preserved after background/foreground');
    });

    // ─────────────────────────────────────────────────────────
    // Scenario 3: Memory Warning (xcrun simctl)
    // ─────────────────────────────────────────────────────────
    test('Mobile Scenario 3: Memory Pressure Warning – No Crash', async () => {
        console.log('🔵 EXPECTATION: App survives memory warning without crash');

        // Wait for initial load
        await waitFor(element(by.id('items-container')))
            .toBeVisible()
            .withTimeout(10000);

        // Trigger memory warning via xcrun simctl
        console.log('⚠️ Triggering memory warning via xcrun simctl...');
        simctl.triggerMemoryWarning();

        // Wait for the warning to propagate
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify app is still alive and functional
        await expect(element(by.id('main-scroll'))).toBeVisible();
        await expect(element(by.id('api-card'))).toBeVisible();

        // Try a user action to confirm the app is responsive
        await element(by.id('main-scroll')).scrollTo('top');
        await element(by.id('refresh-btn')).tap();

        await waitFor(element(by.id('items-container')))
            .toBeVisible()
            .withTimeout(10000);

        console.log('✅ PASS: App survived memory warning without crash');
    });

    // ─────────────────────────────────────────────────────────
    // Scenario 4: Low Battery State
    // ─────────────────────────────────────────────────────────
    test('Mobile Scenario 4: Low Battery State – UI Functional', async () => {
        console.log('🔵 EXPECTATION: App functions normally in low battery state');

        // Set low battery via xcrun simctl
        console.log('🔋 Setting battery to 5% discharging...');
        simctl.setBatteryState('discharging', 5);

        // Wait for initial load
        await waitFor(element(by.id('items-container')))
            .toBeVisible()
            .withTimeout(10000);

        // Verify all UI elements work
        await expect(element(by.id('api-card'))).toBeVisible();
        await expect(element(by.id('action-form'))).toBeVisible();

        // Perform a user action (replaceText to avoid keyboard issues)
        await element(by.id('item-name')).tap();
        await element(by.id('item-name')).replaceText('Low Battery');

        console.log('✅ PASS: App fully functional in low battery state');

        // Restore battery
        simctl.setBatteryState('charged', 100);
    });

    // ─────────────────────────────────────────────────────────
    // Scenario 5: Slow 3G Network Simulation
    // ─────────────────────────────────────────────────────────
    test('Mobile Scenario 5: Slow 3G Network – Degraded Performance', async () => {
        console.log('🔵 EXPECTATION: App handles slow 3G network gracefully');

        // Inject heavy latency via Toxiproxy to simulate 3G
        console.log('📶 Simulating 3G network (3000ms latency)...');
        await toxiproxy.injectLatency('db_proxy', 3000, '3g-latency');
        simctl.setNetworkCondition('LTE'); // We use LTE but with injection to mock "slow"

        // Reload app
        await device.reloadReactNative();

        // Data should eventually load
        await waitFor(element(by.id('items-container')))
            .toBeVisible()
            .withTimeout(20000);

        console.log('✅ PASS: App handles slow simulated network gracefully');

        // Cleanup
        await toxiproxy.removeToxic('db_proxy', '3g-latency');
        simctl.clearStatusBarOverrides();
    });

    // ─────────────────────────────────────────────────────────
    // Scenario 6: App Termination & Restart
    // ─────────────────────────────────────────────────────────
    test('Mobile Scenario 6: App Termination & Cold Restart', async () => {
        console.log('🔵 EXPECTATION: App restarts cleanly after force termination');

        // Wait for initial load
        await waitFor(element(by.id('items-container')))
            .toBeVisible()
            .withTimeout(10000);
        console.log('✅ Initial state confirmed');

        // Terminate the app via xcrun simctl
        console.log('💀 Force terminating app...');
        simctl.terminateApp('com.chaos.mobile');

        // Wait for termination
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Full cold restart
        console.log('🚀 Cold restarting app...');
        await device.launchApp({
            newInstance: true,
            launchArgs: {
                EXPO_PUBLIC_API_BASE_URL: MS_URL,
            },
        });

        // Verify app loads correctly from cold start
        await waitFor(element(by.id('main-scroll')))
            .toBeVisible()
            .withTimeout(10000);

        await waitFor(element(by.id('items-container')))
            .toBeVisible()
            .withTimeout(15000);

        console.log('✅ PASS: App recovers cleanly from force termination');
    });

    // ─────────────────────────────────────────────────────────
    // Scenario 7: Orientation Change During API Call
    // ─────────────────────────────────────────────────────────
    test('Mobile Scenario 7: Orientation Change During Load – No Crash', async () => {
        console.log('🔵 EXPECTATION: Orientation change during API call doesn\'t crash');

        // Add latency so the API call is in-flight
        await toxiproxy.injectLatency('db_proxy', 3000, 'orientation-latency');

        await device.reloadReactNative();

        // Change orientation while loading
        console.log('🔄 Changing to landscape...');
        await device.setOrientation('landscape');

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Change back
        console.log('🔄 Changing to portrait...');
        await device.setOrientation('portrait');

        // App should still be alive
        await expect(element(by.id('main-scroll'))).toBeVisible();

        // Data should eventually load
        await waitFor(element(by.id('items-container')))
            .toBeVisible()
            .withTimeout(15000);

        console.log('✅ PASS: No crash during orientation change');

        await toxiproxy.removeToxic('db_proxy', 'orientation-latency');
    });

    // ─────────────────────────────────────────────────────────
    // Scenario 8: Selective Network Failure (URL Blacklist)
    // ─────────────────────────────────────────────────────────
    test('Mobile Scenario 8: Selective Network Block → Partial Degradation', async () => {
        console.log('🔵 EXPECTATION: Blocking specific URLs causes partial degradation');

        // Wait for initial load
        await waitFor(element(by.id('items-container')))
            .toBeVisible()
            .withTimeout(10000);

        // Block only the API endpoint
        console.log('🚫 Blocking API items endpoint...');
        await device.setURLBlacklist(['.*/api/items.*']);

        // Try to refresh
        await element(by.id('main-scroll')).scrollTo('top');
        await element(by.id('refresh-btn')).tap();

        // Wait for the blocked request to process
        await new Promise(resolve => setTimeout(resolve, 5000));

        // App should show degraded state (or just remain stable)
        await expect(element(by.id('main-scroll'))).toBeVisible();

        console.log('✅ PASS: Selective network block causes graceful degradation');

        // Restore
        await device.setURLBlacklist([]);
    });
});
