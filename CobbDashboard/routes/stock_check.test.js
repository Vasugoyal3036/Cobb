const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizeLookupQuery,
    barcodeKey,
    findMatchingSku,
    findSpecificVariantRow,
    buildStockCheckPayload,
    createStockCheckHandler
} = require('./stock_check');

function makeMockSql() {
    return { NVarChar: 'NVarChar' };
}

function makeMockDb(responsesByQueryPredicate) {
    const executedSql = [];
    const createRequest = () => {
        const inputs = {};
        return {
            input(name, _type, value) {
                inputs[name] = value;
            },
            async query(sqlText) {
                executedSql.push({ sqlText, inputs: { ...inputs } });
                for (const { test: pred, recordset } of responsesByQueryPredicate) {
                    if (pred(sqlText, inputs)) {
                        return { recordset };
                    }
                }
                return { recordset: [] };
            }
        };
    };
    return { createRequest, executedSql };
}

test('normalizeLookupQuery handles padded barcodes, all-zero codes, and whitespace', () => {
    assert.deepEqual(normalizeLookupQuery(' 0080058036 '), {
        query: '0080058036',
        cleanDigits: '80058036',
        paddedDigits: '0080058036'
    });
    assert.deepEqual(normalizeLookupQuery('80058036'), {
        query: '80058036',
        cleanDigits: '80058036',
        paddedDigits: '0080058036'
    });
    assert.deepEqual(normalizeLookupQuery('000'), {
        query: '000',
        cleanDigits: '000',
        paddedDigits: '0000000000'
    });
    assert.deepEqual(normalizeLookupQuery('CFMD4420'), {
        query: 'CFMD4420',
        cleanDigits: 'CFMD4420',
        paddedDigits: 'CFMD4420'
    });
});

test('barcodeKey trims spaces, uppercases, and normalizes leading zeros', () => {
    assert.equal(barcodeKey(' 0080058036  '), '80058036');
    assert.equal(barcodeKey('80058036'), '80058036');
    assert.equal(barcodeKey('000'), '000');
    assert.equal(barcodeKey('cfmd-4420'), 'CFMD-4420');
});

test('findMatchingSku short-circuits on Tier 1 exact index seek without running LIKE scans', async () => {
    const { createRequest, executedSql } = makeMockDb([
        {
            test: (s) => s.includes('s.product_Code = @q'),
            recordset: [{ barcode: '0080058036', articleNo: 'CFMD4420', itemName: 'COTTON SHIRT' }]
        }
    ]);

    let transitCalled = false;
    const match = await findMatchingSku({
        createRequest,
        sql: makeMockSql(),
        findSkuOrTransitFallback: async () => {
            transitCalled = true;
            return null;
        },
        ...normalizeLookupQuery('80058036'),
        allowNameWildcard: true
    });

    assert.equal(match.articleNo, 'CFMD4420');
    assert.equal(executedSql.length, 1);
    assert.equal(transitCalled, false);
});

test('findMatchingSku checks GIT/SKU fallback before wildcard name scan and skips wildcard for 6+ digit barcodes', async () => {
    const { createRequest, executedSql } = makeMockDb([]);
    const match = await findMatchingSku({
        createRequest,
        sql: makeMockSql(),
        findSkuOrTransitFallback: async () => null,
        ...normalizeLookupQuery('0080262036'),
        allowNameWildcard: true
    });

    assert.equal(match, null);
    assert.equal(executedSql.length, 2); // Tier 1 + Tier 2 only; NO Tier 4 LIKE '%...' scan on numeric barcode
    assert.equal(executedSql.some((q) => q.sqlText.includes("article_name LIKE '%'")), false);
});

test('findMatchingSku falls back to article_name wildcard for 2+ char non-numeric text search', async () => {
    const { createRequest, executedSql } = makeMockDb([
        {
            test: (s) => s.includes("s.article_name LIKE '%' + @q + '%'"),
            recordset: [{ barcode: '009911', articleNo: 'CBLZ-10', itemName: 'FORMAL BLAZER' }]
        }
    ]);
    const match = await findMatchingSku({
        createRequest,
        sql: makeMockSql(),
        findSkuOrTransitFallback: async () => null,
        ...normalizeLookupQuery('BLAZER'),
        allowNameWildcard: true
    });

    assert.equal(match.articleNo, 'CBLZ-10');
    assert.equal(executedSql.length, 3); // Tier 1 -> Tier 2 -> Tier 4
});

test('buildStockCheckPayload matches unpadded barcode, merges duplicate (color, size) rows, and preserves pending tags across barcodes', () => {
    const matched = {
        barcode: '0080058036',
        articleNo: 'CFMD4420',
        itemName: 'MEN CASUAL SHIRT',
        sectionName: 'SHIRTS',
        subSectionName: 'CASUAL',
        color: 'BEIGE',
        size: '40',
        sizeOrder: 3,
        mrp: 2499
    };

    const rows = [
        {
            barcode: '0080058036 ',
            articleNo: 'CFMD4420',
            itemName: 'MEN CASUAL SHIRT',
            sectionName: 'SHIRTS',
            subSectionName: '',
            color: 'BEIGE',
            size: '40',
            sizeOrder: 3,
            mrp: 2499,
            stock: 0,
            vendorEan: '89012345'
        },
        {
            barcode: '0080058099',
            articleNo: 'CFMD4420',
            itemName: 'MEN CASUAL SHIRT',
            sectionName: 'SHIRTS',
            subSectionName: '',
            color: 'BEIGE',
            size: '40',
            sizeOrder: 3,
            mrp: 2499,
            stock: 2,
            vendorEan: ''
        },
        {
            barcode: '0080058100',
            articleNo: 'CFMD4420',
            itemName: 'MEN CASUAL SHIRT',
            sectionName: 'SHIRTS',
            subSectionName: '',
            color: 'BEIGE',
            size: '42',
            sizeOrder: 4,
            mrp: 2499,
            stock: 0,
            vendorEan: ''
        }
    ];

    const allPendingTags = [
        {
            id: 'ptag_1',
            barcode: '80058036', // unpadded match to first batch barcode!
            articleNo: 'CFMD4420',
            color: 'BEIGE',
            size: '40',
            status: 'active',
            notes: 'Missing tag',
            mrp: 2499
        },
        {
            id: 'ptag_completed',
            barcode: '0080058100',
            articleNo: 'CFMD4420',
            color: 'BEIGE',
            size: '42',
            status: 'completed',
            mrp: 2499
        }
    ];

    const norm = normalizeLookupQuery('80058036');
    const payload = buildStockCheckPayload({ matched, rows, allPendingTags, ...norm });

    assert.equal(payload.success, true);
    assert.equal(payload.matchedBarcode, '0080058036');
    assert.equal(payload.matchedColor, 'BEIGE');
    assert.equal(payload.matchedSize, '40');
    assert.equal(payload.totalStock, 2);
    assert.equal(payload.hasPendingTags, true);
    assert.equal(payload.totalPendingTags, 1);

    assert.equal(payload.colors.length, 1);
    assert.equal(payload.colors[0].sizes.length, 1); // Size 42 has 0 stock and only completed pending tag -> omitted from size list
    const size40 = payload.colors[0].sizes[0];
    assert.equal(size40.size, '40');
    assert.equal(size40.stock, 2);
    assert.equal(size40.pendingTagsCount, 1); // Not overwritten to 0 by second row!
    assert.deepEqual(size40.barcodes, ['0080058036', '0080058099']);
});

test('findSpecificVariantRow prioritizes vendorEan and unpadded/padded barcode matches', () => {
    const rows = [
        { barcode: '0080011111', vendorEan: 'EAN-A', color: 'RED', size: 'M', stock: 1 },
        { barcode: '0080022222', vendorEan: 'EAN-B', color: 'NAVY', size: 'L', stock: 3 }
    ];
    assert.equal(findSpecificVariantRow(rows, '80022222', '80022222', '0080022222').color, 'NAVY');
    assert.equal(findSpecificVariantRow(rows, 'EAN-B', 'EAN-B', 'EAN-B').color, 'NAVY');
});

test('createStockCheckHandler validates missing query and serves inbound GIT fallback items', async () => {
    const { createRequest } = makeMockDb([]);
    const handler = createStockCheckHandler({
        createRequest,
        sql: makeMockSql(),
        findSkuOrTransitFallback: async (q) => (
            q === 'GIT999'
                ? {
                    barcode: 'GIT999',
                    articleNo: 'CBLZ-GIT',
                    itemName: 'INBOUND BLAZER',
                    sectionName: 'BLAZERS',
                    subSectionName: '',
                    color: 'CHARCOAL',
                    size: '42',
                    sizeOrder: 4,
                    mrp: 5999,
                    isInboundTransit: true
                }
                : null
        ),
        readPendingTags: () => []
    });

    const createRes = () => ({
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; }
    });

    const emptyRes = createRes();
    await handler({ query: {} }, emptyRes);
    assert.equal(emptyRes.body.success, false);
    assert.match(emptyRes.body.message, /required/i);

    const gitRes = createRes();
    await handler({ query: { q: 'GIT999' } }, gitRes);
    assert.equal(gitRes.body.success, true);
    assert.equal(gitRes.body.articleNo, 'CBLZ-GIT');
    assert.equal(gitRes.body.totalStock, 1);
    assert.equal(gitRes.body.matchedColor, 'CHARCOAL');
});

