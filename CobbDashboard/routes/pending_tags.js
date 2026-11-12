const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sql, createRequest } = require('../db');

const TAGS_FILE = path.join(__dirname, '..', 'pending_tags.json');
const BACKUP_FILE = path.join(__dirname, '..', 'pending_tags.backup.json');
const AUDIT_LOG_FILE = path.join(__dirname, '..', 'pending_tags_audit.jsonl');

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

// --- Async Mutex Lock (Prevents concurrent read/write races between background interval, sync & add) ---
let tagsLockChain = Promise.resolve();
function withTagsLock(fn) {
    const next = tagsLockChain.then(() => fn(), () => fn());
    tagsLockChain = next.catch(() => {});
    return next;
}

// --- Immutable Audit Logger ---
function appendAuditLog(event, details = {}) {
    try {
        const entry = {
            ts: new Date().toISOString(),
            event,
            ...details
        };
        fs.appendFileSync(AUDIT_LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
    } catch (e) { }
}

// --- Preserves 100% of active tags (never sliced) + latest 250 historical billed tags ---
function buildCloudTagsPayload(tags) {
    const list = Array.isArray(tags) ? tags : [];
    const nonVoid = list.filter(t => t && t.status !== 'void');
    const active = nonVoid.filter(t => t.status === 'active');
    const billed = nonVoid.filter(t => t.status !== 'active').slice(-250);
    const keepIds = new Set([...active.map(t => t.id), ...billed.map(t => t.id)]);
    return nonVoid.filter(t => keepIds.has(t.id));
}

// --- Atomic File Read / Write Helpers ---
function readTags() {
    try {
        if (!fs.existsSync(TAGS_FILE)) return [];
        const raw = fs.readFileSync(TAGS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        try {
            if (fs.existsSync(BACKUP_FILE)) {
                const rawBak = fs.readFileSync(BACKUP_FILE, 'utf8');
                const parsedBak = JSON.parse(rawBak);
                return Array.isArray(parsedBak) ? parsedBak : [];
            }
        } catch (bakErr) { }
        return [];
    }
}

function writeTags(tags) {
    try {
        const safeTags = Array.isArray(tags) ? tags : [];
        // Keep a rolling safety backup of previous state when tags exist
        if (fs.existsSync(TAGS_FILE)) {
            try {
                fs.copyFileSync(TAGS_FILE, BACKUP_FILE);
            } catch (bakErr) { }
        }

        const tmp = TAGS_FILE + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(safeTags, null, 2), 'utf8');
        fs.renameSync(tmp, TAGS_FILE);

        // Sync ALL active tags + latest 250 history to Cloud Firestore for Phone Link
        if (firestoreDb) {
            try {
                const cloudPayload = buildCloudTagsPayload(safeTags);
                firestoreDb.collection('stores').doc('DEMO_STORE_001').collection('data').doc('pending_tags').set({
                    tags: cloudPayload,
                    activeCount: safeTags.filter(t => t.status === 'active').length,
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

// --- Timezone-Safe POS Date Parser (+05:30 IST default for naive SQL DATETIME) ---
function parsePosTimeMs(dtStr) {
    if (!dtStr) return NaN;
    if (dtStr instanceof Date) return dtStr.getTime();
    const s = String(dtStr).trim();
    if (!s) return NaN;
    if (!s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) {
        return new Date(s + '+05:30').getTime();
    }
    return new Date(s).getTime();
}

// --- Failproof Bidirectional Cloud Merge (Prevents losing tags added offline or via Phone Link) ---
function mergeTagsList(localTags = [], cloudTags = []) {
    const merged = [...localTags];
    const localById = new Map();
    const localActiveBarcodes = new Set();

    for (let i = 0; i < merged.length; i++) {
        const t = merged[i];
        if (!t || !t.id) continue;
        localById.set(t.id, i);
        if (t.status === 'active' && t.barcode) {
            localActiveBarcodes.add(cleanBarcodeDigits(t.barcode));
        }
    }

    let mergedFromCloudCount = 0;
    const mergedTagBarcodes = [];

    for (const cTag of (cloudTags || [])) {
        if (!cTag || !cTag.id) continue;
        if (localById.has(cTag.id)) {
            // Preserve newer explicit user changes from Phone Link (e.g., hold/manual mark-billed)
            const idx = localById.get(cTag.id);
            const lTag = merged[idx];
            const cUpdated = new Date(cTag.updatedAt || cTag.resolvedAt || cTag.holdCreatedAt || cTag.createdAt || 0).getTime();
            const lUpdated = new Date(lTag.updatedAt || lTag.voidedAt || lTag.resolvedAt || lTag.holdCreatedAt || lTag.createdAt || 0).getTime();
            if (lTag.status !== 'void' && cTag.status !== 'void' && cUpdated > lUpdated) {
                // Only update metadata or manual actions; never let stale cloud overwrite local active->billed POS sync unless cloud explicitly has a manual update
                if (cTag.manualRestoreAt && (!lTag.manualRestoreAt || new Date(cTag.manualRestoreAt) > new Date(lTag.manualRestoreAt))) {
                    merged[idx] = { ...lTag, ...cTag };
                } else if (cTag.holdCreatedAt && !lTag.holdForCustomer && cTag.holdForCustomer && lTag.status === 'active') {
                    merged[idx] = { ...lTag, ...cTag };
                }
            }
            continue;
        }

        // Never resurrect voided tags
        if (cTag.status === 'void') continue;

        // Prevent duplicate active barcode if already present locally
        const cleanBc = cTag.barcode ? cleanBarcodeDigits(cTag.barcode) : '';
        if (cTag.status === 'active' && cleanBc && localActiveBarcodes.has(cleanBc)) {
            continue;
        }

        merged.push(cTag);
        localById.set(cTag.id, merged.length - 1);
        if (cTag.status === 'active' && cleanBc) {
            localActiveBarcodes.add(cleanBc);
        }
        mergedFromCloudCount++;
        mergedTagBarcodes.push(cTag.barcode || cTag.id);
    }

    if (mergedFromCloudCount > 0) {
        appendAuditLog('CLOUD_MERGE_RECOVERED', { count: mergedFromCloudCount, barcodes: mergedTagBarcodes });
        console.log(`[PENDING TAGS CLOUD-MERGE] Safely merged ${mergedFromCloudCount} tag(s) from Firestore:`, mergedTagBarcodes.join(', '));
    }

    return { merged, mergedFromCloudCount, mergedTagBarcodes };
}

async function mergeTagsWithCloud(localTags) {
    if (!firestoreDb) {
        return { tags: localTags, mergedFromCloudCount: 0, cloudChanged: false };
    }
    try {
        const snap = await firestoreDb.collection('stores').doc('DEMO_STORE_001').collection('data').doc('pending_tags').get();
        if (!snap.exists) {
            return { tags: localTags, mergedFromCloudCount: 0, cloudChanged: false };
        }
        const data = snap.data() || {};
        const cloudTags = Array.isArray(data.tags) ? data.tags : [];
        if (cloudTags.length === 0) {
            return { tags: localTags, mergedFromCloudCount: 0, cloudChanged: false };
        }
        const { merged, mergedFromCloudCount } = mergeTagsList(localTags, cloudTags);
        return {
            tags: merged,
            mergedFromCloudCount,
            cloudChanged: mergedFromCloudCount > 0
        };
    } catch (e) {
        console.warn('[PENDING TAGS] Cloud merge check warning:', e.message);
        return { tags: localTags, mergedFromCloudCount: 0, cloudChanged: false };
    }
}

// --- Failproof Automatic Billed Detection & Cancelled-Bill Recovery against SQL Server ---
// Rules:
// 1. Auto-restores tags if the POS bill they were auto-resolved to was later CANCELLED (m.CANCELLED = 1).
// 2. Queries BOTH positive sales (QUANTITY > 0) and returns/exchanges (QUANTITY < 0) over last 30 days.
// 3. Parses naive SQL timestamps cleanly as Store IST (+05:30).
// 4. Strictly requires BillTime >= tag.createdAt - 3000ms (max 3s clock skew; NEVER matches earlier historical bills).
// 5. Net billed quantity after tag creation MUST be >= 1 (if sold +1 and returned -1, DO NOT mark billed).
// 6. Strict 1-to-1 bill slot accounting so 1 POS billed unit cannot clear multiple tags.
async function checkAndResolveBilledTags(tags, customQueryFn = null) {
    const runQuery = customQueryFn || ((q) => sql.query(q));
    const resolvedTags = [];
    const restoredTags = [];
    let changed = false;

    try {
        // STEP A: Auto-restore any recent (14d) auto-resolved tags if their POS bill was later CANCELLED (m.CANCELLED = 1)
        const fourteenDaysAgo = Date.now() - (14 * 86400000);
        const recentAutoResolved = tags.filter(t =>
            t.status === 'billed' &&
            t.autoResolved === true &&
            t.billedInBillNo &&
            t.resolvedAt &&
            new Date(t.resolvedAt).getTime() >= fourteenDaysAgo
        );

        if (recentAutoResolved.length > 0) {
            const billNos = [...new Set(recentAutoResolved.map(t => String(t.billedInBillNo).trim()).filter(Boolean))];
            if (billNos.length > 0) {
                const formattedBills = billNos.map(b => `'${b.replace(/'/g, "''")}'`).join(',');
                const cancelCheckSql = `
                    SELECT RTRIM(CM_NO) as BillNo, CANCELLED as Cancelled
                    FROM CMM01106 WITH (NOLOCK)
                    WHERE RTRIM(CM_NO) IN (${formattedBills})
                `;
                const cancelRes = await runQuery(cancelCheckSql);
                const billStatusMap = new Map();
                for (const row of (cancelRes.recordset || [])) {
                    billStatusMap.set(String(row.BillNo || '').trim(), Boolean(row.Cancelled));
                }

                for (const t of recentAutoResolved) {
                    const bNo = String(t.billedInBillNo || '').trim();
                    if (billStatusMap.get(bNo) === true) {
                        t.status = 'active';
                        t.restoredFromCancelledBill = bNo;
                        t.restoredAt = new Date().toISOString();
                        t.billedInBillNo = null;
                        t.billedAt = null;
                        t.billedNet = null;
                        t.autoResolved = false;
                        changed = true;
                        restoredTags.push({ id: t.id, barcode: t.barcode, articleName: t.articleName, cancelledBillNo: bNo });
                        appendAuditLog('AUTO_RESTORED_CANCELLED_BILL', { tagId: t.id, barcode: t.barcode, cancelledBillNo: bNo });
                        console.log(`[PENDING TAGS AUTO-RESTORED] Tag ${t.barcode} (${t.articleName}) restored to active because Bill ${bNo} was CANCELLED!`);
                    }
                }
            }
        }

        // STEP A2: Mark historical 'billed' tags whose garment was later returned/exchanged & restocked in POS (stock > 0 & netSold <= 0)
        // so they no longer falsely block staff from creating a new pending tag when a returned item is resold!
        if (!customQueryFn) {
            const thirtyDaysAgo = Date.now() - (30 * 86400000);
            const recentBilledForReturnCheck = tags.filter(t =>
                t.status === 'billed' &&
                !t.returnedToStock &&
                t.barcode &&
                new Date(t.resolvedAt || t.billedAt || t.createdAt || 0).getTime() >= thirtyDaysAgo
            );
            if (recentBilledForReturnCheck.length > 0) {
                try {
                    const billedBcs = [...new Set(recentBilledForReturnCheck.map(t => String(t.barcode).trim()).filter(Boolean))];
                    const fmtBcs = billedBcs.map(b => `'${b.replace(/'/g, "''")}'`).join(',');
                    const stockCheckRes = await runQuery(`
                        SELECT RTRIM(p.product_code) as bc, ISNULL(p.quantity_in_stock, 0) as stock
                        FROM PMT01106 p WITH (NOLOCK)
                        WHERE RTRIM(p.product_code) IN (${fmtBcs}) AND p.quantity_in_stock > 0
                    `);
                    const inStockBcs = new Set((stockCheckRes.recordset || []).map(r => cleanBarcodeDigits(r.bc)));
                    if (inStockBcs.size > 0) {
                        const fmtInStock = [...new Set(recentBilledForReturnCheck.filter(t => inStockBcs.has(cleanBarcodeDigits(t.barcode))).map(t => `'${String(t.barcode).trim().replace(/'/g, "''")}'`))].join(',');
                        const netRes = await runQuery(`
                            SELECT RTRIM(d.PRODUCT_CODE) as bc, SUM(ISNULL(d.QUANTITY, 0)) as netSold
                            FROM CMD01106 d WITH (NOLOCK)
                            JOIN CMM01106 m WITH (NOLOCK) ON d.CM_ID = m.CM_ID
                            WHERE m.CANCELLED = 0 AND RTRIM(d.PRODUCT_CODE) IN (${fmtInStock})
                            GROUP BY RTRIM(d.PRODUCT_CODE)
                        `);
                        const netSoldMap = new Map((netRes.recordset || []).map(r => [cleanBarcodeDigits(r.bc), Number(r.netSold || 0)]));
                        for (const t of recentBilledForReturnCheck) {
                            const cBc = cleanBarcodeDigits(t.barcode);
                            if (inStockBcs.has(cBc) && (netSoldMap.get(cBc) || 0) <= 0) {
                                t.returnedToStock = true;
                                t.returnedToStockAt = new Date().toISOString();
                                changed = true;
                                appendAuditLog('MARKED_RETURNED_TO_STOCK', { tagId: t.id, barcode: t.barcode, prevBill: t.billedInBillNo });
                                console.log(`[PENDING TAGS RESTOCKED] Historical tag ${t.barcode} (${t.billedInBillNo}) detected returned & back in stock — unblocked for future tagging!`);
                            }
                        }
                    }
                } catch (retErr) {
                    console.warn('[PENDING TAGS] Return restock check notice:', retErr.message);
                }
            }
        }

        // STEP B: Verify active pending tags against POS bills
        const activeTags = tags.filter(t => t.status === 'active' && t.barcode);
        if (activeTags.length === 0) {
            return { changed, resolvedTags, restoredTags };
        }

        // Include raw trimmed, clean (stripped leading 0s), and 10-digit zero-padded variants for SQL lookup
        const barcodeVariants = new Set();
        for (const t of activeTags) {
            const raw = String(t.barcode).trim();
            const clean = cleanBarcodeDigits(raw);
            barcodeVariants.add(raw);
            if (clean) barcodeVariants.add(clean);
            if (raw.length < 10 && /^\d+$/.test(raw)) {
                barcodeVariants.add(raw.padStart(10, '0'));
            }
        }

        const formattedIn = [...barcodeVariants].map(b => `'${b.replace(/'/g, "''")}'`).join(',');
        const query = `
            SELECT 
                RTRIM(d.PRODUCT_CODE) as Barcode,
                RTRIM(m.CM_NO) as BillNo,
                CONVERT(varchar, m.CM_TIME, 126) as BillTime,
                ISNULL(m.CANCELLED, 0) as Cancelled,
                ISNULL(d.NET, 0) as BilledNet,
                ISNULL(d.MRP, 0) as BilledMRP,
                ISNULL(d.discount_percentage, 0) as BilledDiscountPct,
                ISNULL(d.QUANTITY, 0) as BilledQty
            FROM CMD01106 d WITH (NOLOCK)
            JOIN CMM01106 m WITH (NOLOCK) ON d.CM_ID = m.CM_ID
            WHERE RTRIM(d.PRODUCT_CODE) IN (${formattedIn})
              AND m.CM_TIME >= DATEADD(day, -30, GETDATE())
            ORDER BY m.CM_TIME DESC
        `;

        const result = await runQuery(query);
        const rows = result.recordset || [];
        if (rows.length === 0) {
            return { changed, resolvedTags, restoredTags };
        }

        // Track remaining unclaimed positive bill slots per (BillNo + cleanBarcode)
        // First deduct any tags ALREADY marked billed in that exact BillNo + Barcode
        const billSlotRemaining = new Map();
        for (const r of rows) {
            if (!r.Cancelled && Number(r.BilledQty || 0) > 0) {
                const key = `${String(r.BillNo).trim()}::${cleanBarcodeDigits(r.Barcode)}`;
                billSlotRemaining.set(key, (billSlotRemaining.get(key) || 0) + Number(r.BilledQty));
            }
        }
        for (const existingBilled of tags) {
            if (existingBilled.status === 'billed' && existingBilled.billedInBillNo && existingBilled.barcode) {
                const key = `${String(existingBilled.billedInBillNo).trim()}::${cleanBarcodeDigits(existingBilled.barcode)}`;
                if (billSlotRemaining.has(key)) {
                    billSlotRemaining.set(key, Math.max(0, billSlotRemaining.get(key) - 1));
                }
            }
        }

        for (const tag of activeTags) {
            const tagBarcode = String(tag.barcode).trim();
            const cleanTagBc = cleanBarcodeDigits(tagBarcode);
            const tagCreatedMs = new Date(tag.createdAt).getTime();
            if (!Number.isFinite(tagCreatedMs)) continue;

            // Gather ALL non-cancelled rows (sales AND returns) for this barcode after tag creation
            const postCreationRows = rows.filter(r => {
                if (r.Cancelled) return false;
                if (!isBarcodeDuplicate(r.Barcode, tagBarcode)) return false;
                const billMs = parsePosTimeMs(r.BillTime);
                if (!Number.isFinite(billMs)) return false;
                return billMs >= (tagCreatedMs - 3000); // max 3s clock skew tolerance
            });

            if (postCreationRows.length === 0) continue;

            // Net billed quantity since tag was created MUST be >= 1
            // If item was billed (+1) and immediately returned/exchanged (-1), netQty = 0 -> DO NOT RESOLVE!
            const netQtyAfterTag = postCreationRows.reduce((sum, r) => sum + Number(r.BilledQty || 0), 0);
            if (netQtyAfterTag <= 0) continue;

            // Find an unclaimed positive sale row (prefer newest valid sale row with available slot)
            const match = postCreationRows.find(r => {
                if (Number(r.BilledQty || 0) <= 0) return false;
                const key = `${String(r.BillNo).trim()}::${cleanTagBc}`;
                return (billSlotRemaining.get(key) || 0) >= 1;
            });

            if (match) {
                const slotKey = `${String(match.BillNo).trim()}::${cleanTagBc}`;
                billSlotRemaining.set(slotKey, Math.max(0, (billSlotRemaining.get(slotKey) || 1) - 1));

                tag.status = 'billed';
                tag.billedInBillNo = match.BillNo;
                tag.billedAt = match.BillTime;
                tag.billedNet = match.BilledNet;
                tag.billedMRP = match.BilledMRP;
                tag.autoResolved = true;
                tag.resolvedAt = new Date().toISOString();
                changed = true;
                resolvedTags.push({
                    id: tag.id,
                    barcode: tag.barcode,
                    articleName: tag.articleName,
                    billNo: match.BillNo,
                    billTime: match.BillTime,
                    netQtyAfterTag
                });
                appendAuditLog('AUTO_RESOLVED_BILLED', {
                    tagId: tag.id,
                    barcode: tag.barcode,
                    billNo: match.BillNo,
                    billTime: match.BillTime,
                    tagCreatedAt: tag.createdAt,
                    netQtyAfterTag
                });
                console.log(`[PENDING TAGS AUTO-RESOLVED] Tag ${tag.barcode} (${tag.articleName}) verified billed in ${match.BillNo} (netQty=${netQtyAfterTag})!`);
            }
        }

        return { changed, resolvedTags, restoredTags };
    } catch (err) {
        console.warn('[PENDING TAGS] Error checking billed tags:', err.message);
        return { changed: false, resolvedTags: [], restoredTags: [], error: err.message };
    }
}

// Background auto-resolver runs every 60 seconds (Balanced mode) under strict mutex lock + re-entrancy guard
let pendingBackgroundSyncActive = false;
const pendingSyncInterval = setInterval(() => {
    if (pendingBackgroundSyncActive) return;
    pendingBackgroundSyncActive = true;
    withTagsLock(async () => {
        try {
            const localTags = readTags();
            const { tags, cloudChanged } = await mergeTagsWithCloud(localTags);
            const { changed: posChanged } = await checkAndResolveBilledTags(tags);
            if (cloudChanged || posChanged) {
                writeTags(tags);
            }
        } catch (e) { }
    }).finally(() => {
        pendingBackgroundSyncActive = false;
    });
}, 60000);
if (typeof pendingSyncInterval.unref === 'function') pendingSyncInterval.unref();

// --- ROUTES ---

// GET /api/pending-tags — merge cloud tags, verify POS billing safely, and calculate summary metrics
router.get('/', async (req, res) => {
    try {
        const resultPayload = await withTagsLock(async () => {
            const localTags = readTags();
            const { tags: mergedTags, mergedFromCloudCount, cloudChanged } = await mergeTagsWithCloud(localTags);
            const { changed: posChanged, resolvedTags, restoredTags } = await checkAndResolveBilledTags(mergedTags);

            if (cloudChanged || posChanged) {
                writeTags(mergedTags);
            }

            const tags = mergedTags.filter(t => t.status !== 'void');
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

            // Keep 100% of active tags + latest 250 billed tags (never lose an active tag!)
            const visibleTags = buildCloudTagsPayload(tags).reverse();

            return {
                success: true,
                tags: visibleTags, // newest first
                customerHolds,
                syncReport: {
                    checkedActiveCount: activeTags.length + resolvedTags.length,
                    activeCountAfter: activeTags.length,
                    resolvedCount: resolvedTags.length,
                    resolvedTags,
                    restoredCount: restoredTags.length,
                    restoredTags,
                    mergedFromCloudCount,
                    syncedAt: new Date().toISOString()
                },
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
            };
        });

        res.json(resultPayload);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

async function verifyPosStockAndNetBilled(candidateBarcode, createReqFn = createRequest) {
    let preSqlCheck = null;
    let verifiedAvailableInPos = false;
    try {
        const cleanDigits = candidateBarcode.replace(/^0+/, '') || candidateBarcode;
        const paddedDigits = candidateBarcode.length < 10 && /^\d+$/.test(candidateBarcode) ? candidateBarcode.padStart(10, '0') : candidateBarcode;

        if (createReqFn) {
            const stockReq = createReqFn();
            stockReq.input('bc', sql.NVarChar, candidateBarcode);
            stockReq.input('cleanDigits', sql.NVarChar, cleanDigits);
            stockReq.input('paddedDigits', sql.NVarChar, paddedDigits);
            const stockRes = await stockReq.query(`
                SELECT ISNULL(SUM(quantity_in_stock), 0) as stock
                FROM PMT01106 WITH (NOLOCK)
                WHERE product_code = @bc OR product_code = @cleanDigits OR product_code = @paddedDigits
            `);
            const currentStock = Number(stockRes.recordset?.[0]?.stock || 0);

            if (currentStock > 0) {
                verifiedAvailableInPos = true;
            } else {
                const posReq = createReqFn();
                posReq.input('bc', sql.NVarChar, candidateBarcode);
                posReq.input('cleanDigits', sql.NVarChar, cleanDigits);
                posReq.input('paddedDigits', sql.NVarChar, paddedDigits);

                const billedPosRes = await posReq.query(`
                    SELECT TOP 20
                        RTRIM(d.PRODUCT_CODE) as barcode,
                        RTRIM(m.CM_NO) as billNo,
                        CONVERT(varchar, m.CM_TIME, 126) as billTime,
                        ISNULL(d.NET, 0) as netAmount,
                        ISNULL(d.QUANTITY, 0) as qty
                    FROM CMD01106 d WITH (NOLOCK)
                    JOIN CMM01106 m WITH (NOLOCK) ON d.CM_ID = m.CM_ID
                    WHERE m.CANCELLED = 0
                      AND (d.PRODUCT_CODE = @bc OR d.PRODUCT_CODE = @cleanDigits OR d.PRODUCT_CODE = @paddedDigits)
                    ORDER BY m.CM_TIME DESC
                `);

                const rows = billedPosRes.recordset || [];
                if (rows.length > 0) {
                    const netSold = rows.reduce((s, r) => s + Number(r.qty || 0), 0);
                    if (netSold > 0) {
                        const billedRow = rows.find(r => Number(r.qty || 0) > 0) || rows[0];
                        preSqlCheck = billedRow;
                    } else {
                        verifiedAvailableInPos = true;
                    }
                }
            }
        }
    } catch (sqlErr) {
        console.warn('[PendingTags check SQL POS billed error]', sqlErr.message);
    }
    return { preSqlCheck, verifiedAvailableInPos };
}

function evaluateDuplicateAndBilledState(tags, candidateBarcode, verifiedAvailableInPos = false) {
    const activeDuplicate = tags.find(t => t.status === 'active' && isBarcodeDuplicate(t.barcode, candidateBarcode));
    if (activeDuplicate) {
        return {
            statusCode: 409,
            body: {
                success: false,
                duplicate: true,
                error: `Duplicate Barcode: An active pending tag with barcode "${activeDuplicate.barcode}" (${activeDuplicate.articleName || 'Item'}, ₹${activeDuplicate.mrp || 0}) is already on the pending rack! (Tag #${activeDuplicate.id}). Similar or duplicate barcode cannot be added.`,
                existingTag: activeDuplicate
            },
            clearedReturnedBilled: []
        };
    }

    const unreturnedBilled = tags.filter(t => t.status === 'billed' && !t.returnedToStock && isBarcodeDuplicate(t.barcode, candidateBarcode));
    if (unreturnedBilled.length > 0) {
        if (!verifiedAvailableInPos) {
            const billedTag = unreturnedBilled[0];
            return {
                statusCode: 409,
                body: {
                    success: false,
                    duplicate: true,
                    billed: true,
                    error: `Already Billed: Barcode "${candidateBarcode}" has already been billed in POS (Bill #${billedTag.billedInBillNo || 'POS-BILL'} on ${billedTag.billedAt ? new Date(billedTag.billedAt).toLocaleDateString('en-IN') : 'earlier'})! Billed items cannot be re-added as pending tags.`,
                    existingTag: billedTag
                },
                clearedReturnedBilled: []
            };
        }
        const returnedIso = new Date().toISOString();
        for (const bt of unreturnedBilled) {
            bt.returnedToStock = true;
            bt.returnedToStockAt = returnedIso;
            bt.updatedAt = returnedIso;
        }
        return { statusCode: 200, body: null, clearedReturnedBilled: unreturnedBilled };
    }

    return { statusCode: 200, body: null, clearedReturnedBilled: [] };
}

// POST /api/pending-tags/add — create a new pending tag (protected by mutex + cloud merge + net-billed guard)
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

        // 1. Live SQL Server stock & net-billed check:
        // Only block if physical stock in PMT01106 <= 0 AND net billed qty > 0.
        // If returned (-1) or back in physical POS stock (quantity_in_stock > 0), allow adding!
        const { preSqlCheck, verifiedAvailableInPos } = await verifyPosStockAndNetBilled(candidateBarcode);

        if (preSqlCheck) {
            return res.status(409).json({
                success: false,
                duplicate: true,
                billed: true,
                error: `Already Billed in POS: Barcode "${candidateBarcode}" was already billed in POS (Bill #${preSqlCheck.billNo} on ${new Date(preSqlCheck.billTime).toLocaleDateString('en-IN')})! Cannot add an already billed item as a pending tag.`,
                billedInfo: preSqlCheck
            });
        }

        const outcome = await withTagsLock(async () => {
            const localTags = readTags();
            const { tags } = await mergeTagsWithCloud(localTags);

            // Duplication & Billed Prevention in existing tags
            const guardResult = evaluateDuplicateAndBilledState(tags, candidateBarcode, verifiedAvailableInPos);
            if (guardResult.statusCode !== 200) {
                return { statusCode: guardResult.statusCode, body: guardResult.body };
            }
            for (const bt of guardResult.clearedReturnedBilled) {
                appendAuditLog('MARKED_RETURNED_TO_STOCK', {
                    tagId: bt.id,
                    barcode: bt.barcode,
                    previousBillNo: bt.billedInBillNo,
                    reason: 'Verified back in POS stock / netSold <= 0 on re-add'
                });
            }

            const now = new Date();
            const numMrp = parseFloat(mrp) || 0;
            const numDisc = parseFloat(discountPercent) || 0;
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
                status: 'active', // Always starts 'active' once verified unbilled above
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
                date: now.toISOString().split('T')[0],
                billedInBillNo: null,
                billedAt: null,
                autoResolved: false
            };

            tags.push(newTag);
            writeTags(tags);
            appendAuditLog('TAG_ADDED', { tagId: newTag.id, barcode: newTag.barcode, articleName: newTag.articleName, mrp: newTag.mrp });

            return {
                statusCode: 200,
                body: {
                    success: true,
                    message: 'Pending tag added successfully.',
                    tag: newTag
                }
            };
        });

        res.status(outcome.statusCode).json(outcome.body);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/pending-tags/:id/mark-billed — manual resolution
router.post('/:id/mark-billed', async (req, res) => {
    try {
        const { billNo = 'MANUAL-COMBO', billedAmount } = req.body;
        const result = await withTagsLock(async () => {
            const localTags = readTags();
            const { tags } = await mergeTagsWithCloud(localTags);
            const tag = tags.find(t => t.id === req.params.id);
            if (!tag) return null;

            const nowIso = new Date().toISOString();
            tag.status = 'billed';
            tag.billedInBillNo = String(billNo).trim();
            tag.billedAt = nowIso;
            if (billedAmount !== undefined) tag.billedNet = parseFloat(billedAmount);
            tag.autoResolved = false;
            tag.resolvedAt = nowIso;
            tag.updatedAt = nowIso;

            writeTags(tags);
            appendAuditLog('MANUAL_MARK_BILLED', { tagId: tag.id, barcode: tag.barcode, billNo: tag.billedInBillNo });
            return tag;
        });

        if (!result) return res.status(404).json({ success: false, error: 'Tag not found' });
        res.json({ success: true, message: `Tag marked as billed in ${billNo}`, tag: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/pending-tags/:id/restore-active — 1-click failproof safety restore back to Active Pending
router.post('/:id/restore-active', async (req, res) => {
    try {
        const reason = String(req.body?.reason || 'Manually restored to active pending rack').trim();
        const result = await withTagsLock(async () => {
            const localTags = readTags();
            const { tags } = await mergeTagsWithCloud(localTags);
            const tag = tags.find(t => t.id === req.params.id);
            if (!tag) return null;

            const prevBill = tag.billedInBillNo;
            const nowIso = new Date().toISOString();
            tag.status = 'active';
            tag.restoredFromBillNo = prevBill || null;
            tag.billedInBillNo = null;
            tag.billedAt = null;
            tag.billedNet = null;
            tag.autoResolved = false;
            tag.resolvedAt = null;
            tag.manualRestoreAt = nowIso;
            tag.updatedAt = nowIso;

            writeTags(tags);
            appendAuditLog('MANUAL_RESTORED_ACTIVE', { tagId: tag.id, barcode: tag.barcode, prevBill, reason });
            return tag;
        });

        if (!result) return res.status(404).json({ success: false, error: 'Tag not found' });
        res.json({ success: true, message: `Restored "${result.articleName || result.barcode}" back to Active Pending!`, tag: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/pending-tags/:id — remove or void
router.delete('/:id', async (req, res) => {
    try {
        const result = await withTagsLock(async () => {
            const localTags = readTags();
            const { tags } = await mergeTagsWithCloud(localTags);
            const tag = tags.find(t => t.id === req.params.id);
            if (!tag) return null;

            const nowIso = new Date().toISOString();
            tag.status = 'void';
            tag.voidedAt = nowIso;
            tag.updatedAt = nowIso;
            writeTags(tags);
            appendAuditLog('TAG_VOIDED', { tagId: tag.id, barcode: tag.barcode, articleName: tag.articleName });
            return tag;
        });

        if (!result) return res.status(404).json({ success: false, error: 'Tag not found' });
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
router.parsePosTimeMs = parsePosTimeMs;
router.mergeTagsList = mergeTagsList;
router.buildCloudTagsPayload = buildCloudTagsPayload;
router.checkAndResolveBilledTags = checkAndResolveBilledTags;
router.verifyPosStockAndNetBilled = verifyPosStockAndNetBilled;
router.evaluateDuplicateAndBilledState = evaluateDuplicateAndBilledState;
router.appendAuditLog = appendAuditLog;


// POST /api/pending-tags/create-customer-hold — Put multiple tags into a dedicated customer hold bag
router.post('/create-customer-hold', async (req, res) => {
    try {
        const { tagIds = [], customerName, customerPhone = '', bagNo = '', notes = '' } = req.body;
        if (!customerName || !customerName.trim()) {
            return res.status(400).json({ success: false, error: 'Customer Name is required for Customer Hold' });
        }
        if (!Array.isArray(tagIds) || tagIds.length === 0) {
            return res.status(400).json({ success: false, error: 'At least one tag must be selected to hold' });
        }

        const batchId = 'hold_batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const now = new Date().toISOString();

        const modifiedCount = await withTagsLock(async () => {
            const localTags = readTags();
            const { tags } = await mergeTagsWithCloud(localTags);
            let count = 0;
            for (const tag of tags) {
                if (tagIds.includes(tag.id)) {
                    tag.holdForCustomer = true;
                    tag.holdBatchId = batchId;
                    tag.holdCustomerName = String(customerName).trim();
                    tag.holdCustomerPhone = String(customerPhone).replace(/[^0-9]/g, '').slice(-10);
                    tag.holdBagNo = String(bagNo || '').trim();
                    tag.holdNotes = String(notes || '').trim();
                    tag.holdCreatedAt = now;
                    tag.updatedAt = now;
                    count++;
                }
            }
            writeTags(tags);
            appendAuditLog('HOLD_CREATED', { batchId, customerName, count, tagIds });
            return count;
        });

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
router.post('/release-customer-hold', async (req, res) => {
    try {
        const { holdBatchId, tagIds } = req.body;
        if (!holdBatchId && (!Array.isArray(tagIds) || tagIds.length === 0)) {
            return res.status(400).json({ success: false, error: 'holdBatchId or tagIds is required' });
        }

        const now = new Date().toISOString();
        const releasedCount = await withTagsLock(async () => {
            const localTags = readTags();
            const { tags } = await mergeTagsWithCloud(localTags);
            let count = 0;
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
                    tag.updatedAt = now;
                    count++;
                }
            }
            writeTags(tags);
            appendAuditLog('HOLD_RELEASED', { holdBatchId, count });
            return count;
        });

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
router.post('/bill-customer-hold', async (req, res) => {
    try {
        const { holdBatchId, billNo = 'HOLD-COMBO', billedAmount } = req.body;
        if (!holdBatchId) {
            return res.status(400).json({ success: false, error: 'holdBatchId is required' });
        }

        const now = new Date().toISOString();
        const billedCount = await withTagsLock(async () => {
            const localTags = readTags();
            const { tags } = await mergeTagsWithCloud(localTags);
            let count = 0;
            for (const tag of tags) {
                if (tag.holdBatchId === holdBatchId && tag.status === 'active') {
                    tag.status = 'billed';
                    tag.billedInBillNo = String(billNo).trim();
                    tag.billedAt = now;
                    tag.autoResolved = false;
                    tag.resolvedAt = now;
                    tag.updatedAt = now;
                    if (billedAmount !== undefined) tag.billedNet = parseFloat(billedAmount);
                    count++;
                }
            }
            writeTags(tags);
            appendAuditLog('HOLD_BILLED', { holdBatchId, billNo, count });
            return count;
        });

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
