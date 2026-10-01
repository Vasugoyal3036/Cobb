import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = path.resolve('.');

console.log('====================================================');
console.log('    COBB STORE COUNTER — PRE-FLIGHT DIAGNOSTICS     ');
console.log('====================================================\n');

let issuesCount = 0;

function checkPort(port, name) {
    return new Promise((resolve) => {
        const client = new net.Socket();
        client.setTimeout(800);
        client.on('connect', () => {
            client.destroy();
            console.log(`[PORT]   ✅ Port ${port} (${name}) is active / reachable.`);
            resolve(true);
        });
        client.on('timeout', () => {
            client.destroy();
            console.log(`[PORT]   ⚠️  Port ${port} (${name}) is not responding (Service may be stopped).`);
            resolve(false);
        });
        client.on('error', () => {
            console.log(`[PORT]   ℹ️  Port ${port} (${name}) is free / offline.`);
            resolve(false);
        });
        client.connect(port, '127.0.0.1');
    });
}

function checkFile(relPath, required = true) {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (fs.existsSync(fullPath)) {
        console.log(`[CONFIG] ✅ Found: ${relPath}`);
        return true;
    } else {
        if (required) {
            console.log(`[CONFIG] ❌ Missing Required File: ${relPath}`);
            issuesCount++;
        } else {
            console.log(`[CONFIG] ⚠️  Optional file not found: ${relPath}`);
        }
        return false;
    }
}

function checkSpoolerService() {
    try {
        const status = execSync('powershell -Command "(Get-Service Spooler).Status"', { encoding: 'utf8', timeout: 3000 }).trim();
        if (status.toLowerCase() === 'running') {
            console.log('[PRINT]  ✅ Windows Print Spooler service is RUNNING (Thermal printer ready).');
            return true;
        } else {
            console.log(`[PRINT]  ⚠️  Windows Print Spooler status is: ${status}`);
            return false;
        }
    } catch (e) {
        console.log('[PRINT]  ℹ️  Could not query Print Spooler service.');
        return false;
    }
}

async function runDiagnostics() {
    console.log('--- 1. Critical Environment & Configuration Files ---');
    checkFile('CobbDashboard/.env', true);
    checkFile('CobbDashboard/firebase-admin.json', false);
    checkFile('cobb-ui/package.json', true);
    checkFile('whatsapp_gateway/package.json', true);
    checkFile('package.json', true);

    console.log('\n--- 2. Hardware & Print Service Readiness ---');
    checkSpoolerService();

    console.log('\n--- 3. Local Microservices Port Status ---');
    await checkPort(5000, 'CobbDashboard Backend');
    await checkPort(3000, 'WhatsApp Gateway');
    await checkPort(5173, 'React POS UI Dev Server');

    console.log('\n--- 4. Automated Test Battery Quick Verification ---');
    try {
        execSync('node --test tests/suite6_packaging_smoke.test.js', { stdio: 'pipe' });
        console.log('[TEST]   ✅ Package integrity & Smoke Test: PASSED');
    } catch (e) {
        console.log('[TEST]   ❌ Smoke Test FAILED: ' + e.message);
        issuesCount++;
    }

    console.log('\n====================================================');
    if (issuesCount === 0) {
        console.log(' 🎉 DIAGNOSTICS COMPLETE: All systems configured properly!');
    } else {
        console.log(` ⚠️  DIAGNOSTICS FINISHED WITH ${issuesCount} ISSUE(S). Review logs above.`);
    }
    console.log('====================================================\n');
}

runDiagnostics();
