const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const HOLDS_FILE = path.join(__dirname, '..', 'holds.json');

// --- Atomic read/write helpers ---
function readHolds() {
    try {
        const raw = fs.readFileSync(HOLDS_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

function writeHolds(holds) {
    const tmp = HOLDS_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(holds, null, 2), 'utf8');
    fs.renameSync(tmp, HOLDS_FILE);
}

function generateId() {
    return 'hold_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

// --- Get WhatsApp sender (injected at startup) ---
let sendWhatsApp = null;
router.setSendWhatsApp = (fn) => { sendWhatsApp = fn; };

// --- Background expiry checker + courtesy ping ---
// Runs every 60 seconds
setInterval(() => {
    try {
        const holds = readHolds();
        const now = new Date();
        let changed = false;

        holds.forEach(hold => {
            if (hold.status !== 'active') return;
            const expiresAt = new Date(hold.expiresAt);
            const msLeft = expiresAt - now;

            // Mark expired
            if (msLeft <= 0) {
                hold.status = 'expired';
                changed = true;
                console.log(`[HoldDesk] Hold ${hold.id} for ${hold.customerName} EXPIRED`);
                return;
            }

            // Send courtesy WhatsApp ping at < 45 min and > 5 min remaining
            const minLeft = Math.floor(msLeft / 60000);
            if (!hold.reminderSent && minLeft <= 45 && minLeft > 5 && hold.customerPhone) {
                hold.reminderSent = true;
                changed = true;
                if (sendWhatsApp) {
                    const msg = `Hello ${hold.customerName}! 👋\n\nYour reserved *${hold.articleName}* (Size ${hold.size}) at Cobb Store is being held until *${expiresAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}* today.\n\nLet us know if you need more time — we'd be happy to assist! 😊\n\n– *Cobb Italy, Pundri*`;
                    sendWhatsApp(hold.customerPhone, msg);
                    console.log(`[HoldDesk] Sent courtesy ping to ${hold.customerPhone}`);
                }
            }
        });

        if (changed) writeHolds(holds);
    } catch (e) {
        console.error('[HoldDesk] Background checker error:', e.message);
    }
}, 60000);

// GET /api/holds — list all holds with time remaining
router.get('/', (req, res) => {
    try {
        const holds = readHolds();
        const now = new Date();
        const enriched = holds.map(h => {
            const expiresAt = new Date(h.expiresAt);
            const msLeft = Math.max(0, expiresAt - now);
            const minLeft = Math.floor(msLeft / 60000);
            return {
                ...h,
                msLeft,
                minLeft,
                isExpiringSoon: h.status === 'active' && minLeft <= 30 && minLeft > 0,
                isExpired: h.status === 'expired' || msLeft === 0
            };
        });
        res.json({ success: true, holds: enriched });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/holds/add — create a new hold
router.post('/add', (req, res) => {
    try {
        const { customerName, customerPhone, articleNo, articleName, size, category, windowHours } = req.body;
        if (!articleName || !windowHours) {
            return res.status(400).json({ success: false, error: 'articleName and windowHours required' });
        }

        const holds = readHolds();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + (parseFloat(windowHours) * 60 * 60 * 1000));

        const hold = {
            id: generateId(),
            customerName: customerName || 'Walk-in Customer',
            customerPhone: customerPhone || '',
            articleNo: articleNo || '',
            articleName,
            size: size || '',
            category: category || '',
            expiresAt: expiresAt.toISOString(),
            status: 'active',
            createdAt: now.toISOString(),
            reminderSent: false
        };

        holds.push(hold);
        writeHolds(holds);
        res.json({ success: true, hold });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /api/holds/:id — release/void a hold
router.delete('/:id', (req, res) => {
    try {
        const holds = readHolds();
        const idx = holds.findIndex(h => h.id === req.params.id);
        if (idx === -1) return res.status(404).json({ success: false, error: 'Hold not found' });
        const hold = holds[idx];
        hold.status = 'released';
        writeHolds(holds);
        res.json({ success: true, hold });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/holds/:id/extend — extend hold by 1 hour
router.post('/:id/extend', (req, res) => {
    try {
        const { hours = 1 } = req.body;
        const holds = readHolds();
        const hold = holds.find(h => h.id === req.params.id);
        if (!hold) return res.status(404).json({ success: false, error: 'Hold not found' });

        const current = new Date(hold.expiresAt);
        const now = new Date();
        const base = current < now ? now : current;
        hold.expiresAt = new Date(base.getTime() + (parseFloat(hours) * 60 * 60 * 1000)).toISOString();
        hold.status = 'active';
        hold.reminderSent = false;
        writeHolds(holds);
        res.json({ success: true, hold });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
