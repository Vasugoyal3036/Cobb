const fs = require('fs');

// --- server.js cleanup ---
let serverCode = fs.readFileSync('d:/cobbbb/CobbDashboard/server.js', 'utf8');

const engineStart = serverCode.indexOf('    // --- AUTOMATIC EOD CLOSING DISPATCH & RECOVERY ENGINE ---');
const engineEnd = serverCode.indexOf('    // --- 1 MINUTE LOOP FOR LIVE CLOUD SYNC & AUTO EOD ---');

if (engineStart !== -1 && engineEnd !== -1) {
    serverCode = serverCode.substring(0, engineStart) + serverCode.substring(engineEnd);
}

const hookStart = serverCode.indexOf("['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT'].forEach(signal => {");
if (hookStart !== -1) {
    const hookEnd = serverCode.indexOf('    });\n});', hookStart);
    if (hookEnd !== -1) {
        serverCode = serverCode.substring(0, hookStart) + serverCode.substring(hookEnd + 11);
    }
}

fs.writeFileSync('d:/cobbbb/CobbDashboard/server.js', serverCode);
console.log('server.js cleaned');

// --- cloud_sync.js cleanup ---
let syncCode = fs.readFileSync('d:/cobbbb/CobbDashboard/cloud_sync.js', 'utf8');

// The grep found: { url: "/api/reports/eod-summary", docName: "reports_eod-summary" },
syncCode = syncCode.replace(/\s*\{\s*url:\s*["']\/api\/reports\/eod-summary["'],[^}]+\},/g, '');

fs.writeFileSync('d:/cobbbb/CobbDashboard/cloud_sync.js', syncCode);
console.log('cloud_sync.js cleaned');

