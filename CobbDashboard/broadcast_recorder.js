const fs = require('fs');
const path = require('path');

const LEDGER_PATH = path.join(__dirname, 'broadcast_sent_ledger.json');

async function syncLedger() {
    try {
        const res = await fetch('http://localhost:5000/api/broadcast/status');
        const data = await res.json();
        const logs = data.logs || [];

        let ledger = {};
        if (fs.existsSync(LEDGER_PATH)) {
            try {
                ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
            } catch (e) {}
        }

        let newCount = 0;
        logs.forEach(log => {
            const match = log.match(/✅ Sent offer to (.+?) \((\d+)\)/);
            if (match) {
                const name = match[1].trim();
                const phone = match[2].trim();
                const cleanPhone = phone.slice(-10);
                if (!ledger[cleanPhone]) {
                    ledger[cleanPhone] = {
                        name,
                        phone: cleanPhone,
                        formattedPhone: phone,
                        sentAt: new Date().toISOString()
                    };
                    newCount++;
                }
            }
        });

        if (newCount > 0) {
            fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), 'utf8');
            console.log(`[LEDGER SYNC] Recorded ${newCount} new contacts. Total saved: ${Object.keys(ledger).length}`);
        }

        // If broadcast has stopped or finished
        if (!data.isRunning && data.status !== 'running') {
            console.log('[LEDGER SYNC] Broadcast is no longer running. Final ledger saved.');
        }
    } catch (e) {
        // server might be restarting or unreachable
    }
}

// Initial sync
syncLedger();

// Sync every 60 seconds (Balanced mode)
const interval = setInterval(syncLedger, 60000);

