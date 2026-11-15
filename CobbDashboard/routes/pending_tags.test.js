const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('./pending_tags');

const {
    checkAndResolveBilledTags,
    verifyPosStockAndNetBilled,
    evaluateDuplicateAndBilledState,
    mergeTagsList,
    buildCloudTagsPayload,
    parsePosTimeMs
} = router;

test('parsePosTimeMs treats naive SQL IST timestamps as +05:30 accurately against UTC ISO strings', () => {
    const utcCreated = new Date('2026-11-10T07:00:00.000Z').getTime(); // 12:30:00 IST
    const sqlBillBefore = parsePosTimeMs('2026-11-10T12:28:00.000');     // 12:28:00 IST = 06:58 UTC
    const sqlBillAfter = parsePosTimeMs('2026-11-10T12:35:00.000');      // 12:35:00 IST = 07:05 UTC

    assert.ok(sqlBillBefore < utcCreated, 'Bill at 12:28 IST must be strictly before 12:30 IST (07:00 UTC)');
    assert.ok(sqlBillAfter > utcCreated, 'Bill at 12:35 IST must be strictly after 12:30 IST (07:00 UTC)');
});

test('NEVER resolves a tag when billed earlier than creation (e.g. 60 seconds earlier)', async () => {
    const tags = [
        {
            id: 'ptag_1',
            barcode: '0080058036',
            articleName: 'CASUAL FULL SL',
            status: 'active',
            createdAt: '2026-11-10T07:05:00.000Z' // 12:35:00 IST
        }
    ];

    const mockSql = async () => ({
        recordset: [
            {
                Barcode: '0080058036',
                BillNo: 'STST27-01088',
                BillTime: '2026-11-10T12:34:00.000', // 60 seconds BEFORE tag creation
                Cancelled: 0,
                BilledNet: 1200,
                BilledMRP: 2999,
                BilledQty: 1
            }
        ]
    });

    const result = await checkAndResolveBilledTags(tags, mockSql);
    assert.equal(result.changed, false);
    assert.equal(tags[0].status, 'active');
    assert.equal(result.resolvedTags.length, 0);
});

test('NEVER resolves a tag if POS sale (+1) was offset by return/exchange (-1) so netQty = 0', async () => {
    const tags = [
        {
            id: 'ptag_2',
            barcode: '0081194506',
            articleName: 'DENIM',
            status: 'active',
            createdAt: '2026-11-10T07:00:00.000Z' // 12:30:00 IST
        }
    ];

    const mockSql = async () => ({
        recordset: [
            {
                Barcode: '0081194506',
                BillNo: 'STST27-01090',
                BillTime: '2026-11-10T12:40:00.000',
                Cancelled: 0,
                BilledNet: -1720,
                BilledMRP: 4299,
                BilledQty: -1
            },
            {
                Barcode: '0081194506',
                BillNo: 'STST27-01089',
                BillTime: '2026-11-10T12:35:00.000',
                Cancelled: 0,
                BilledNet: 1720,
                BilledMRP: 4299,
                BilledQty: 1
            }
        ]
    });

    const result = await checkAndResolveBilledTags(tags, mockSql);
    assert.equal(result.changed, false);
    assert.equal(tags[0].status, 'active');
    assert.equal(result.resolvedTags.length, 0);
});

test('NEVER resolves a tag when matching POS bill is CANCELLED = 1, and auto-restores previously auto-resolved tags if bill gets cancelled later', async () => {
    const recentIso = new Date(Date.now() - 60000).toISOString();
    const tags = [
        {
            id: 'ptag_previously_resolved',
            barcode: '0082673505',
            articleName: 'CORDUROY TROUSER',
            status: 'billed',
            autoResolved: true,
            billedInBillNo: 'STST27-01091',
            billedAt: recentIso,
            resolvedAt: recentIso,
            createdAt: new Date(Date.now() - 300000).toISOString()
        },
        {
            id: 'ptag_active_cancelled',
            barcode: '0071294026',
            articleName: 'JACKET-EXCISE',
            status: 'active',
            createdAt: new Date(Date.now() - 300000).toISOString()
        }
    ];

    const mockSql = async (q) => {
        if (q.includes('FROM CMM01106')) {
            return {
                recordset: [{ BillNo: 'STST27-01091', Cancelled: 1 }]
            };
        }
        return {
            recordset: [
                {
                    Barcode: '0071294026',
                    BillNo: 'STST27-01092',
                    BillTime: new Date().toISOString(),
                    Cancelled: 1,
                    BilledNet: 1999,
                    BilledMRP: 4999,
                    BilledQty: 1
                }
            ]
        };
    };

    const result = await checkAndResolveBilledTags(tags, mockSql);
    assert.equal(result.changed, true);
    assert.equal(tags[0].status, 'active');
    assert.equal(tags[0].restoredFromCancelledBill, 'STST27-01091');
    assert.equal(result.restoredTags.length, 1);

    // Active tag whose candidate bill is cancelled remains active
    assert.equal(tags[1].status, 'active');
    assert.equal(result.resolvedTags.length, 0);
});

test('Enforces strict 1-to-1 bill quantity slot consumption (1 sold qty clears at most 1 tag)', async () => {
    const createdAt = '2026-11-10T07:00:00.000Z';
    const tags = [
        { id: 'ptag_a', barcode: '0080058036', articleName: 'SHIRT', status: 'active', createdAt },
        { id: 'ptag_b', barcode: '0080058036', articleName: 'SHIRT', status: 'active', createdAt }
    ];

    const mockSql = async () => ({
        recordset: [
            {
                Barcode: '0080058036',
                BillNo: 'STST27-01095',
                BillTime: '2026-11-10T12:40:00.000',
                Cancelled: 0,
                BilledNet: 1000,
                BilledMRP: 2999,
                BilledQty: 1
            }
        ]
    });

    const result = await checkAndResolveBilledTags(tags, mockSql);
    assert.equal(result.changed, true);
    assert.equal(result.resolvedTags.length, 1);
    assert.equal(tags.filter(t => t.status === 'billed').length, 1);
    assert.equal(tags.filter(t => t.status === 'active').length, 1);
});

test('mergeTagsList preserves tags added in Cloud Firestore offline/Phone Link during local sync', () => {
    const localTags = [
        { id: 'ptag_1', barcode: '0011111111', status: 'active', createdAt: '2026-11-10T06:00:00.000Z' }
    ];
    const cloudTags = [
        { id: 'ptag_1', barcode: '0011111111', status: 'active', createdAt: '2026-11-10T06:00:00.000Z' },
        { id: 'ptag_cloud_2', barcode: '0022222222', status: 'active', createdAt: '2026-11-10T06:30:00.000Z' },
        { id: 'ptag_cloud_3', barcode: '0033333333', status: 'active', createdAt: '2026-11-10T06:31:00.000Z' }
    ];

    const { merged, mergedFromCloudCount } = mergeTagsList(localTags, cloudTags);
    assert.equal(mergedFromCloudCount, 2);
    assert.equal(merged.length, 3);
    assert.equal(merged.filter(t => t.status === 'active').length, 3);
});

test('buildCloudTagsPayload ALWAYS preserves 100% of active tags even when historical records exceed 300', () => {
    const tags = [];
    // Oldest tag is still ACTIVE!
    tags.push({ id: 'ptag_old_active', barcode: '0099999999', status: 'active' });
    // Add 350 billed history records
    for (let i = 0; i < 350; i++) {
        tags.push({ id: `ptag_hist_${i}`, barcode: `000000${i}`, status: 'billed' });
    }
    // Add newest active tag
    tags.push({ id: 'ptag_new_active', barcode: '0088888888', status: 'active' });

    const payload = buildCloudTagsPayload(tags);
    const activeIds = payload.filter(t => t.status === 'active').map(t => t.id);
    assert.deepEqual(activeIds, ['ptag_old_active', 'ptag_new_active']);
    assert.equal(payload.filter(t => t.status === 'billed').length, 250);
});

test('verifyPosStockAndNetBilled marks returned garment in PMT01106 stock as available even after prior sale', async () => {
    const mockCreateRequest = () => ({
        input() { return this; },
        async query(q) {
            if (q.includes('FROM PMT01106')) {
                return { recordset: [{ stock: 1 }] };
            }
            throw new Error('Should not query CMD01106 when PMT01106 stock > 0');
        }
    });

    const res = await verifyPosStockAndNetBilled('0079385464', mockCreateRequest);
    assert.equal(res.preSqlCheck, null);
    assert.equal(res.verifiedAvailableInPos, true);
});

test('verifyPosStockAndNetBilled blocks when stock is 0 and netSold > 0, allows when netSold <= 0', async () => {
    const mockBlockedRequest = () => ({
        input() { return this; },
        async query(q) {
            if (q.includes('FROM PMT01106')) return { recordset: [{ stock: 0 }] };
            return {
                recordset: [
                    { barcode: '0090123456', billNo: 'STST27-00999', billTime: '2026-11-10T14:00:00.000', netAmount: 1999, qty: 1 }
                ]
            };
        }
    });
    const blocked = await verifyPosStockAndNetBilled('0090123456', mockBlockedRequest);
    assert.equal(blocked.verifiedAvailableInPos, false);
    assert.equal(blocked.preSqlCheck?.billNo, 'STST27-00999');

    const mockReturnedRequest = () => ({
        input() { return this; },
        async query(q) {
            if (q.includes('FROM PMT01106')) return { recordset: [{ stock: 0 }] };
            return {
                recordset: [
                    { barcode: '0079385464', billNo: 'STST27-01030', billTime: '2026-11-07T14:00:00.000', netAmount: -3800, qty: -1 },
                    { barcode: '0079385464', billNo: 'STST27-00995', billTime: '2026-11-04T14:00:00.000', netAmount: 3800, qty: 1 }
                ]
            };
        }
    });
    const allowed = await verifyPosStockAndNetBilled('0079385464', mockReturnedRequest);
    assert.equal(allowed.preSqlCheck, null);
    assert.equal(allowed.verifiedAvailableInPos, true);
});

test('evaluateDuplicateAndBilledState allows re-adding returned historical billed tag once POS confirms availability, while strictly blocking active or unreturned billed tags', () => {
    const tags = [
        {
            id: 'ptag_1793786666828_828n0w',
            barcode: '0079385464',
            articleName: 'BLAZER - EX',
            status: 'billed',
            billedInBillNo: 'STST27-00995',
            billedAt: '2026-11-04T10:00:00.000Z'
        },
        {
            id: 'ptag_active_1',
            barcode: '0080727340',
            articleName: 'ACTIVE ITEM',
            mrp: 2999,
            status: 'active'
        }
    ];

    // Without POS verification, historical billed tag stays blocked
    const blockedRes = evaluateDuplicateAndBilledState(tags, '0079385464', false);
    assert.equal(blockedRes.statusCode, 409);
    assert.equal(blockedRes.body.billed, true);
    assert.equal(tags[0].returnedToStock, undefined);

    // With POS stock / netSold <= 0 verification, historical billed tag is marked returnedToStock and allowed
    const clearedRes = evaluateDuplicateAndBilledState(tags, '0079385464', true);
    assert.equal(clearedRes.statusCode, 200);
    assert.equal(clearedRes.clearedReturnedBilled.length, 1);
    assert.equal(tags[0].returnedToStock, true);
    assert.ok(tags[0].returnedToStockAt);

    // Active pending tag is ALWAYS blocked even if verifiedAvailableInPos = true
    const activeBlocked = evaluateDuplicateAndBilledState(tags, '0080727340', true);
    assert.equal(activeBlocked.statusCode, 409);
    assert.equal(activeBlocked.body.duplicate, true);
    assert.equal(activeBlocked.body.billed, undefined);
});

// ============================================================
// EXCHANGE / ITEM SWAP UNIT TESTS
// ============================================================

const { isBarcodeDuplicate, mergeTagsList: _mTL } = router;

// Helper: build a minimal active pending tag
function makeTag(overrides = {}) {
    return {
        id: 'ptag_exc_1',
        barcode: '0079111001',
        articleNo: 'ART001',
        articleName: 'ORIGINAL SHIRT',
        size: 'L',
        color: 'Blue',
        section: 'GENTS',
        mrp: 2999,
        soldPrice: 1200,
        discountPercent: 60,
        status: 'active',
        createdAt: new Date().toISOString(),
        ...overrides
    };
}

// Helper: simulate the exchange mutation logic (pure function extracted from route)
function simulateExchange(tags, tagId, payload) {
    const tag = tags.find(t => t.id === tagId);
    if (!tag) return { error: 'NOT_FOUND' };
    if (tag.status !== 'active') return { error: 'NOT_ACTIVE', status: tag.status };

    const candidateBarcode = String(payload.newBarcode).trim();
    const activeDup = tags.find(t => t.id !== tag.id && t.status === 'active' && isBarcodeDuplicate(t.barcode, candidateBarcode));
    if (activeDup) return { error: 'DUPLICATE_ACTIVE', existingTag: activeDup };

    const nowIso = new Date().toISOString();
    const oldSoldPrice = Number(tag.soldPrice) || 0;
    const resolvedNewSoldPrice = Number(payload.newSoldPrice) || 0;
    const differenceAmount = resolvedNewSoldPrice - oldSoldPrice;
    const differenceType = Math.abs(differenceAmount) < 1 ? 'even' : differenceAmount > 0 ? 'extra' : 'refund';

    const oldSnapshot = {
        exchangedAt: nowIso,
        previousBarcode: tag.barcode,
        previousArticleName: tag.articleName,
        previousSoldPrice: oldSoldPrice,
        newBarcode: candidateBarcode,
        newArticleName: payload.newArticleName || '',
        newSoldPrice: resolvedNewSoldPrice,
        differenceAmount,
        differenceType,
        exchangedBy: payload.exchangedBy || 'Cashier'
    };

    tag.returnedToStock = true;
    tag.returnedToStockAt = nowIso;
    tag.barcode = candidateBarcode;
    tag.articleName = payload.newArticleName || tag.articleName;
    tag.mrp = Number(payload.newMrp) || tag.mrp;
    tag.soldPrice = resolvedNewSoldPrice || tag.soldPrice;
    if (!Array.isArray(tag.exchangeHistory)) tag.exchangeHistory = [];
    tag.exchangeHistory.push(oldSnapshot);
    tag.updatedAt = nowIso;

    return { tag, exchangeRecord: oldSnapshot };
}

test('exchange: even swap — same MRP/soldPrice produces differenceType "even"', () => {
    const tags = [makeTag()];
    const result = simulateExchange(tags, 'ptag_exc_1', {
        newBarcode: '0079111999',
        newArticleName: 'REPLACEMENT SHIRT',
        newMrp: 2999,
        newSoldPrice: 1200,  // same as original
        exchangedBy: 'Cashier'
    });
    assert.ok(!result.error, 'Should not error');
    assert.equal(result.exchangeRecord.differenceType, 'even');
    assert.ok(Math.abs(result.exchangeRecord.differenceAmount) < 1);
    assert.equal(result.tag.barcode, '0079111999');
    assert.equal(result.tag.returnedToStock, true);
    assert.ok(result.tag.exchangeHistory?.length === 1);
    assert.equal(result.exchangeRecord.previousBarcode, '0079111001');
});

test('exchange: upgrade — higher soldPrice produces differenceType "extra"', () => {
    const tags = [makeTag()];
    const result = simulateExchange(tags, 'ptag_exc_1', {
        newBarcode: '0079222001',
        newArticleName: 'PREMIUM SHIRT',
        newMrp: 3999,
        newSoldPrice: 1600, // 400 more than original 1200
        exchangedBy: 'Manager'
    });
    assert.ok(!result.error);
    assert.equal(result.exchangeRecord.differenceType, 'extra');
    assert.equal(result.exchangeRecord.differenceAmount, 400);
    assert.equal(result.tag.soldPrice, 1600);
    assert.equal(result.tag.mrp, 3999);
});

test('exchange: downgrade — lower soldPrice produces differenceType "refund"', () => {
    const tags = [makeTag()];
    const result = simulateExchange(tags, 'ptag_exc_1', {
        newBarcode: '0079333001',
        newArticleName: 'BUDGET SHIRT',
        newMrp: 1999,
        newSoldPrice: 800, // 400 less than original 1200
        exchangedBy: 'Staff'
    });
    assert.ok(!result.error);
    assert.equal(result.exchangeRecord.differenceType, 'refund');
    assert.equal(result.exchangeRecord.differenceAmount, -400);
    assert.equal(result.tag.barcode, '0079333001');
});

test('exchange: rejects duplicate active barcode', () => {
    const tags = [
        makeTag({ id: 'ptag_exc_1', barcode: '0079111001' }),
        makeTag({ id: 'ptag_exc_2', barcode: '0079444001', articleName: 'ALREADY ACTIVE ITEM' })
    ];
    const result = simulateExchange(tags, 'ptag_exc_1', {
        newBarcode: '0079444001', // already active
        newSoldPrice: 1200
    });
    assert.equal(result.error, 'DUPLICATE_ACTIVE');
    assert.ok(result.existingTag);
    // Original tag must be unchanged
    assert.equal(tags[0].barcode, '0079111001');
    assert.equal(tags[0].returnedToStock, undefined);
});

test('exchange: rejects exchange on billed (non-active) tag', () => {
    const tags = [makeTag({ status: 'billed' })];
    const result = simulateExchange(tags, 'ptag_exc_1', {
        newBarcode: '0079555001',
        newSoldPrice: 1200
    });
    assert.equal(result.error, 'NOT_ACTIVE');
    assert.equal(result.status, 'billed');
});


