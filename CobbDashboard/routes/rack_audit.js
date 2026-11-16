const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sql, createRequest } = require('../db');
const { normalizeLookupQuery, findMatchingSku, barcodeKey } = require('./stock_check');

const AUDITS_FILE = path.join(__dirname, '..', 'rack_audits.json');
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
    console.warn('[RACK AUDIT] Firestore init warning:', e.message);
}

// --- Presets for Showroom Racks / Bays ---
const PRESET_RACKS = [
    { id: 'bay_formal_shirts', name: "Men's Formal Shirts - Section A", section: 'MENSWEAR', subSection: 'SHIRTS FULL SL' },
    { id: 'bay_casual_shirts', name: "Men's Casual Shirts - Section B", section: 'MENSWEAR', subSection: 'CASUAL FULL SL' },
    { id: 'bay_denim_wall', name: "Denim Wall - Bay 1", section: 'MENSWEAR', subSection: 'DENIM' },
    { id: 'bay_casual_trouser', name: "Casual Trousers & Chinos - Bay 2", section: 'MENSWEAR', subSection: 'CASUAL TROUSER' },
    { id: 'bay_formal_trouser', name: "Formal Trousers - Rack 05", section: 'MENSWEAR', subSection: 'TROUSER- FORMAL' },
    { id: 'bay_blazers', name: "Blazers & Suits - Executive Suite", section: 'MENSWEAR-WN', subSection: 'BLAZER - EX' },
    { id: 'bay_jackets', name: "Winter Jackets - Mid Bay", section: 'MENSWEAR-WN', subSection: 'JACKET H/S - EX' },
    { id: 'bay_sweatshirts', name: "Sweatshirts & Hoodies - Table 03", section: 'MENSWEAR-WN', subSection: 'SWEAT SHIRT EX' },
    { id: 'bay_tshirts', name: "T-Shirts & Polos - Island Bay", section: 'MENSWEAR-SM', subSection: 'T SHIRT HALF SL' },
    { id: 'bay_accessories', name: "Accessories & Belts - Front Counter", section: 'ACCESSORIES', subSection: 'BELTS-MENS-EX' }
];

// --- Read & Write Audits File ---
function readAudits() {
    try {
        if (!fs.existsSync(AUDITS_FILE)) return [];
        const raw = fs.readFileSync(AUDITS_FILE, 'utf8');
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.warn('[RACK AUDIT] Error reading audits file:', err.message);
        return [];
    }
}

function writeAudits(audits) {
    try {
        const safe = Array.isArray(audits) ? audits.slice(-200) : [];
        fs.writeFileSync(AUDITS_FILE, JSON.stringify(safe, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('[RACK AUDIT] Error writing audits file:', err.message);
        return false;
    }
}

// --- Sync to Firestore Phone Link ---
async function syncAuditToCloud(audit) {
    if (!firestoreDb || !audit) return;
    try {
        const storeId = process.env.STORE_ID || 'DEMO_STORE_001';
        const auditDocRef = firestoreDb.collection('stores').doc(storeId).collection('rack_audits').doc(audit.id);
        await auditDocRef.set({
            ...audit,
            syncedAt: new Date().toISOString()
        }, { merge: true });

        const summaryDocRef = firestoreDb.collection('stores').doc(storeId).collection('data').doc('rack_audit_summary');
        await summaryDocRef.set({
            lastAuditId: audit.id,
            lastRackName: audit.rackName,
            lastSection: audit.section,
            lastSubSection: audit.subSection,
            lastAccuracyPct: audit.accuracyPct,
            lastExpectedCount: audit.expectedCount,
            lastScannedCount: audit.scannedCount,
            lastMissingCount: audit.missingCount,
            lastSurpriseCount: audit.surpriseCount,
            lastAuditTime: audit.createdAt,
            updatedAt: new Date().toISOString()
        }, { merge: true });
    } catch (err) {
        console.warn('[RACK AUDIT] Firestore cloud sync error:', err.message);
    }
}

/**
 * 1. GET /api/inventory/rack-audit/sections
 * Returns distinct sections & categories with current physical stock count and preset bays.
 */
router.get('/sections', async (req, res) => {
    try {
        let categories = [];
        try {
            const reqDb = createRequest();
            const result = await reqDb.query(`
                SELECT 
                    ISNULL(s.section_name, 'OTHERS') AS sectionName,
                    ISNULL(s.sub_section_name, 'GENERAL') AS subSectionName,
                    COUNT(DISTINCT s.product_Code) AS skuCount,
                    SUM(ISNULL(p.quantity_in_stock, 0)) AS totalStock
                FROM SKU_NAMES s WITH (NOLOCK)
                INNER JOIN PMT01106 p WITH (NOLOCK) ON s.product_Code = p.product_code
                WHERE p.quantity_in_stock > 0
                  AND s.section_name IS NOT NULL
                GROUP BY s.section_name, s.sub_section_name
                HAVING SUM(ISNULL(p.quantity_in_stock, 0)) > 0
                ORDER BY s.section_name, s.sub_section_name
            `);
            categories = (result.recordset || []).map(r => ({
                section: r.sectionName,
                subSection: r.subSectionName,
                skuCount: Number(r.skuCount || 0),
                totalStock: Number(r.totalStock || 0)
            }));
        } catch (dbErr) {
            console.warn('[RACK AUDIT] Fallback for sections:', dbErr.message);
        }

        // Distinct sections list
        const sections = Array.from(new Set(categories.map(c => c.section)));

        res.json({
            success: true,
            sections,
            categories,
            presets: PRESET_RACKS
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 2. GET /api/inventory/rack-audit/expected
 * Returns all expected in-stock garments for a targeted section / category.
 */
router.get('/expected', async (req, res) => {
    try {
        const section = (req.query.section || '').trim();
        const subSection = (req.query.subSection || '').trim();
        const articleNo = (req.query.articleNo || '').trim();

        if (!section && !subSection && !articleNo) {
            return res.status(400).json({ success: false, message: 'Please select a Section, Category, or Article' });
        }

        const reqDb = createRequest();
        if (section) reqDb.input('sec', sql.NVarChar, section);
        if (subSection) reqDb.input('subSec', sql.NVarChar, subSection);
        if (articleNo) reqDb.input('art', sql.NVarChar, articleNo);

        let whereClauses = ['p.quantity_in_stock > 0'];
        if (section) whereClauses.push('s.section_name = @sec');
        if (subSection) whereClauses.push('s.sub_section_name = @subSec');
        if (articleNo) whereClauses.push('s.article_no LIKE @art + \'%\'');

        const queryStr = `
            SELECT TOP 2500
                RTRIM(s.product_Code) as barcode,
                RTRIM(s.article_no) as articleNo,
                ISNULL(s.article_name, s.section_name) as itemName,
                ISNULL(s.section_name, 'Uncategorized') as sectionName,
                ISNULL(s.sub_section_name, '') as subSectionName,
                ISNULL(s.para1_name, 'Standard') as color,
                ISNULL(s.para2_name, 'Standard') as size,
                ISNULL(s.para2_order, 99) as sizeOrder,
                ISNULL(s.mrp, 0) as mrp,
                ISNULL(p.quantity_in_stock, 0) as expectedQty,
                RTRIM(ISNULL(s.VENDOR_EAN_NO, '')) as vendorEan
            FROM PMT01106 p WITH (NOLOCK)
            INNER JOIN SKU_NAMES s WITH (NOLOCK) ON p.product_code = s.product_Code
            WHERE ${whereClauses.join(' AND ')}
            ORDER BY s.article_no, s.para2_order, s.product_Code
        `;

        const result = await reqDb.query(queryStr);
        const rows = (result.recordset || []).map(r => ({
            barcode: r.barcode,
            articleNo: r.articleNo,
            itemName: r.itemName,
            sectionName: r.sectionName,
            subSectionName: r.subSectionName,
            color: r.color,
            size: r.size,
            sizeOrder: r.sizeOrder,
            mrp: Number(r.mrp || 0),
            expectedQty: Number(r.expectedQty || 1),
            vendorEan: r.vendorEan
        }));

        const totalPcs = rows.reduce((s, r) => s + r.expectedQty, 0);
        const totalValue = rows.reduce((s, r) => s + (r.mrp * r.expectedQty), 0);

        res.json({
            success: true,
            section,
            subSection,
            totalUniqueSkus: rows.length,
            totalPcs,
            totalValue,
            items: rows
        });
    } catch (err) {
        console.error('[RACK AUDIT Expected API Error]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 3. GET /api/inventory/rack-audit/lookup
 * Fast sub-30ms barcode resolver during scanning. Checks live SKU data and home section.
 */
router.get('/lookup', async (req, res) => {
    try {
        const query = (req.query.q || req.query.barcode || '').trim();
        if (!query) {
            return res.json({ success: false, message: 'Barcode is required' });
        }

        const { cleanDigits, paddedDigits } = normalizeLookupQuery(query);
        const matched = await findMatchingSku({
            createRequest,
            sql,
            query,
            cleanDigits,
            paddedDigits,
            allowNameWildcard: false
        });

        if (!matched) {
            return res.json({ success: false, message: `Barcode "${query}" not recognized in system database.` });
        }

        let currentStock = 0;
        try {
            const stockReq = createRequest();
            stockReq.input('bc', sql.NVarChar, matched.barcode);
            const stockRes = await stockReq.query(`
                SELECT TOP 1 quantity_in_stock FROM PMT01106 WITH (NOLOCK) WHERE product_code = @bc
            `);
            currentStock = stockRes.recordset?.[0]?.quantity_in_stock || 0;
        } catch (e) { }

        return res.json({
            success: true,
            barcode: matched.barcode,
            articleNo: matched.articleNo,
            itemName: matched.itemName,
            sectionName: matched.sectionName,
            subSectionName: matched.subSectionName,
            color: matched.color,
            size: matched.size,
            sizeOrder: matched.sizeOrder,
            mrp: Number(matched.mrp || 0),
            stock: currentStock
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 4. POST /api/inventory/rack-audit/save
 * Finalizes an audit session, calculates accuracy, saves locally, and syncs to Firebase.
 */
router.post('/save', async (req, res) => {
    try {
        const {
            id,
            rackName,
            section,
            subSection,
            auditor,
            expectedCount = 0,
            scannedCount = 0,
            missingCount = 0,
            surpriseCount = 0,
            matchedCount = 0,
            accuracyPct = 100,
            scannedItems = [],
            missingItems = [],
            surpriseItems = [],
            notes = '',
            status = 'completed'
        } = req.body;

        const auditId = id || `AUDIT-${Date.now()}`;
        const auditRecord = {
            id: auditId,
            rackName: rackName || "General Showroom Rack",
            section: section || 'ALL',
            subSection: subSection || 'ALL',
            auditor: auditor || 'Showroom Staff',
            expectedCount: Number(expectedCount),
            scannedCount: Number(scannedCount),
            missingCount: Number(missingCount),
            surpriseCount: Number(surpriseCount),
            matchedCount: Number(matchedCount),
            accuracyPct: Number(accuracyPct),
            scannedItems: Array.isArray(scannedItems) ? scannedItems : [],
            missingItems: Array.isArray(missingItems) ? missingItems : [],
            surpriseItems: Array.isArray(surpriseItems) ? surpriseItems : [],
            notes: String(notes || ''),
            status,
            createdAt: new Date().toISOString()
        };

        const existing = readAudits();
        existing.push(auditRecord);
        writeAudits(existing);

        // Async sync to Firestore phone link
        syncAuditToCloud(auditRecord).catch(e => console.warn('[RACK AUDIT] Cloud sync err:', e.message));

        res.json({
            success: true,
            message: `Audit session ${auditId} saved successfully`,
            audit: auditRecord
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 5. GET /api/inventory/rack-audit/history
 * Returns historical audit records.
 */
router.get('/history', (req, res) => {
    try {
        const audits = readAudits();
        // Return latest first
        const sorted = [...audits].reverse();
        res.json({
            success: true,
            count: sorted.length,
            audits: sorted
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 6. POST /api/inventory/rack-audit/flag-missing
 * Automatically flags missing garments to the store investigation queue in pending_tags.json.
 */
router.post('/flag-missing', (req, res) => {
    try {
        const { auditId, rackName, missingItems = [] } = req.body;
        if (!Array.isArray(missingItems) || missingItems.length === 0) {
            return res.json({ success: true, message: 'No missing items to flag', flaggedCount: 0 });
        }

        let tags = [];
        try {
            if (fs.existsSync(TAGS_FILE)) {
                tags = JSON.parse(fs.readFileSync(TAGS_FILE, 'utf8'));
                if (!Array.isArray(tags)) tags = [];
            }
        } catch (e) {
            tags = [];
        }

        const now = new Date().toISOString();
        const newTags = missingItems.map((item, idx) => ({
            id: `AUD-DISC-${Date.now()}-${idx}`,
            barcode: item.barcode,
            articleNo: item.articleNo || '',
            articleName: item.itemName || 'Discrepancy Garment',
            color: item.color || 'Standard',
            size: item.size || 'Standard',
            mrp: item.mrp || 0,
            soldPrice: item.mrp || 0,
            status: 'active',
            tagType: 'AUDIT_DISCREPANCY',
            salesperson: 'Cycle Count Audit',
            customerName: `Rack Audit: ${rackName || 'Showroom'}`,
            customerPhone: '0000000000',
            notes: `Missing during Cycle Count (${auditId || 'Manual'}). Verify shrinkage or misplaced shelf.`,
            createdAt: now,
            updatedAt: now
        }));

        tags.push(...newTags);
        fs.writeFileSync(TAGS_FILE, JSON.stringify(tags, null, 2), 'utf8');

        res.json({
            success: true,
            message: `Flagged ${newTags.length} missing items to investigation queue`,
            flaggedCount: newTags.length
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
