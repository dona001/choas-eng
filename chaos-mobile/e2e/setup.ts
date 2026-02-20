import { device } from 'detox';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup for Detox tests — Extent Report integration
 *
 * Writes per-test state (logs + screenshot path + metadata) to a shared
 * JSON file that the custom extent-reporter.js reads at onRunComplete time.
 */

const REPORT_DIR = path.resolve(__dirname, '../e2e/reports');
const STATE_FILE = path.join(REPORT_DIR, '.test-state.json');

// ── State helpers ─────────────────────────────────────────────────────────────

function readState(): Record<string, any> {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        }
    } catch (_) { }
    return {};
}

function writeState(state: Record<string, any>) {
    try {
        if (!fs.existsSync(REPORT_DIR)) {
            fs.mkdirSync(REPORT_DIR, { recursive: true });
        }
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to write test state:', e);
    }
}

// ── Log capture ───────────────────────────────────────────────────────────────

// We intercept console.log to capture test step messages per test
const _originalLog = console.log.bind(console);
let _currentLogs: string[] = [];

const _patchedLog = (...args: any[]) => {
    const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    _currentLogs.push(msg);
    _originalLog(...args);
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
    // Attach execution metadata to state
    try {
        const detoxVersion = require('detox/package.json').version;
        const meta = {
            device: device.name,
            platform: device.getPlatform(),
            timestamp: new Date().toISOString(),
            detoxVersion,
        };
        const state = readState();
        state.__meta__ = meta;
        writeState(state);
        console.log(`📋 Execution Metadata: ${JSON.stringify(meta)}`);
    } catch (e) {
        console.error('Failed to attach metadata:', e);
    }
});

beforeEach(async () => {
    // Reset log capture for this test
    _currentLogs = [];
    console.log = _patchedLog;
});

afterEach(async () => {
    // Restore original console.log
    console.log = _originalLog;

    // Resolve test name
    let testName = 'Unknown Test';
    try {
        // @ts-ignore
        const { expect: jestExpect } = require('@jest/globals');
        testName = jestExpect?.getState?.()?.currentTestName || 'Unknown Test';
    } catch (_) {
        const g = global as any;
        testName = g.expect?.getState?.()?.currentTestName || 'Unknown Test';
    }

    // Capture screenshot and encode to Base64
    let screenshotBase64: string | null = null;
    try {
        const screenshotPath = await device.takeScreenshot(testName);
        if (fs.existsSync(screenshotPath)) {
            const data = fs.readFileSync(screenshotPath);
            screenshotBase64 = `data:image/png;base64,${data.toString('base64')}`;
            // Optional: delete temp file now that we have it in memory
            fs.unlinkSync(screenshotPath);
        }
        _originalLog(`📸 Screenshot captured and encoded for: ${testName}`);
    } catch (e) {
        _originalLog(`Failed to capture screenshot for ${testName}:`, e);
    }

    // Write state for this test (logs + screenshot)
    const state = readState();
    state[testName] = {
        screenshotBase64,
        logs: [..._currentLogs],
    };
    writeState(state);
});
