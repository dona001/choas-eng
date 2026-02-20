'use strict';

/**
 * Mobile Chaos — Custom Extent-Style HTML Reporter
 *
 * Mirrors the API ChaosTests.java ExtentSparkReporter:
 *   - Dark theme
 *   - System info block (Device, Platform, Timestamp, Detox Version)
 *   - Per-test: EXPECTATION → steps → ACTUAL → PASS/FAIL
 *   - Screenshots embedded as Base64 inline images
 *   - Failure reason + stack trace visible in the UI
 *
 * Implements the Jest Custom Reporter interface.
 */

const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.resolve(__dirname, '../../e2e/reports');
const REPORT_PATH = path.join(REPORT_DIR, 'extent-report.html');
const STATE_FILE = path.join(REPORT_DIR, '.test-state.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

function readState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        }
    } catch (_) { }
    return {};
}

function encodeScreenshot(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath);
            return `data:image/png;base64,${data.toString('base64')}`;
        }
    } catch (_) { }
    return null;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

function parseLogs(logs) {
    if (!logs || !logs.length) return [];
    return logs.map(entry => {
        const msg = typeof entry === 'string' ? entry : (entry.message || '');
        return msg;
    });
}

// ── HTML Generation ───────────────────────────────────────────────────────────

function buildStepHtml(msg) {
    const escaped = escapeHtml(msg);
    if (msg.startsWith('✅') || msg.startsWith('PASS')) {
        return `<div class="step step-pass"><span class="step-icon">✅</span> ${escaped}</div>`;
    } else if (msg.startsWith('❌') || msg.startsWith('FAIL')) {
        return `<div class="step step-fail"><span class="step-icon">❌</span> ${escaped}</div>`;
    } else if (msg.startsWith('🔵') || msg.startsWith('EXPECTATION')) {
        return `<div class="step step-info"><span class="step-icon">🔵</span> ${escaped}</div>`;
    } else if (msg.startsWith('⚡') || msg.startsWith('Chaos')) {
        return `<div class="step step-chaos"><span class="step-icon">⚡</span> ${escaped}</div>`;
    } else if (msg.startsWith('🧹') || msg.startsWith('Cleanup')) {
        return `<div class="step step-cleanup"><span class="step-icon">🧹</span> ${escaped}</div>`;
    } else if (msg.startsWith('📸')) {
        return ''; // skip screenshot log lines — we embed the image directly
    } else {
        return `<div class="step step-default">${escaped}</div>`;
    }
}

function buildTestCard(testResult, state) {
    const { title, status, duration, failureMessages, ancestorTitles } = testResult;
    const fullName = [...(ancestorTitles || []), title].join(' ');
    const isPassed = status === 'passed';
    const isFailed = status === 'failed';
    const isSkipped = status === 'pending' || status === 'skipped' || status === 'todo';

    const statusClass = isPassed ? 'pass' : isFailed ? 'fail' : 'skip';
    const statusLabel = isPassed ? 'PASS' : isFailed ? 'FAIL' : 'SKIP';
    const statusIcon = isPassed ? '✅' : isFailed ? '❌' : '⏭';

    // Logs captured during this test
    const testState = state[fullName] || {};
    const logs = parseLogs(testState.logs || []);
    const screenshotData = testState.screenshotBase64;

    const stepsHtml = logs.map(buildStepHtml).filter(Boolean).join('\n');

    // Failure details
    let failureHtml = '';
    if (isFailed && failureMessages && failureMessages.length > 0) {
        const msg = failureMessages[0];
        // Extract the first meaningful line (the actual error)
        const lines = msg.split('\n').filter(l => l.trim());
        const headline = escapeHtml(lines[0] || msg);
        const stackTrace = escapeHtml(lines.slice(1).join('\n'));
        failureHtml = `
            <div class="failure-block">
                <div class="failure-headline">❌ ${headline}</div>
                ${stackTrace ? `
                <details class="stack-trace">
                    <summary>Stack Trace</summary>
                    <pre>${stackTrace}</pre>
                </details>` : ''}
            </div>`;
    }

    // Screenshot block
    const screenshotHtml = screenshotData ? `
        <div class="screenshot-block">
            <div class="screenshot-label">📸 Evidence — ${escapeHtml(title)}</div>
            <img class="screenshot-img" src="${screenshotData}" alt="Screenshot: ${escapeHtml(title)}" />
        </div>` : '';

    return `
    <div class="test-card test-${statusClass}" id="test-${encodeURIComponent(fullName)}">
        <div class="test-header" onclick="toggleCard(this)">
            <span class="status-badge badge-${statusClass}">${statusIcon} ${statusLabel}</span>
            <span class="test-title">${escapeHtml(title)}</span>
            <span class="test-duration">${formatDuration(duration || 0)}</span>
            <span class="toggle-icon">▼</span>
        </div>
        <div class="test-body">
            ${stepsHtml ? `<div class="steps-block">${stepsHtml}</div>` : ''}
            ${failureHtml}
            ${screenshotHtml}
        </div>
    </div>`;
}

function buildSuiteCard(suiteResult, state) {
    const { testFilePath, testResults, perfStats } = suiteResult;
    const suiteName = path.basename(testFilePath, '.ts');
    const total = testResults.length;
    const passed = testResults.filter(t => t.status === 'passed').length;
    const failed = testResults.filter(t => t.status === 'failed').length;
    const skipped = total - passed - failed;
    const suiteStatus = failed > 0 ? 'fail' : 'pass';
    const duration = perfStats ? (perfStats.end - perfStats.start) : 0;

    const layer = suiteName.includes('layer1') ? 'Layer 1 — App-Level Chaos'
        : suiteName.includes('layer2') ? 'Layer 2 — Full-Stack Integration (Toxiproxy)'
            : suiteName.includes('layer3') ? 'Layer 3 — Mobile-Specific Chaos'
                : suiteName;

    const testsHtml = testResults.map(t => buildTestCard(t, state)).join('\n');

    return `
    <div class="suite-card suite-${suiteStatus}">
        <div class="suite-header">
            <div class="suite-title">📱 ${escapeHtml(layer)}</div>
            <div class="suite-stats">
                <span class="stat stat-pass">✅ ${passed} Passed</span>
                <span class="stat stat-fail">❌ ${failed} Failed</span>
                ${skipped > 0 ? `<span class="stat stat-skip">⏭ ${skipped} Skipped</span>` : ''}
                <span class="stat stat-time">⏱ ${formatDuration(duration)}</span>
            </div>
        </div>
        <div class="suite-body">
            ${testsHtml}
        </div>
    </div>`;
}

function buildReport(results, state, runMeta) {
    const { testResults, numPassedTests, numFailedTests, numTotalTests, startTime } = results;
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const overallStatus = numFailedTests > 0 ? 'FAIL' : 'PASS';
    const overallClass = numFailedTests > 0 ? 'fail' : 'pass';

    const suitesHtml = testResults.map(s => buildSuiteCard(s, state)).join('\n');

    const systemInfo = runMeta || {};
    const systemInfoRows = [
        ['Environment', 'Chaos-Infra (Mobile)'],
        ['Platform', systemInfo.platform || 'iOS'],
        ['Device', systemInfo.device || 'iPhone Simulator'],
        ['Detox Version', systemInfo.detoxVersion || 'N/A'],
        ['Timestamp', systemInfo.timestamp || new Date().toISOString()],
        ['Total Duration', formatDuration(totalDuration)],
    ].map(([k, v]) => `<tr><td class="si-key">${k}</td><td class="si-val">${escapeHtml(v)}</td></tr>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Mobile Chaos — Resilience Engineering Dashboard</title>
<style>
/* ── Reset & Base ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: #1a1a2e;
    color: #e0e0e0;
    min-height: 100vh;
}

/* ── Header ── */
.report-header {
    background: linear-gradient(135deg, #16213e 0%, #0f3460 100%);
    border-bottom: 3px solid #e94560;
    padding: 28px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.report-title { font-size: 1.6rem; font-weight: 700; color: #fff; }
.report-subtitle { font-size: 0.85rem; color: #a0b4c8; margin-top: 4px; }
.overall-badge {
    font-size: 1.1rem; font-weight: 700; padding: 10px 24px;
    border-radius: 6px; letter-spacing: 1px;
}
.overall-badge.pass { background: #1a5c2e; color: #4caf50; border: 2px solid #4caf50; }
.overall-badge.fail { background: #5c1a1a; color: #f44336; border: 2px solid #f44336; }

/* ── Summary Bar ── */
.summary-bar {
    background: #16213e;
    padding: 16px 40px;
    display: flex;
    gap: 32px;
    border-bottom: 1px solid #2a2a4a;
}
.summary-item { display: flex; flex-direction: column; align-items: center; }
.summary-num { font-size: 1.8rem; font-weight: 700; }
.summary-label { font-size: 0.75rem; color: #a0b4c8; text-transform: uppercase; letter-spacing: 1px; }
.summary-num.pass { color: #4caf50; }
.summary-num.fail { color: #f44336; }
.summary-num.total { color: #64b5f6; }
.summary-num.time { color: #ffb74d; }

/* ── System Info ── */
.system-info {
    margin: 24px 40px;
    background: #16213e;
    border: 1px solid #2a2a4a;
    border-radius: 8px;
    overflow: hidden;
}
.system-info-title {
    background: #0f3460;
    padding: 10px 16px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #64b5f6;
    text-transform: uppercase;
    letter-spacing: 1px;
}
.system-info table { width: 100%; border-collapse: collapse; }
.si-key, .si-val { padding: 8px 16px; font-size: 0.85rem; border-bottom: 1px solid #1a1a3a; }
.si-key { color: #a0b4c8; width: 180px; }
.si-val { color: #e0e0e0; font-family: 'Courier New', monospace; }

/* ── Main Content ── */
.content { padding: 0 40px 40px; }

/* ── Suite Card ── */
.suite-card {
    margin-bottom: 28px;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #2a2a4a;
}
.suite-card.suite-fail { border-color: #5c1a1a; }
.suite-card.suite-pass { border-color: #1a3a2a; }
.suite-header {
    background: #16213e;
    padding: 14px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.suite-title { font-size: 1rem; font-weight: 600; color: #64b5f6; }
.suite-stats { display: flex; gap: 16px; font-size: 0.82rem; }
.stat { padding: 3px 10px; border-radius: 12px; font-weight: 600; }
.stat-pass { background: #1a3a2a; color: #4caf50; }
.stat-fail { background: #3a1a1a; color: #f44336; }
.stat-skip { background: #2a2a1a; color: #ffb74d; }
.stat-time { background: #1a2a3a; color: #64b5f6; }
.suite-body { padding: 12px; background: #12122a; display: flex; flex-direction: column; gap: 10px; }

/* ── Test Card ── */
.test-card {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #2a2a4a;
}
.test-card.test-pass { border-color: #2a4a2a; }
.test-card.test-fail { border-color: #4a2a2a; }
.test-card.test-skip { border-color: #4a4a2a; }
.test-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;
}
.test-card.test-pass .test-header { background: #1a2e1a; }
.test-card.test-fail .test-header { background: #2e1a1a; }
.test-card.test-skip .test-header { background: #2e2e1a; }
.test-header:hover { filter: brightness(1.15); }
.status-badge {
    font-size: 0.72rem; font-weight: 700; padding: 3px 10px;
    border-radius: 4px; letter-spacing: 0.5px; white-space: nowrap;
}
.badge-pass { background: #1a5c2e; color: #4caf50; }
.badge-fail { background: #5c1a1a; color: #f44336; }
.badge-skip { background: #5c5c1a; color: #ffb74d; }
.test-title { flex: 1; font-size: 0.9rem; color: #e0e0e0; }
.test-duration { font-size: 0.78rem; color: #a0b4c8; white-space: nowrap; }
.toggle-icon { color: #a0b4c8; font-size: 0.75rem; transition: transform 0.2s; }
.toggle-icon.open { transform: rotate(180deg); }

.test-body {
    display: none;
    padding: 14px 16px;
    background: #0f0f1e;
    border-top: 1px solid #2a2a4a;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* ── Steps ── */
.steps-block { display: flex; flex-direction: column; gap: 4px; }
.step {
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 0.83rem;
    font-family: 'Courier New', monospace;
    border-left: 3px solid transparent;
}
.step-pass   { background: #0d1f0d; border-color: #4caf50; color: #a5d6a7; }
.step-fail   { background: #1f0d0d; border-color: #f44336; color: #ef9a9a; }
.step-info   { background: #0d1520; border-color: #64b5f6; color: #90caf9; }
.step-chaos  { background: #1a1a0d; border-color: #ffb74d; color: #ffe082; }
.step-cleanup{ background: #0d1a1a; border-color: #80cbc4; color: #b2dfdb; }
.step-default{ background: #1a1a2e; border-color: #555; color: #ccc; }

/* ── Failure Block ── */
.failure-block {
    background: #1f0d0d;
    border: 1px solid #f44336;
    border-radius: 6px;
    padding: 14px;
}
.failure-headline {
    font-size: 0.88rem;
    color: #ef9a9a;
    font-weight: 600;
    margin-bottom: 8px;
    word-break: break-word;
}
.stack-trace {
    margin-top: 8px;
}
.stack-trace summary {
    font-size: 0.78rem;
    color: #a0b4c8;
    cursor: pointer;
    padding: 4px 0;
}
.stack-trace pre {
    margin-top: 8px;
    font-size: 0.75rem;
    color: #888;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 200px;
    overflow-y: auto;
    background: #0a0a18;
    padding: 10px;
    border-radius: 4px;
}

/* ── Screenshot ── */
.screenshot-block {
    border: 1px solid #2a2a4a;
    border-radius: 6px;
    overflow: hidden;
}
.screenshot-label {
    background: #16213e;
    padding: 8px 12px;
    font-size: 0.78rem;
    color: #64b5f6;
    font-weight: 600;
}
.screenshot-img {
    display: block;
    max-width: 100%;
    max-height: 500px;
    object-fit: contain;
    background: #000;
    cursor: zoom-in;
}
.screenshot-img:hover { opacity: 0.9; }

/* ── Footer ── */
.report-footer {
    text-align: center;
    padding: 20px;
    font-size: 0.75rem;
    color: #555;
    border-top: 1px solid #2a2a4a;
    margin-top: 20px;
}
</style>
</head>
<body>

<div class="report-header">
    <div>
        <div class="report-title">📱 Resilience Engineering Dashboard</div>
        <div class="report-subtitle">Mobile Chaos Engineering — Detox + iOS Simulator</div>
    </div>
    <div class="overall-badge ${overallClass}">${overallStatus}</div>
</div>

<div class="summary-bar">
    <div class="summary-item">
        <span class="summary-num total">${numTotalTests}</span>
        <span class="summary-label">Total</span>
    </div>
    <div class="summary-item">
        <span class="summary-num pass">${numPassedTests}</span>
        <span class="summary-label">Passed</span>
    </div>
    <div class="summary-item">
        <span class="summary-num fail">${numFailedTests}</span>
        <span class="summary-label">Failed</span>
    </div>
    <div class="summary-item">
        <span class="summary-num time">${formatDuration(totalDuration)}</span>
        <span class="summary-label">Duration</span>
    </div>
</div>

<div class="system-info">
    <div class="system-info-title">⚙ System Info</div>
    <table>${systemInfoRows}</table>
</div>

<div class="content">
    ${suitesHtml}
</div>

<div class="report-footer">
    Generated by Mobile Chaos Extent Reporter · ${new Date().toUTCString()}
</div>

<script>
function toggleCard(header) {
    const body = header.nextElementSibling;
    const icon = header.querySelector('.toggle-icon');
    const isOpen = body.style.display === 'flex';
    body.style.display = isOpen ? 'none' : 'flex';
    if (icon) icon.classList.toggle('open', !isOpen);
}

// Auto-expand failed tests on load
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.test-card.test-fail .test-header').forEach(h => {
        const body = h.nextElementSibling;
        const icon = h.querySelector('.toggle-icon');
        body.style.display = 'flex';
        if (icon) icon.classList.add('open');
    });
    // Collapse passed tests by default
    document.querySelectorAll('.test-card.test-pass .test-body').forEach(b => {
        b.style.display = 'none';
    });
});

// Screenshot zoom
document.querySelectorAll('.screenshot-img').forEach(img => {
    img.addEventListener('click', () => {
        const w = window.open('');
        w.document.write('<img src="' + img.src + '" style="max-width:100%;"/>');
    });
});
</script>
</body>
</html>`;
}

// ── Jest Reporter Class ───────────────────────────────────────────────────────

class ExtentReporter {
    constructor(globalConfig, options) {
        this._globalConfig = globalConfig;
        this._options = options || {};
        this._results = null;
        this._runMeta = null;
    }

    onRunStart(results, options) {
        // Ensure report directory exists
        if (!fs.existsSync(REPORT_DIR)) {
            fs.mkdirSync(REPORT_DIR, { recursive: true });
        }
        // Clear state file at start of run
        fs.writeFileSync(STATE_FILE, JSON.stringify({}), 'utf8');
    }

    onTestResult(test, testSuiteResult, aggregatedResult) {
        // Read run metadata written by setup.ts
        const state = readState();
        if (state.__meta__ && !this._runMeta) {
            this._runMeta = state.__meta__;
        }
    }

    onRunComplete(contexts, results) {
        const state = readState();
        if (state.__meta__) {
            this._runMeta = state.__meta__;
        }

        try {
            const html = buildReport(results, state, this._runMeta);
            fs.writeFileSync(REPORT_PATH, html, 'utf8');
            console.log(`\n📊 Extent Report generated: ${REPORT_PATH}\n`);

            // Clean up state file
            if (fs.existsSync(STATE_FILE)) {
                fs.unlinkSync(STATE_FILE);
            }
        } catch (err) {
            console.error('❌ Failed to generate Extent Report:', err);
        }
    }

    getLastError() { }
}

module.exports = ExtentReporter;
