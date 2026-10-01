import { execSync } from 'node:child_process';
import path from 'node:path';

const ROOT_DIR = path.resolve('.');
const UI_DIR = path.join(ROOT_DIR, 'cobb-ui');

const testSuites = [
    {
        name: 'Suite 1: Cloud Sync & Data Integrity',
        cmd: 'node --test tests/suite1_cloud_sync.test.js',
        cwd: ROOT_DIR
    },
    {
        name: 'Suite 2: WhatsApp Gateway Reliability & Queue',
        cmd: 'node --test tests/suite2_whatsapp_gateway.test.js',
        cwd: ROOT_DIR
    },
    {
        name: 'Suite 3: Backend API & Security (CobbDashboard)',
        cmd: 'node --test tests/suite3_backend_api_security.test.js',
        cwd: ROOT_DIR
    },
    {
        name: 'Suite 4: Frontend UI Components (cobb-ui Vitest)',
        cmd: 'npm test',
        cwd: UI_DIR
    },
    {
        name: 'Suite 5: End-to-End Retail Flow Simulation',
        cmd: 'node --test tests/suite5_e2e_flow.test.js',
        cwd: ROOT_DIR
    },
    {
        name: 'Suite 6: Packaging & Deployment Smoke Test',
        cmd: 'node --test tests/suite6_packaging_smoke.test.js',
        cwd: ROOT_DIR
    },
    {
        name: 'Suite 7: WhatsApp Concierge Bot & NPS Bifurcation',
        cmd: 'node --test tests/suite7_whatsapp_concierge.test.js',
        cwd: ROOT_DIR
    },
    {
        name: 'Suite 8: Store Operations (Alterations, Holds & GIT)',
        cmd: 'node --test tests/suite8_store_operations.test.js',
        cwd: ROOT_DIR
    },
    {
        name: 'Suite 9: Thermal Receipt & 80mm Print Layout',
        cmd: 'node --test tests/suite9_thermal_receipt.test.js',
        cwd: ROOT_DIR
    },
    {
        name: 'Suite 10: Chaos, Watchdog Recovery & Load Stress',
        cmd: 'node --test tests/suite10_chaos_and_stress.test.js',
        cwd: ROOT_DIR
    }
];

console.log('====================================================');
console.log('   COBB RETAIL CRM — FULL AUTOMATED TEST RUNNER     ');
console.log('====================================================\n');

const results = [];
let totalPassed = 0;
let totalFailed = 0;

for (let i = 0; i < testSuites.length; i++) {
    const suite = testSuites[i];
    const startTime = Date.now();
    process.stdout.write(`[${i + 1}/${testSuites.length}] Running ${suite.name}... `);

    try {
        execSync(suite.cmd, {
            cwd: suite.cwd,
            stdio: 'pipe',
            encoding: 'utf8'
        });
        const elapsed = Date.now() - startTime;
        console.log(`✅ PASSED (${elapsed}ms)`);
        results.push({ name: suite.name, status: 'PASSED', duration: `${elapsed}ms` });
        totalPassed++;
    } catch (err) {
        const elapsed = Date.now() - startTime;
        console.log(`❌ FAILED (${elapsed}ms)`);
        console.error(err.stdout || err.stderr || err.message);
        results.push({ name: suite.name, status: 'FAILED', duration: `${elapsed}ms` });
        totalFailed++;
    }
}

console.log('\n====================================================');
console.log('                   TEST SUMMARY                     ');
console.log('====================================================');
results.forEach((r, idx) => {
    const symbol = r.status === 'PASSED' ? '✔' : '✖';
    console.log(`${idx + 1}. [${r.status}] ${symbol} ${r.name.padEnd(48)} (${r.duration})`);
});
console.log('====================================================');
console.log(`TOTAL SUITES: ${testSuites.length} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
console.log('====================================================\n');

if (totalFailed > 0) {
    process.exit(1);
}
