const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const ALTERATIONS_FILE = path.join(__dirname, '../alterations.json');

// Initialize Firestore if service account exists
let firestoreDb = null;
try {
    const serviceAccountPath = path.join(__dirname, '../firebase-admin.json');
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        const app = getApps().length === 0 
            ? initializeApp({ credential: cert(serviceAccount) }, 'alterations_app')
            : getApps()[0];
        firestoreDb = getFirestore(app);
    }
} catch (e) {
    console.warn('[ALTERATIONS] Firestore admin optional initialization:', e.message);
}

// Helpers for JSON file management
function loadAlterations() {
    try {
        if (!fs.existsSync(ALTERATIONS_FILE)) {
            fs.writeFileSync(ALTERATIONS_FILE, JSON.stringify([], null, 2));
            return [];
        }
        const raw = fs.readFileSync(ALTERATIONS_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        console.error('[ALTERATIONS] Error loading alterations.json:', e.message);
        return [];
    }
}

function saveAlterations(data) {
    try {
        fs.writeFileSync(ALTERATIONS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('[ALTERATIONS] Error saving alterations.json:', e.message);
        return false;
    }
}

// Helper: Format date as YYYY-MM-DD in local time
function getLocalDateString(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatCreatedAt(val) {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (val._seconds) return new Date(val._seconds * 1000).toISOString();
    if (val.toDate && typeof val.toDate === 'function') return val.toDate().toISOString();
    return String(val);
}

// --- 1. GET ALL ALTERATIONS (WITH DAILY, PERIOD & STATUS FILTERS) ---
router.get('/', async (req, res) => {
    try {
        const { date, status, tailor, category, search, storeId } = req.query;
        let items = loadAlterations();

        // Sync from Firestore if available and local list is empty
        if (items.length === 0 && firestoreDb) {
            try {
                const targetStore = storeId || 'DEMO_STORE_001';
                const snap = await firestoreDb.collection(`stores/${targetStore}/alterations`).get();
                snap.forEach(doc => {
                    items.push({ id: doc.id, ...doc.data() });
                });
                if (items.length > 0) {
                    saveAlterations(items);
                }
            } catch (fsErr) {
                console.warn('[ALTERATIONS] Firestore sync warning:', fsErr.message);
            }
        }

        const todayStr = getLocalDateString(0);
        const yesterdayStr = getLocalDateString(-1);

        // Compute unique tailors and categories before filtering
        const tailors = [...new Set(items.map(i => i.tailorName).filter(Boolean))];
        const categories = [...new Set(items.map(i => i.category).filter(Boolean))];

        // Global KPI counts (unfiltered by date for holistic visibility)
        const allDueToday = items.filter(i => 
            i.expectedDate === todayStr && i.status !== 'Completed'
        ).length;

        const allOverdue = items.filter(i => 
            i.expectedDate && i.expectedDate < todayStr && i.status !== 'Completed'
        ).length;

        // Apply Date Filtering
        if (date && date !== 'all') {
            const targetDate = date === 'today' ? todayStr : date === 'yesterday' ? yesterdayStr : date;
            items = items.filter(i => {
                const createdIso = formatCreatedAt(i.createdAt);
                const createdDate = createdIso ? createdIso.split('T')[0] : '';
                return createdDate === targetDate || i.expectedDate === targetDate;
            });
        }

        // Apply Status Filter
        if (status && status !== 'all') {
            items = items.filter(i => (i.status || '').toLowerCase() === status.toLowerCase());
        }

        // Apply Tailor Filter
        if (tailor && tailor !== 'all') {
            items = items.filter(i => (i.tailorName || '').toLowerCase() === tailor.toLowerCase());
        }

        // Apply Category Filter
        if (category && category !== 'all') {
            items = items.filter(i => (i.category || '').toLowerCase() === category.toLowerCase());
        }

        // Apply Search Filter
        if (search && search.trim()) {
            const q = search.toLowerCase().trim();
            items = items.filter(i => 
                (i.customerName || '').toLowerCase().includes(q) ||
                (i.phone || '').includes(q) ||
                (i.tokenNumber || '').toLowerCase().includes(q) ||
                (i.category || '').toLowerCase().includes(q) ||
                (i.tailorName || '').toLowerCase().includes(q) ||
                (i.instructions || '').toLowerCase().includes(q)
            );
        }

        // Sort latest first
        items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        // Summary metrics for current filtered view
        const totalJobs = items.length;
        const pendingJobs = items.filter(i => i.status === 'Pending' || i.status === 'In Progress').length;
        const readyJobs = items.filter(i => i.status === 'Ready for Pickup').length;
        const completedJobs = items.filter(i => i.status === 'Completed').length;
        const totalQty = items.reduce((sum, i) => sum + (parseInt(i.quantity, 10) || 1), 0);

        res.json({
            items,
            summary: {
                totalJobs,
                pendingJobs,
                readyJobs,
                completedJobs,
                dueToday: allDueToday,
                overdue: allOverdue,
                totalQty,
                todayDate: todayStr,
                yesterdayDate: yesterdayStr
            },
            tailors,
            categories
        });
    } catch (err) {
        console.error('[ALTERATIONS] Error in GET /api/alterations:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- 2. CREATE NEW ALTERATION SLIP ---
router.post('/', async (req, res) => {
    try {
        const { customerName, phone, category, quantity, instructions, tailorName, expectedDate, storeId } = req.body;
        const items = loadAlterations();

        const tokenNum = `ALT-${1000 + items.length + 1}`;
        const newSlip = {
            id: tokenNum,
            tokenNumber: tokenNum,
            customerName: (customerName || 'Walk-in Customer').trim(),
            phone: (phone || '').trim(),
            category: category || 'Trouser',
            quantity: parseInt(quantity, 10) || 1,
            instructions: instructions || '',
            tailorName: tailorName || 'Akshat Goyal',
            expectedDate: expectedDate || getLocalDateString(1),
            status: 'Pending',
            createdAt: new Date().toISOString(),
            storeId: storeId || 'DEMO_STORE_001',
            storeName: 'Cobb Garments Pundri'
        };

        items.unshift(newSlip);
        saveAlterations(items);

        // Sync to Firestore if available
        if (firestoreDb) {
            try {
                const targetStore = newSlip.storeId;
                await firestoreDb.collection(`stores/${targetStore}/alterations`).doc(newSlip.id).set(newSlip);
            } catch (fsErr) {
                console.warn('[ALTERATIONS] Firestore write note:', fsErr.message);
            }
        }

        res.status(201).json({ success: true, item: newSlip });
    } catch (err) {
        console.error('[ALTERATIONS] Error in POST /api/alterations:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- 3. UPDATE ALTERATION STATUS OR DETAILS ---
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const items = loadAlterations();

        const index = items.findIndex(i => i.id === id || i.tokenNumber === id);
        if (index === -1) {
            return res.status(404).json({ error: 'Alteration slip not found.' });
        }

        const existing = items[index];
        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        if (updates.status === 'Completed' && existing.status !== 'Completed') {
            updated.completedAt = new Date().toISOString();
        }

        items[index] = updated;
        saveAlterations(items);

        // Sync update to Firestore
        if (firestoreDb) {
            try {
                const targetStore = updated.storeId || 'DEMO_STORE_001';
                await firestoreDb.collection(`stores/${targetStore}/alterations`).doc(id).set(updated, { merge: true });
            } catch (fsErr) {
                console.warn('[ALTERATIONS] Firestore update note:', fsErr.message);
            }
        }

        res.json({ success: true, item: updated });
    } catch (err) {
        console.error('[ALTERATIONS] Error in PUT /api/alterations/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- 4. DELETE ALTERATION SLIP ---
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let items = loadAlterations();

        const itemToDelete = items.find(i => i.id === id || i.tokenNumber === id);
        items = items.filter(i => i.id !== id && i.tokenNumber !== id);
        saveAlterations(items);

        // Remove from Firestore
        if (firestoreDb && itemToDelete) {
            try {
                const targetStore = itemToDelete.storeId || 'DEMO_STORE_001';
                await firestoreDb.collection(`stores/${targetStore}/alterations`).doc(id).delete();
            } catch (fsErr) {
                console.warn('[ALTERATIONS] Firestore delete note:', fsErr.message);
            }
        }

        res.json({ success: true, message: 'Alteration slip deleted.' });
    } catch (err) {
        console.error('[ALTERATIONS] Error in DELETE /api/alterations/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- 5. NOTIFY CUSTOMER VIA WHATSAPP (READY FOR PICKUP) ---
router.post('/:id/notify', async (req, res) => {
    try {
        const { id } = req.params;
        const items = loadAlterations();
        const slip = items.find(i => i.id === id || i.tokenNumber === id);

        if (!slip) {
            return res.status(404).json({ error: 'Slip not found.' });
        }

        const cleanPhone = (slip.phone || '').replace(/[^0-9]/g, '');
        const message = `Greetings from *Cobb Garments, Pundri*! ✂️\n\n` +
            `Dear *${slip.customerName}*,\n` +
            `Your alteration job for *${slip.category}* (Token *#${slip.tokenNumber}*) is now *READY FOR PICKUP*! 🎉\n\n` +
            `📍 *Store:* Cobb Italy, Pundri\n` +
            `Please bring your token slip or show this message at the counter.\n\n` +
            `Thank you for choosing Cobb! 😊`;

        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

        res.json({
            success: true,
            phone: cleanPhone,
            message,
            waUrl
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 6. LEGACY COMPATIBILITY: GET CUSTOMER ALTERATIONS BY PHONE ---
router.get('/customer/:phone', (req, res) => {
    try {
        const rawPhone = (req.params.phone || '').replace(/[^0-9]/g, '');
        const items = loadAlterations();
        const customerAlterations = items.filter(i => {
            const p = (i.phone || '').replace(/[^0-9]/g, '');
            return p.includes(rawPhone) || rawPhone.includes(p);
        });

        res.json({
            success: true,
            phone: rawPhone,
            hasActive: customerAlterations.some(a => a.status !== 'Completed'),
            alterations: customerAlterations
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
