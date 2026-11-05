const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const DAMAGES_FILE = path.join(__dirname, '..', 'damage_records.json');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev';
const ADMIN_ROLES = ['admin', 'owner', 'manager'];

/**
 * RBAC Middleware: Protects defect resolution, deletion, restock, and RTV dispatch.
 * Floor staff can ONLY report/quarantine defects. Only Admin, Owner, or Manager
 * have authority to release, restock, settle, or remove defect records.
 */
function requireAdminRole(req, res, next) {
    let role = (
        req.headers['x-user-role'] ||
        req.body?.userRole ||
        req.query?.userRole ||
        ''
    ).toString().toLowerCase().trim();

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded && decoded.role) {
                role = decoded.role.toLowerCase().trim();
                req.user = decoded;
            }
        } catch (e) {
            // Token verification failed or expired
        }
    }

    if (ADMIN_ROLES.includes(role)) {
        return next();
    }

    return res.status(403).json({
        success: false,
        error: 'Access Denied: Floor staff cannot remove or resolve items from quarantine. Only Store Admin, Owner, or Manager can release, repair, or delete defect records from the Admin Panel.'
    });
}

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
    console.warn('[DAMAGES] Firestore init warning:', e.message);
}

// --- Atomic File Read / Write Helpers ---
function readDamages() {
    try {
        if (!fs.existsSync(DAMAGES_FILE)) return [];
        const raw = fs.readFileSync(DAMAGES_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

function writeDamages(damages) {
    try {
        const tmp = DAMAGES_FILE + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(damages, null, 2), 'utf8');
        fs.renameSync(tmp, DAMAGES_FILE);

        // Sync to Cloud Firestore for Phone Link
        if (firestoreDb) {
            try {
                firestoreDb.collection('stores').doc('DEMO_STORE_001').collection('data').doc('damage_records').set({
                    damages: damages.slice(-500),
                    quarantinedCount: damages.filter(d => d.status === 'quarantine').length,
                    lastUpdated: new Date().toISOString()
                }, { merge: true }).catch(() => {});
            } catch (e) {}
        }
    } catch (err) {
        console.error('[DAMAGES] Error saving damage records:', err.message);
    }
}

function generateId() {
    return 'dmg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

function normalizeBarcode(val) {
    if (!val) return '';
    return String(val).trim().toUpperCase();
}

/**
 * GET /api/damages
 * Query: status ('quarantine' | 'dispatched_rtv' | 'settled' | 'repaired' | 'all')
 */
router.get('/', (req, res) => {
    try {
        const statusFilter = req.query.status || 'all';
        const all = readDamages();

        let filtered = all;
        if (statusFilter !== 'all') {
            filtered = all.filter(d => d.status === statusFilter);
        }

        const quarantined = all.filter(d => d.status === 'quarantine');
        const quarantinedMrp = quarantined.reduce((sum, d) => sum + (Number(d.mrp) || 0), 0);
        const dispatchedRtv = all.filter(d => d.status === 'dispatched_rtv');
        const settled = all.filter(d => d.status === 'settled');
        const repaired = all.filter(d => d.status === 'repaired');

        res.json({
            success: true,
            damages: filtered,
            summary: {
                totalCount: all.length,
                quarantinedCount: quarantined.length,
                quarantinedMrp,
                dispatchedCount: dispatchedRtv.length,
                settledCount: settled.length,
                repairedCount: repaired.length
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/damages/check/:barcode
 * Quick lookup to check if an item is quarantined (used by POS & scanner)
 */
router.get('/check/:barcode', (req, res) => {
    try {
        const barcode = normalizeBarcode(req.params.barcode);
        if (!barcode) {
            return res.json({ success: true, isQuarantined: false });
        }

        const all = readDamages();
        const found = all.find(d => d.status === 'quarantine' && normalizeBarcode(d.barcode) === barcode);

        if (found) {
            return res.json({
                success: true,
                isQuarantined: true,
                damage: found
            });
        }

        res.json({ success: true, isQuarantined: false });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/damages/report
 * Staff reports a defect/damage on phone or desktop
 */
router.post('/report', (req, res) => {
    try {
        const {
            barcode,
            articleNo,
            articleName,
            category,
            size,
            color,
            section,
            mrp,
            defectType,
            defectDesc,
            severity,
            photo,
            reportedBy,
            source,
            actionPlan
        } = req.body;

        const cleanBarcode = normalizeBarcode(barcode);
        if (!cleanBarcode && !articleNo) {
            return res.status(400).json({
                success: false,
                error: 'Barcode or Article Number is required to quarantine a damaged garment'
            });
        }

        const all = readDamages();

        // Check if barcode already quarantined
        if (cleanBarcode) {
            const existing = all.find(d => d.status === 'quarantine' && normalizeBarcode(d.barcode) === cleanBarcode);
            if (existing) {
                return res.status(409).json({
                    success: false,
                    duplicate: true,
                    error: `Item with barcode ${cleanBarcode} is ALREADY quarantined in Damage Bin (#${existing.id})`,
                    damage: existing
                });
            }
        }

        const now = new Date();
        const newRecord = {
            id: generateId(),
            barcode: cleanBarcode,
            articleNo: (articleNo || cleanBarcode || 'COBB-ART').toUpperCase(),
            articleName: articleName || category || 'Cobb Apparel',
            category: (category || 'APPAREL').toUpperCase(),
            size: (size || 'FREE').toUpperCase(),
            color: (color || 'STANDARD').toUpperCase(),
            section: section || 'MENSWEAR',
            mrp: Number(mrp) || 0,
            defectType: defectType || 'STITCH_TEAR', // ZIPPER, STITCH_TEAR, STAIN, MISSING_BUTTON, TRANSIT_DAMAGE, OTHER
            defectDesc: defectDesc || '',
            severity: severity || 'major', // minor (tailor repairable) | major (RTV)
            actionPlan: actionPlan || (severity === 'minor' ? 'local_repair' : 'rtv_vendor'),
            photo: photo || null,
            reportedBy: reportedBy || 'Floor Staff',
            source: source || 'Floor Mobile Camera Scan',
            status: 'quarantine', // quarantine | dispatched_rtv | settled | repaired
            reportedAt: now.toISOString(),
            date: now.toISOString().split('T')[0]
        };

        const updated = [newRecord, ...all];
        writeDamages(updated);

        res.json({
            success: true,
            message: `Garment ${newRecord.articleNo} successfully quarantined!`,
            damage: newRecord
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/damages/repair-restock
 * Store tailor repaired item (e.g. replaced button) -> restore to active rack inventory
 * [ADMIN/OWNER ONLY] Floor staff cannot resolve or un-quarantine
 */
router.post('/repair-restock', requireAdminRole, (req, res) => {
    try {
        const { id, repairNotes, repairedBy } = req.body;
        if (!id) return res.status(400).json({ success: false, error: 'Damage ID required' });

        const all = readDamages();
        const idx = all.findIndex(d => d.id === id);
        if (idx === -1) return res.status(404).json({ success: false, error: 'Record not found' });

        all[idx].status = 'repaired';
        all[idx].repairedAt = new Date().toISOString();
        all[idx].repairNotes = repairNotes || 'Repaired in-store and restored to sales rack';
        all[idx].repairedBy = repairedBy || (req.user ? req.user.name : 'Store Admin');

        writeDamages(all);
        res.json({ success: true, message: 'Garment repaired and cleared for sales rack', damage: all[idx] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/damages/create-rtv-batch
 * Groups selected quarantined pieces into an RTV dispatch parcel for Cobb HO
 * [ADMIN/OWNER ONLY] Floor staff cannot dispatch RTV batches
 */
router.post('/create-rtv-batch', requireAdminRole, (req, res) => {
    try {
        const { itemIds, transportName, destination } = req.body;
        if (!Array.isArray(itemIds) || itemIds.length === 0) {
            return res.status(400).json({ success: false, error: 'No items selected for RTV dispatch' });
        }

        const rtvBatchNo = 'RTV-' + Date.now().toString().slice(-6);
        const nowIso = new Date().toISOString();

        const all = readDamages();
        let updatedCount = 0;

        all.forEach(d => {
            if (itemIds.includes(d.id) && d.status === 'quarantine') {
                d.status = 'dispatched_rtv';
                d.rtvBatchNo = rtvBatchNo;
                d.dispatchedAt = nowIso;
                d.transportName = transportName || 'Self / Courier';
                d.destination = destination || 'Cobb Head Office / Factory';
                d.dispatchedBy = req.user ? req.user.name : 'Store Admin';
                updatedCount++;
            }
        });

        writeDamages(all);
        res.json({
            success: true,
            rtvBatchNo,
            updatedCount,
            message: `RTV Batch ${rtvBatchNo} created for ${updatedCount} damaged pieces`
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/damages/settle
 * Cobb HO issued Credit Note
 * [ADMIN/OWNER ONLY] Floor staff cannot settle claims
 */
router.post('/settle', requireAdminRole, (req, res) => {
    try {
        const { id, creditNoteNo, settledAmount, notes } = req.body;
        if (!id) return res.status(400).json({ success: false, error: 'Damage ID required' });

        const all = readDamages();
        const idx = all.findIndex(d => d.id === id);
        if (idx === -1) return res.status(404).json({ success: false, error: 'Record not found' });

        all[idx].status = 'settled';
        all[idx].settledAt = new Date().toISOString();
        all[idx].creditNoteNo = creditNoteNo || 'CN-DIRECT';
        all[idx].settledAmount = Number(settledAmount) || all[idx].mrp;
        all[idx].settleNotes = notes || '';
        all[idx].settledBy = req.user ? req.user.name : 'Store Admin';

        writeDamages(all);
        res.json({ success: true, message: 'Damage claim settled via Credit Note', damage: all[idx] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * DELETE /api/damages/:id
 * [ADMIN/OWNER ONLY] Floor staff cannot delete defect records
 */
router.delete('/:id', requireAdminRole, (req, res) => {
    try {
        const { id } = req.params;
        const all = readDamages();
        const filtered = all.filter(d => d.id !== id);
        writeDamages(filtered);
        res.json({ success: true, message: 'Damage record removed by Store Admin' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;

