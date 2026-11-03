const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sql } = require('../db');

const TAGS_FILE = path.join(__dirname, '..', 'pending_tags.json');

// --- Firestore Cloud Sync Initialization (for Phone Link) ---
let firestoreDb = null;
try {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-admin.json');
    if (fs.existsSync(serviceAccountPath)) {
        const { initializeApp, getApps, cert } = require('firebase-admin/app');
        const { getFirestore } = require('firebase-admin/firestore');
        const serviceAccount = require(serviceAccountPath);
        const fbApp = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
        firestoreDb = getFirestore(fbApp);
    }
} catch (e) {
    console.warn('[PENDING TAGS] Firestore init warning:', e.message);
}

// --- Atomic File Read / Write Helpers ---
function readTags() {
    try {
        if (!fs.existsSync(TAGS_FILE)) return [];
        const raw = fs.readFileSync(TAGS_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

function writeTags(tags) {
    try {
        const tmp = TAGS_FILE + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(tags, null, 2), 'utf8');
        fs.renameSync(tmp, TAGS_FILE);

        // Sync to Cloud Firestore for Phone Link
        if (firestoreDb) {
            try {
                firestoreDb.collection('stores').doc('DEMO_STORE_001').collection('data').doc('pending_tags').set({
                    tags: tags.slice(-300), // persist latest 300
                    activeCount: tags.filter(t => t.status === 'active').length,
                    lastUpdated: new Date().toISOString()
                }, { merge: true }).catch(() => {});
            } catch (e) { }
        }
    } catch (err) {
        console.error('[PENDING TAGS] Error saving tags:', err.message);
    }
}

function generateId() {
    return 'ptag_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

// --- Automatic Billed Detection against SQL Server ---
// Checks if any active pending tag barcodes have been billed in CMD01106 / CMM01106
async function checkAndResolveBilledTags(tags) {
    const activeTags = tags.filter(t => t.status === 'active' && t.barcode);
    if (activeTags.length === 0) return false;

    const barcodes = [...new Set(activeTags.map(t => String(t.barcode).trim()).filter(Boolean))];
    if (barcodes.length === 0) return false;

    try {
        const formattedIn = barcodes.map(b => `'${b.replace(/'/g, "''")}'`).join(',');
        const query = `
            SELECT 
                RTRIM(d.PRODUCT_CODE) as Barcode,
                RTRIM(m.CM_NO) as BillNo,
                CONVERT(varchar, m.CM_TIME, 126) as BillTime,
                ISNULL(d.NET, 0) as BilledNet,
                ISNULL(d.MRP, 0) as BilledMRP,
                ISNULL(d.discount_percentage, 0) as BilledDiscountPct,
                d.QUANTITY as BilledQty
            FROM CMD01106 d WITH (NOLOCK)
            JOIN CMM01106 m WITH (NOLOCK) ON d.CM_ID = m.CM_ID
            WHERE m.CANCELLED = 0 
              AND d.QUANTITY > 0
              AND RTRIM(d.PRODUCT_CODE) IN (${formattedIn})
              AND m.CM_TIME >= DATEADD(day, -7, GETDATE())
            ORDER BY m.CM_TIME DESC
        `;

        const result = await sql.query(query);
        const rows = result.recordset || [];
        if (rows.length === 0) return false;

        let changed = false;

        for (const tag of activeTags) {
            const tagBarcode = String(tag.barcode).trim();
            const tagCreatedMs = new Date(tag.createdAt).getTime();

            // Find matching billed row that was billed after tag was created (with a 2-minute clock skew margin)
            const match = rows.find(r => {
                if (r.Barcode !== tagBarcode) return false;
                const billMs = new Date(r.BillTime).getTime();
                return billMs >= (tagCreatedMs - 120000);
            });

            if (match) {
                tag.status = 'billed';
                tag.billedInBillNo = match.BillNo;
                tag.billedAt = match.BillTime;
                tag.billedNet = match.BilledNet;
                tag.billedMRP = match.BilledMRP;
                tag.autoResolved = true;
                tag.resolvedAt = new Date().toISOString();
                changed = true;
                console.log(`[PENDING TAGS AUTO-RESOLVED] Tag ${tag.barcode} (${tag.articleName}) was billed in ${match.BillNo}!`);
            }
        }

        return changed;
    } catch (err) {
        console.warn('[PENDING TAGS] Error checking billed tags:', err.message);
        return false;
    }
}

// Background auto-resolver runs every 30 seconds
setInterval(async () => {
    try {
        const tags = readTags();
        const changed = await checkAndResolveBilledTags(tags);
        if (changed) writeTags(tags);
    } catch (e) { }
}, 30000);

// --- ROUTES ---

// GET /api/pending-tags — list tags + auto-check and calculate summary metrics
router.get('/', async (req, res) => {
    try {
        let tags = readTags().filter(t => t.status !== 'void');
        
        // Auto-check against SQL Server
        const changed = await checkAndResolveBilledTags(tags);
        if (changed) writeTags(tags);

        const activeTags = tags.filter(t => t.status === 'active');
        const billedTags = tags.filter(t => t.status === 'billed');

        const activeMrpValue = activeTags.reduce((sum, t) => sum + (Number(t.mrp) || 0), 0);
        const activeRealizedValue = activeTags.reduce((sum, t) => sum + (Number(t.soldPrice) || 0), 0);
        const totalDiscountGiven = activeMrpValue - activeRealizedValue;
        const avgDiscountPct = activeTags.length > 0
            ? (activeTags.reduce((sum, t) => sum + (Number(t.discountPercent) || 0), 0) / activeTags.length).toFixed(1)
            : '0.0';

        // Tags billed today
        const todayStr = new Date().toISOString().split('T')[0];
        const billedTodayCount = billedTags.filter(t => {
            const dt = (t.resolvedAt || t.billedAt || '').split('T')[0];
            return dt === todayStr;
        }).length;

        res.json({
            success: true,
            tags: tags.slice(-300).reverse(), // newest first
            summary: {
                totalTags: tags.length,
                activeCount: activeTags.length,
                billedCount: billedTags.length,
                activeMrpValue,
                activeRealizedValue,
                totalDiscountGiven,
                avgDiscountPct,
                billedTodayCount
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/pending-tags/add — create a new pending tag
router.post('/add', async (req, res) => {
    try {
        const {
            barcode,
            articleNo = '',
            articleName = 'Apparel Item',
            size = 'Free',
            color = 'Standard',
            section = 'General',
            mrp = 0,
            discountPercent = 50,
            soldPrice = 0,
            customerName = '',
            customerPhone = '',
            salesperson = 'Cashier',
            notes = ''
        } = req.body;

        if (!barcode && !articleNo) {
            return res.status(400).json({ success: false, error: 'Barcode or Article No is required' });
        }

        const tags = readTags();
        const now = new Date();

        const numMrp = parseFloat(mrp) || 0;
        const numDisc = parseFloat(discountPercent) || 0;
        // If soldPrice is not provided, calculate from MRP and discountPercent
        const calculatedSold = parseFloat(soldPrice) || (numMrp > 0 ? Math.round(numMrp * (1 - (numDisc / 100))) : 0);

        const newTag = {
            id: generateId(),
            barcode: String(barcode || articleNo).trim(),
            articleNo: String(articleNo || '').trim(),
            articleName: String(articleName || 'Apparel Item').trim(),
            size: String(size || 'Free').trim().toUpperCase(),
            color: String(color || 'Standard').trim(),
            section: String(section || 'General').trim(),
            mrp: numMrp,
            discountPercent: numDisc,
            soldPrice: calculatedSold,
            savings: Math.max(0, numMrp - calculatedSold),
            customerName: String(customerName || '').trim(),
            customerPhone: String(customerPhone || '').replace(/[^0-9]/g, '').slice(-10),
            salesperson: String(salesperson || 'Cashier').trim(),
            notes: String(notes || '').trim(),
            status: 'active', // 'active' | 'billed' | 'void'
            createdAt: now.toISOString(),
            date: now.toISOString().split('T')[0],
            billedInBillNo: null,
            billedAt: null,
            autoResolved: false
        };

        // Check immediately if this barcode was ALREADY billed today before adding
        try {
            await checkAndResolveBilledTags([newTag]);
        } catch (e) { }

        tags.push(newTag);
        writeTags(tags);

        res.json({
            success: true,
            message: newTag.status === 'billed'
                ? `Tag added and auto-detected as already billed in ${newTag.billedInBillNo}!`
                : 'Pending tag added successfully.',
            tag: newTag
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/pending-tags/:id/mark-billed — manual resolution
router.post('/:id/mark-billed', (req, res) => {
    try {
        const { billNo = 'MANUAL-COMBO', billedAmount } = req.body;
        const tags = readTags();
        const tag = tags.find(t => t.id === req.params.id);
        if (!tag) return res.status(404).json({ success: false, error: 'Tag not found' });

        tag.status = 'billed';
        tag.billedInBillNo = String(billNo).trim();
        tag.billedAt = new Date().toISOString();
        if (billedAmount !== undefined) tag.billedNet = parseFloat(billedAmount);
        tag.autoResolved = false;
        tag.resolvedAt = new Date().toISOString();

        writeTags(tags);
        res.json({ success: true, message: `Tag marked as billed in ${billNo}`, tag });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/pending-tags/:id — remove or void
router.delete('/:id', (req, res) => {
    try {
        let tags = readTags();
        const tag = tags.find(t => t.id === req.params.id);
        if (!tag) return res.status(404).json({ success: false, error: 'Tag not found' });

        // Mark as void or remove
        tag.status = 'void';
        tag.voidedAt = new Date().toISOString();
        writeTags(tags);

        res.json({ success: true, message: 'Tag removed successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/pending-tags/combos — Smart B1G2 Combo Suggester
// Identifies sets of 3 pending tags in similar categories/MRPs that can be billed together
router.get('/combos', (req, res) => {
    try {
        const tags = readTags();
        const active = tags.filter(t => t.status === 'active');

        // Group by Section / Category or MRP
        const groups = {};
        for (const t of active) {
            const key = t.section || 'General';
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        }

        const combos = [];
        for (const [section, list] of Object.entries(groups)) {
            if (list.length >= 3) {
                // Group in triplets
                for (let i = 0; i + 2 < list.length; i += 3) {
                    const triplet = [list[i], list[i + 1], list[i + 2]];
                    const totalMrp = triplet.reduce((s, x) => s + (Number(x.mrp) || 0), 0);
                    const totalCollected = triplet.reduce((s, x) => s + (Number(x.soldPrice) || 0), 0);
                    combos.push({
                        section,
                        tags: triplet,
                        barcodes: triplet.map(x => x.barcode),
                        totalMrp,
                        totalCollected
                    });
                }
            }
        }

        res.json({ success: true, count: combos.length, combos });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.readTags = readTags;
router.writeTags = writeTags;

module.exports = router;
