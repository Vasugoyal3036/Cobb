const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('./pending_tags');

const {
    checkAndResolveBilledTags,
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
