const fs = require('fs');
let code = fs.readFileSync('d:/cobbbb/CobbDashboard/server.js', 'utf8');

// Section 2: Endpoints
const start1 = code.indexOf('// 2. Comprehensive Store Owner EOD Closing Digest');
const end1 = code.indexOf('// 3. Size Matrix & Inventory Heatmap Endpoint');

// Section 4: Engine
const start2 = code.indexOf('    // --- AUTOMATIC EOD CLOSING DISPATCH & RECOVERY ENGINE ---');
const end2 = code.indexOf('    // --- 1 MINUTE LOOP FOR LIVE CLOUD SYNC & AUTO EOD ---');

console.log({ start1, end1, start2, end2 });

if (start1 !== -1 && end1 !== -1) {
    code = code.substring(0, start1) + code.substring(end1);
}

const start3 = code.indexOf('    // --- AUTOMATIC EOD CLOSING DISPATCH & RECOVERY ENGINE ---');
const end3 = code.indexOf('    // --- 1 MINUTE LOOP FOR LIVE CLOUD SYNC & AUTO EOD ---');

if (start3 !== -1 && end3 !== -1) {
    code = code.substring(0, start3) + code.substring(end3);
}

// Remove rate limiter
code = code.replace(`    '/api/reports/eod-summary': 60,\n`, '');

fs.writeFileSync('d:/cobbbb/CobbDashboard/server.js', code);
console.log('Removed EOD from server.js');
