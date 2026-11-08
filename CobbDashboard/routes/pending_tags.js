const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sql, createRequest } = require('../db');

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

// --- Barcode Normalization & Duplication Prevention Helpers ---
function normalizeBarcode(val) {
    if (!val) return '';
    return String(val).trim().toUpperCase();
}

function cleanBarcodeDigits(val) {
    const norm = normalizeBarcode(val).replace(/[\s\-_]/g, '');
    if (/^0+$/.test(norm)) return '0';
    return norm.replace(/^0+/, '');
}

function isBarcodeDuplicate(b1, b2) {
    const s1 = normalizeBarcode(b1);
    const s2 = normalizeBarcode(b2);
    if (!s1 || !s2) return false;
    if (s1 === s2) return true;

    const c1 = cleanBarcodeDigits(b1);
    const c2 = cleanBarcodeDigits(b2);
    if (c1 && c2 && c1 === c2) return true;

    return false;
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

        // Customer Hold Batches calculation
        const customerHoldTags = activeTags.filter(t => t.holdForCustomer === true);
        const generalActiveTags = activeTags.filter(t => !t.holdForCustomer);

        const holdBatchesMap = {};
        for (const t of customerHoldTags) {
            const batchKey = t.holdBatchId || ('cust_' + (t.holdCustomerPhone || t.holdCustomerName || 'unnamed'));
            if (!holdBatchesMap[batchKey]) {
                holdBatchesMap[batchKey] = {
                    batchId: batchKey,
                    customerName: t.holdCustomerName || t.customerName || 'Valued Customer',
                    customerPhone: t.holdCustomerPhone || t.customerPhone || '',
                    bagNo: t.holdBagNo || '',
                    notes: t.holdNotes || t.notes || '',
                    createdAt: t.holdCreatedAt || t.createdAt,
                    count: 0,
                    totalMrp: 0,
                    totalCollected: 0,
                    tags: []
                };
            }
            holdBatchesMap[batchKey].count += 1;
            holdBatchesMap[batchKey].totalMrp += (Number(t.mrp) || 0);
            holdBatchesMap[batchKey].totalCollected += (Number(t.soldPrice) || 0);
            holdBatchesMap[batchKey].tags.push(t);
        }
        const customerHolds = Object.values(holdBatchesMap).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
            customerHolds,
            summary: {
                totalTags: tags.length,
                activeCount: activeTags.length,
                generalActiveCount: generalActiveTags.length,
                customerHoldCount: customerHoldTags.length,
                customerHoldBagsCount: customerHolds.length,
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

        const candidateBarcode = String(barcode || articleNo || '').trim();
        if (!candidateBarcode) {
            return res.status(400).json({ success: false, error: 'Barcode or Article No is required' });
        }

        const tags = readTags();

        // 1. Duplication & Billed Prevention in existing tags
        const existingTag = tags.find(t => isBarcodeDuplicate(t.barcode, candidateBarcode));
        if (existingTag) {
            if (existingTag.status === 'billed') {
                return res.status(409).json({
                    success: false,
                    duplicate: true,
                    billed: true,
                    error: `Already Billed: Barcode "${candidateBarcode}" has already been billed in POS (Bill #${existingTag.billedInBillNo || 'POS-BILL'} on ${existingTag.billedAt ? new Date(existingTag.billedAt).toLocaleDateString('en-IN') : 'earlier'})! Billed items cannot be re-added as pending tags.`,
                    existingTag
                });
            }
            if (existingTag.status === 'active') {
                return res.status(409).json({
                    success: false,
                    duplicate: true,
                    error: `Duplicate Barcode: An active pending tag with barcode "${existingTag.barcode}" (${existingTag.articleName || 'Item'}, ₹${existingTag.mrp || 0}) is already on the pending rack! (Tag #${existingTag.id}). Similar or duplicate barcode cannot be added.`,
                    existingTag
                });
            }
        }

        // 2. Duplication & Billed Prevention against live SQL Server POS billing records
        try {
            const cleanDigits = candidateBarcode.replace(/^0+/, '') || candidateBarcode;
            const paddedDigits = candidateBarcode.length < 10 && /^\d+$/.test(candidateBarcode) ? candidateBarcode.padStart(10, '0') : candidateBarcode;

            if (createRequest) {
                const posReq = createRequest();
                posReq.input('bc', sql.NVarChar, candidateBarcode);
                posReq.input('cleanDigits', sql.NVarChar, cleanDigits);
                posReq.input('paddedDigits', sql.NVarChar, paddedDigits);

                const billedPosRes = await posReq.query(`
                    SELECT TOP 1 
                        RTRIM(d.PRODUCT_CODE) as barcode,
                        RTRIM(m.CM_NO) as billNo,
                        CONVERT(varchar, m.CM_TIME, 126) as billTime,
                        ISNULL(d.NET, 0) as netAmount
                    FROM CMD01106 d WITH (NOLOCK)
                    JOIN CMM01106 m WITH (NOLOCK) ON d.CM_ID = m.CM_ID
                    WHERE m.CANCELLED = 0 
                      AND d.QUANTITY > 0
                      AND (d.PRODUCT_CODE = @bc OR d.PRODUCT_CODE = @cleanDigits OR d.PRODUCT_CODE = @paddedDigits)
                    ORDER BY m.CM_TIME DESC
                `);

                if (billedPosRes.recordset && billedPosRes.recordset.length > 0) {
                    const billedRow = billedPosRes.recordset[0];
                    return res.status(409).json({
                        success: false,
                        duplicate: true,
                        billed: true,
                        error: `Already Billed in POS: Barcode "${candidateBarcode}" was already billed in POS (Bill #${billedRow.billNo} on ${new Date(billedRow.billTime).toLocaleDateString('en-IN')})! Cannot add an already billed item as a pending tag.`,
                        billedInfo: billedRow
                    });
                }
            }
        } catch (sqlErr) {
            console.warn('[PendingTags check SQL POS billed error]', sqlErr.message);
        }
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
            holdForCustomer: Boolean(req.body.holdForCustomer),
            holdCustomerName: String(req.body.holdCustomerName || customerName || '').trim(),
            holdCustomerPhone: String(req.body.holdCustomerPhone || customerPhone || '').replace(/[^0-9]/g, '').slice(-10),
            holdBagNo: String(req.body.holdBagNo || '').trim(),
            holdBatchId: String(req.body.holdBatchId || '').trim() || (req.body.holdForCustomer ? ('hold_batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)) : null),
            holdNotes: String(req.body.holdNotes || notes || '').trim(),
            holdCreatedAt: req.body.holdForCustomer ? now.toISOString() : null,
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
        // Exclude tags held for specific customer so they do not mix in generic store combos
        const active = tags.filter(t => t.status === 'active' && !t.holdForCustomer);

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
router.isBarcodeDuplicate = isBarcodeDuplicate;
router.cleanBarcodeDigits = cleanBarcodeDigits;
router.normalizeBarcode = normalizeBarcode;


// POST /api/pending-tags/create-customer-hold — Put multiple tags into a dedicated customer hold bag
router.post('/create-customer-hold', (req, res) => {
    try {
        const { tagIds = [], customerName, customerPhone = '', bagNo = '', notes = '' } = req.body;
        if (!customerName || !customerName.trim()) {
            return res.status(400).json({ success: false, error: 'Customer Name is required for Customer Hold' });
        }
        if (!Array.isArray(tagIds) || tagIds.length === 0) {
            return res.status(400).json({ success: false, error: 'At least one tag must be selected to hold' });
        }

        const tags = readTags();
        const batchId = 'hold_batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const now = new Date().toISOString();

        let modifiedCount = 0;
        for (const tag of tags) {
            if (tagIds.includes(tag.id)) {
                tag.holdForCustomer = true;
                tag.holdBatchId = batchId;
                tag.holdCustomerName = String(customerName).trim();
                tag.holdCustomerPhone = String(customerPhone).replace(/[^0-9]/g, '').slice(-10);
                tag.holdBagNo = String(bagNo || '').trim();
                tag.holdNotes = String(notes || '').trim();
                tag.holdCreatedAt = now;
                modifiedCount++;
            }
        }

        writeTags(tags);
        res.json({
            success: true,
            message: `Held ${modifiedCount} tag(s) for customer "${customerName}" in ${bagNo ? 'Bag #' + bagNo : 'Dedicated Bag'}!`,
            batchId,
            modifiedCount
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/pending-tags/release-customer-hold — Release tags back to the general pending rack
router.post('/release-customer-hold', (req, res) => {
    try {
        const { holdBatchId, tagIds } = req.body;
        if (!holdBatchId && (!Array.isArray(tagIds) || tagIds.length === 0)) {
            return res.status(400).json({ success: false, error: 'holdBatchId or tagIds is required' });
        }

        const tags = readTags();
        let releasedCount = 0;
        for (const tag of tags) {
            const matchesBatch = holdBatchId && tag.holdBatchId === holdBatchId;
            const matchesTag = Array.isArray(tagIds) && tagIds.includes(tag.id);
            if (matchesBatch || matchesTag) {
                tag.holdForCustomer = false;
                tag.holdBatchId = null;
                tag.holdCustomerName = null;
                tag.holdCustomerPhone = null;
                tag.holdBagNo = null;
                tag.holdNotes = null;
                tag.holdCreatedAt = null;
                releasedCount++;
            }
        }

        writeTags(tags);
        res.json({
            success: true,
            message: `Released ${releasedCount} tag(s) back to general pending rack.`,
            releasedCount
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/pending-tags/bill-customer-hold — Mark all tags in a customer hold as billed
router.post('/bill-customer-hold', (req, res) => {
    try {
        const { holdBatchId, billNo = 'HOLD-COMBO', billedAmount } = req.body;
        if (!holdBatchId) {
            return res.status(400).json({ success: false, error: 'holdBatchId is required' });
        }

        const tags = readTags();
        const now = new Date().toISOString();
        let billedCount = 0;
        for (const tag of tags) {
            if (tag.holdBatchId === holdBatchId && tag.status === 'active') {
                tag.status = 'billed';
                tag.billedInBillNo = String(billNo).trim();
                tag.billedAt = now;
                tag.autoResolved = false;
                tag.resolvedAt = now;
                if (billedAmount !== undefined) tag.billedNet = parseFloat(billedAmount);
                billedCount++;
            }
        }

        writeTags(tags);
        res.json({
            success: true,
            message: `Billed ${billedCount} tag(s) for customer hold in ${billNo}`,
            billedCount
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
