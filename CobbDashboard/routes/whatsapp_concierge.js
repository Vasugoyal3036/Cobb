const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sql } = require('../db');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin for Firestore queries (Alterations Desk)
let firestoreDb = null;
try {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-admin.json');
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) }, 'concierge-app');
        firestoreDb = getFirestore(app);
        console.log('[CONCIERGE] Firestore initialized for WhatsApp Alterations.');
    }
} catch (e) {
    console.warn('[CONCIERGE] Firestore init warning:', e.message);
}

const HOLDS_FILE = path.join(__dirname, '..', 'holds.json');

function readHolds() {
    try {
        if (!fs.existsSync(HOLDS_FILE)) return [];
        return JSON.parse(fs.readFileSync(HOLDS_FILE, 'utf8'));
    } catch (e) {
        return [];
    }
}

function writeHolds(holds) {
    const tmp = HOLDS_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(holds, null, 2), 'utf8');
    fs.renameSync(tmp, HOLDS_FILE);
}

// 1. Check Customer Alterations Status by Phone
async function handleCustomerAlterations(req, res) {
    try {
        const rawPhone = (req.params.phone || '').trim();
        const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
        const searchPhone10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

        if (!searchPhone10 || searchPhone10.length < 10) {
            return res.status(400).json({ success: false, error: 'Valid 10-digit phone number required.' });
        }

        if (!firestoreDb) {
            return res.status(503).json({ success: false, error: 'Alteration database temporarily offline.' });
        }

        // Query Firestore stores/DEMO_STORE_001/alterations
        const snapshot = await firestoreDb.collection('stores/DEMO_STORE_001/alterations').get();
        const customerAlterations = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const docPhone = String(data.phone || '').replace(/[^0-9]/g, '');
            if (docPhone.includes(searchPhone10) || searchPhone10.includes(docPhone)) {
                customerAlterations.push({
                    id: doc.id,
                    customerName: data.customerName || 'Valued Customer',
                    category: data.category || 'Garment',
                    quantity: data.quantity || 1,
                    tailorName: data.tailorName || 'Store Master Tailor',
                    expectedDate: data.expectedDate || 'Today',
                    instructions: data.instructions || '',
                    status: data.status || 'In Progress',
                    createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null
                });
            }
        });

        // Sort latest first
        customerAlterations.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        res.json({
            success: true,
            phone: searchPhone10,
            hasActive: customerAlterations.some(a => a.status !== 'Completed' && a.status !== 'Delivered'),
            alterations: customerAlterations
        });
    } catch (err) {
        console.error('[CONCIERGE] Alterations query error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
}
router.get('/customer/:phone', handleCustomerAlterations);
router.get('/alterations/customer/:phone', handleCustomerAlterations);

// 2. Dynamic WhatsApp Catalog & Top Movers
router.get('/catalog', async (req, res) => {
    try {
        const result = await sql.query(`
            SELECT TOP 5
                RTRIM(d.ARTICLE_NO) as ArticleNo,
                MAX(RTRIM(d.ARTICLE_NAME)) as ArticleName,
                MAX(RTRIM(ISNULL(f.SECTION_NAME, 'Casuals'))) as Category,
                CAST(MAX(c.MRP) AS INT) as Mrp,
                CAST(AVG(a.NET / NULLIF(a.QUANTITY, 0)) AS INT) as OfferPrice,
                SUM(a.QUANTITY) as TotalUnitsSold
            FROM CMD01106 a WITH (NOLOCK)
            JOIN CMM01106 b WITH (NOLOCK) ON b.CM_ID = a.CM_ID
            JOIN SKU c WITH (NOLOCK) ON a.PRODUCT_CODE = c.PRODUCT_CODE
            JOIN ARTICLE d WITH (NOLOCK) ON c.ARTICLE_CODE = d.ARTICLE_CODE
            LEFT JOIN SECTIOND e WITH (NOLOCK) ON d.SUB_SECTION_CODE = e.SUB_SECTION_CODE
            LEFT JOIN SECTIONM f WITH (NOLOCK) ON e.SECTION_CODE = f.SECTION_CODE
            WHERE b.CANCELLED = 0 
              AND d.ARTICLE_NO IS NOT NULL 
              AND LEN(RTRIM(d.ARTICLE_NO)) > 1
              AND b.CM_TIME >= DATEADD(month, -2, GETDATE())
            GROUP BY RTRIM(d.ARTICLE_NO)
            ORDER BY SUM(a.QUANTITY) DESC;
        `);

        const items = (result.recordset || []).map(r => ({
            articleNo: r.ArticleNo,
            articleName: r.ArticleName || 'Exclusive Cobb Premium Fit',
            category: r.Category || 'Apparel',
            mrp: r.Mrp || 1999,
            offerPrice: r.OfferPrice || r.Mrp || 1499,
            totalSold: r.TotalUnitsSold || 10
        }));

        res.json({
            success: true,
            store: 'Cobb Garments, Pundri',
            timestamp: new Date().toISOString(),
            items
        });
    } catch (err) {
        console.error('[CONCIERGE] Catalog query error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Click & Collect (Reserve an Item via WhatsApp)
router.post('/reserve', async (req, res) => {
    try {
        const { phone, customerName, articleCode, size, notes } = req.body || {};
        if (!articleCode) {
            return res.status(400).json({ success: false, error: 'Article Code required for reservation.' });
        }

        const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
        const cleanCode = String(articleCode).trim();

        // Check if article exists in DB
        let articleName = `Cobb Article #${cleanCode}`;
        let category = 'Men Fashion';
        try {
            const artRes = await sql.query(`
                SELECT TOP 1 
                    RTRIM(d.ARTICLE_NAME) as ArticleName,
                    RTRIM(ISNULL(f.SECTION_NAME, 'Fashion')) as Category
                FROM ARTICLE d WITH (NOLOCK)
                LEFT JOIN SECTIOND e WITH (NOLOCK) ON d.SUB_SECTION_CODE = e.SUB_SECTION_CODE
                LEFT JOIN SECTIONM f WITH (NOLOCK) ON e.SECTION_CODE = f.SECTION_CODE
                WHERE RTRIM(d.ARTICLE_NO) = '${cleanCode}' OR d.ARTICLE_CODE = '${cleanCode}'
            `);
            if (artRes.recordset && artRes.recordset.length > 0) {
                articleName = artRes.recordset[0].ArticleName || articleName;
                category = artRes.recordset[0].Category || category;
            }
        } catch (e) {}

        const holds = readHolds();
        const now = new Date();
        const windowHours = 24; // 24-hour hold window
        const expiresAt = new Date(now.getTime() + (windowHours * 60 * 60 * 1000));
        const holdToken = 'HLD-' + Math.random().toString(36).substring(2, 7).toUpperCase();

        const newHold = {
            id: 'hold_' + Date.now(),
            holdToken,
            customerName: customerName || 'WhatsApp Customer',
            customerPhone: cleanPhone,
            articleNo: cleanCode,
            articleName,
            size: size || 'Standard',
            category,
            notes: notes || 'Reserved via WhatsApp 2-Way Bot',
            source: 'whatsapp_bot',
            expiresAt: expiresAt.toISOString(),
            status: 'active',
            createdAt: now.toISOString(),
            reminderSent: false
        };

        holds.unshift(newHold);
        writeHolds(holds);

        console.log(`[CONCIERGE] Click & Collect reservation created: ${holdToken} for ${cleanPhone} (${articleName})`);

        res.json({
            success: true,
            holdToken,
            articleName,
            articleNo: cleanCode,
            size: newHold.size,
            windowHours,
            expiresAt: expiresAt.toISOString(),
            storeAddress: 'Cobb Garments, Main Market, Pundri'
        });
    } catch (err) {
        console.error('[CONCIERGE] Reservation error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. NPS Status & Queue Inspector
router.get('/nps/status', async (req, res) => {
    try {
        const waRes = await fetch('http://localhost:3000/nps-status', { signal: AbortSignal.timeout(3000) });
        if (waRes.ok) {
            const data = await waRes.json();
            return res.json(data);
        }
    } catch (e) {}

    // Fallback: read directly from gateway nps_queue.json if gateway http is unreachable
    try {
        const queueFile = path.join(__dirname, '..', '..', 'whatsapp_gateway', 'nps_queue.json');
        if (fs.existsSync(queueFile)) {
            const queue = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
            return res.json({
                success: true,
                pendingCount: queue.filter(q => q.status === 'pending').length,
                sentCount: queue.filter(q => q.status === 'sent').length,
                queue: queue.slice(-25)
            });
        }
    } catch (e) {}

    res.json({ success: true, pendingCount: 0, sentCount: 0, queue: [] });
});

router.post('/nps/schedule', async (req, res) => {
    try {
        const waRes = await fetch('http://localhost:3000/nps-schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await waRes.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
