const endpoints = [
    { name: 'Auth Login', url: 'http://localhost:5000/api/auth/login', method: 'POST', body: { username: 'admin', password: 'password123' } },
    { name: 'System Health', url: 'http://localhost:5000/api/system/health', method: 'GET' },
    { name: 'Staff Config', url: 'http://localhost:5000/api/staff/config', method: 'GET' },
    { name: 'Staff Leaderboard', url: 'http://localhost:5000/api/staff/leaderboard?period=bundle', method: 'GET' },
    { name: 'Alterations Desk', url: 'http://localhost:5000/api/alterations', method: 'GET' },
    { name: 'Parcels In Transit', url: 'http://localhost:5000/api/parcels/transit', method: 'GET' },
    { name: 'Sales Overview', url: 'http://localhost:5000/api/sales/overview', method: 'GET' },
    { name: 'Sales Live', url: 'http://localhost:5000/api/sales/live?days=7', method: 'GET' },
    { name: 'WhatsApp Status', url: 'http://localhost:3000/status', method: 'GET' },
    { name: 'WhatsApp Bot Status', url: 'http://localhost:3000/bot-status', method: 'GET' },
    { name: 'WhatsApp NPS Status', url: 'http://localhost:3000/nps-status', method: 'GET' }
];

async function checkAll() {
    console.log('====================================================');
    console.log('  COBB LIVE FEATURE & ENDPOINT FUNCTIONAL AUDIT     ');
    console.log('====================================================\n');

    let passedCount = 0;
    let failedCount = 0;

    for (const ep of endpoints) {
        const startTime = Date.now();
        try {
            const options = {
                method: ep.method,
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5000)
            };
            if (ep.body) {
                options.body = JSON.stringify(ep.body);
            }

            const res = await fetch(ep.url, options);
            const text = await res.text();
            const elapsed = Date.now() - startTime;

            let parsed;
            try {
                parsed = JSON.parse(text);
            } catch (e) {
                parsed = text;
            }

            const isOk = res.status >= 200 && res.status < 400;
            const statusSymbol = isOk ? '✅' : '❌';
            if (isOk) passedCount++; else failedCount++;

            let summary = '';
            if (typeof parsed === 'object') {
                if (Array.isArray(parsed)) {
                    summary = `Array(${parsed.length} items)`;
                } else {
                    const keys = Object.keys(parsed).slice(0, 4).join(', ');
                    summary = `{ ${keys} }`;
                }
            } else {
                summary = String(parsed).substring(0, 40);
            }

            console.log(`${statusSymbol} [HTTP ${res.status}] ${ep.name.padEnd(22)} (${elapsed}ms) -> ${summary}`);

        } catch (err) {
            failedCount++;
            console.log(`❌ [ERROR]   ${ep.name.padEnd(22)} -> ${err.message}`);
        }
    }

    console.log('\n====================================================');
    console.log(`TOTAL FEATURES AUDITED: ${endpoints.length} | FUNCTIONAL: ${passedCount} | NOT RESPONDING: ${failedCount}`);
    console.log('====================================================\n');
}

checkAll();
