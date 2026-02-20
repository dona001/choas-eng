/**
 * Chaos Testing Utilities for Mobile
 * 
 * Provides helpers for:
 * - Toxiproxy control (inject latency, cut connections)
 * - xcrun simctl control (network conditioning, airplane mode)
 * - Docker container manipulation
 * - Test reporting helpers
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ───────────────────────────────────────────
// Config: Read from backend's generated env
// ───────────────────────────────────────────

const getBackendConfig = () => {
    const envPath = path.resolve(__dirname, '../../../chaos-spring-ms/infra/.env.generated');
    const config = { msPort: '8003', toxiPort: '8004' };

    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const msMatch = content.match(/MS_PORT=(\d+)/);
        const toxiMatch = content.match(/TOXIPROXY_PORT=(\d+)/);
        if (msMatch) config.msPort = msMatch[1];
        if (toxiMatch) config.toxiPort = toxiMatch[1];
    }
    return config;
};

export const backendConfig = getBackendConfig();
export const TOXIPROXY_URL = `http://localhost:${backendConfig.toxiPort}`;
export const MS_URL = `http://localhost:${backendConfig.msPort}`;

// ───────────────────────────────────────────
// Toxiproxy Helpers
// ───────────────────────────────────────────

export const toxiproxy = {
    /**
     * Inject latency into a proxy
     */
    async injectLatency(proxy: string, latencyMs: number, toxicName?: string): Promise<void> {
        const name = toxicName || `${proxy}-latency`;
        console.log(`⚡ Injecting ${latencyMs}ms latency into ${proxy}...`);
        const response = await fetch(`${TOXIPROXY_URL}/proxies/${proxy}/toxics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                type: 'latency',
                toxicity: 1,
                attributes: { latency: latencyMs },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to inject latency: ${errorText}`);
        }
        console.log(`✅ Toxiproxy latency injected: ${proxy} +${latencyMs}ms`);
    },

    /**
     * Cut connection by setting bandwidth to 0
     */
    async cutConnection(proxy: string, toxicName?: string): Promise<void> {
        const name = toxicName || `${proxy}-cut`;
        console.log(`⚡ Cutting connection for ${proxy}...`);
        const response = await fetch(`${TOXIPROXY_URL}/proxies/${proxy}/toxics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                type: 'bandwidth',
                toxicity: 1,
                attributes: { rate: 0 },
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to cut connection: ${await response.text()}`);
        }
        console.log(`✅ Connection severed: ${proxy}`);
    },

    /**
     * Remove a specific toxic
     */
    async removeToxic(proxy: string, toxicName: string): Promise<void> {
        try {
            await fetch(`${TOXIPROXY_URL}/proxies/${proxy}/toxics/${toxicName}`, {
                method: 'DELETE',
            });
            console.log(`🧹 Removed toxic: ${proxy}/${toxicName}`);
        } catch (e) {
            // Ignore cleanup errors
        }
    },

    /**
     * Clean up ALL toxics from all proxies
     */
    async cleanupAll(): Promise<void> {
        const proxies = ['db_proxy', 'redis_proxy', 'ext_proxy'];
        for (const proxy of proxies) {
            try {
                const res = await fetch(`${TOXIPROXY_URL}/proxies/${proxy}/toxics`);
                if (res.ok) {
                    const toxics = await res.json();
                    for (const toxic of toxics) {
                        await fetch(`${TOXIPROXY_URL}/proxies/${proxy}/toxics/${toxic.name}`, {
                            method: 'DELETE',
                        });
                    }
                }
            } catch (e) {
                // Ignore errors during cleanup
            }
        }
        console.log('🧹 All Toxiproxy toxics cleaned');
    },
};

// ───────────────────────────────────────────
// xcrun simctl Helpers (iOS Simulator)
// ───────────────────────────────────────────

export const simctl = {
    /**
     * Get the booted simulator's UDID
     */
    getBootedDevice(): string {
        try {
            const result = execSync(
                'xcrun simctl list devices booted -j',
                { encoding: 'utf8' }
            );
            const json = JSON.parse(result);
            for (const runtime of Object.values(json.devices) as any[]) {
                for (const device of runtime) {
                    if (device.state === 'Booted') {
                        return device.udid;
                    }
                }
            }
        } catch (e) {
            console.error('Failed to get booted simulator:', e);
        }
        return '';
    },

    /**
     * Apply Network Link Conditioner profile
     * Profiles: "100% Loss", "Very Bad Network", "Edge", "3G", "LTE", "WiFi"
     */
    setNetworkCondition(profile: string): void {
        try {
            console.log(`📶 Applying network condition: "${profile}"`);
            // Use the Network Link Conditioner approach via simctl status_bar
            const udid = this.getBootedDevice();
            if (udid) {
                // Override status bar to show network condition
                execSync(`xcrun simctl status_bar "${udid}" override --dataNetwork "${profile}"`, {
                    encoding: 'utf8',
                });
                console.log(`✅ Network condition applied: ${profile}`);
            }
        } catch (e: any) {
            console.error(`Failed to set network condition: ${e.message}`);
        }
    },

    /**
     * Clear status bar overrides
     */
    clearStatusBarOverrides(): void {
        try {
            const udid = this.getBootedDevice();
            if (udid) {
                execSync(`xcrun simctl status_bar "${udid}" clear`, {
                    encoding: 'utf8',
                });
                console.log('🧹 Status bar overrides cleared');
            }
        } catch (e) {
            // Ignore
        }
    },

    /**
     * Terminate app in simulator
     */
    terminateApp(bundleId: string = 'com.chaos.mobile'): void {
        try {
            const udid = this.getBootedDevice();
            if (udid) {
                execSync(`xcrun simctl terminate "${udid}" ${bundleId}`, {
                    encoding: 'utf8',
                });
                console.log(`📱 App terminated: ${bundleId}`);
            }
        } catch (e) {
            // App might not be running
        }
    },

    /**
     * Open URL in simulator (deep link testing)
     */
    openUrl(url: string): void {
        try {
            const udid = this.getBootedDevice();
            if (udid) {
                execSync(`xcrun simctl openurl "${udid}" "${url}"`, {
                    encoding: 'utf8',
                });
                console.log(`🔗 Opened URL: ${url}`);
            }
        } catch (e: any) {
            console.error(`Failed to open URL: ${e.message}`);
        }
    },

    /**
     * Trigger memory warning in simulator
     */
    triggerMemoryWarning(): void {
        try {
            const udid = this.getBootedDevice();
            if (udid) {
                execSync(
                    `xcrun simctl notify_post "${udid}" com.chaos.mobile UIApplicationDidReceiveMemoryWarningNotification`,
                    { encoding: 'utf8' }
                );
                console.log('⚠️ Memory warning triggered');
            }
        } catch (e: any) {
            console.error(`Failed to trigger memory warning: ${e.message}`);
        }
    },

    /**
     * Set simulator appearance (dark/light mode)
     */
    setAppearance(mode: 'dark' | 'light'): void {
        try {
            const udid = this.getBootedDevice();
            if (udid) {
                execSync(`xcrun simctl ui "${udid}" appearance ${mode}`, {
                    encoding: 'utf8',
                });
                console.log(`🎨 Appearance set to: ${mode}`);
            }
        } catch (e) {
            // Ignore
        }
    },

    /**
     * Set battery state in simulator
     */
    setBatteryState(state: 'charging' | 'charged' | 'discharging', level: number): void {
        try {
            const udid = this.getBootedDevice();
            if (udid) {
                execSync(
                    `xcrun simctl status_bar "${udid}" override --batteryState ${state} --batteryLevel ${level}`,
                    { encoding: 'utf8' }
                );
                console.log(`🔋 Battery set: ${state} at ${level}%`);
            }
        } catch (e) {
            // Ignore
        }
    },
};

// ───────────────────────────────────────────
// Docker Helpers
// ───────────────────────────────────────────

export const docker = {
    /**
     * Kill a Docker container
     */
    kill(containerName: string): boolean {
        try {
            const running = execSync(`docker ps -q -f name=${containerName}`, {
                encoding: 'utf8',
            }).trim();
            if (running) {
                execSync(`docker kill ${containerName}`);
                console.log(`💀 Container killed: ${containerName}`);
                return true;
            }
            console.log(`⚠️ Container not running: ${containerName}`);
            return false;
        } catch (e: any) {
            console.error(`Docker kill failed: ${e.message}`);
            return false;
        }
    },

    /**
     * Wait for a container to become healthy
     */
    async waitForHealth(containerName: string, timeoutMs: number = 30000): Promise<boolean> {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            try {
                const health = execSync(
                    `docker inspect --format='{{.State.Health.Status}}' ${containerName}`,
                    { encoding: 'utf8' }
                ).trim();
                if (health === 'healthy') {
                    console.log(`✅ Container healthy: ${containerName}`);
                    return true;
                }
            } catch (e) {
                // Container might not exist yet
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        console.log(`⏰ Container health timeout: ${containerName}`);
        return false;
    },

    /**
     * Check if container is running
     */
    isRunning(containerName: string): boolean {
        try {
            const result = execSync(
                `docker ps -q -f name=${containerName}`,
                { encoding: 'utf8' }
            ).trim();
            return result.length > 0;
        } catch {
            return false;
        }
    },
};

// ───────────────────────────────────────────
// MS Health Helpers
// ───────────────────────────────────────────

export const msHealth = {
    /**
     * Wait for the microservice API to be healthy
     */
    async waitForReady(timeoutMs: number = 30000): Promise<boolean> {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            try {
                const res = await fetch(`${MS_URL}/actuator/health`);
                if (res.ok) {
                    console.log('✅ Microservice is healthy');
                    return true;
                }
            } catch {
                // Not ready yet
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        console.log('⏰ Microservice health timeout');
        return false;
    },
};
