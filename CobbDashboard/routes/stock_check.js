/**
 * Fast, SARGABLE stock checker & SKU lookup helpers.
 *
 * Uses tiered SQL index seeks (exact barcode/article -> article prefix -> GIT/SKU mirror
 * fallback -> filtered name substring search) to eliminate full-table scans on SKU_NAMES.
 */

const SKU_SELECT_COLUMNS = `
    RTRIM(s.product_Code) as barcode,
    RTRIM(s.article_no) as articleNo,
    ISNULL(s.article_name, s.section_name) as itemName,
    s.section_name as sectionName,
    ISNULL(s.sub_section_name, '') as subSectionName,
    ISNULL(s.para1_name, 'Standard') as color,
    ISNULL(s.para2_name, 'Standard') as size,
    ISNULL(s.para2_order, 99) as sizeOrder,
    ISNULL(s.mrp, 0) as mrp
`;

/**
 * Normalize a barcode, article, or text query into exact, unpadded, and 10-digit zero-padded forms.
 * Keeps all-zero queries (e.g. "000") intact instead of collapsing to empty string.
 */
function normalizeLookupQuery(rawQuery) {
    const query = String(rawQuery || '').trim();
    const cleanDigits = query.replace(/^0+/, '') || query;
    const paddedDigits = query.length < 10 && /^\d+$/.test(query)
        ? query.padStart(10, '0')
        : query;
    return { query, cleanDigits, paddedDigits };
}

/**
 * Canonical comparison key for barcodes: trims whitespace, uppercases, and strips leading zeros.
 */
function barcodeKey(code) {
    const trimmed = String(code || '').trim().toUpperCase();
    if (!trimmed) return '';
    return trimmed.replace(/^0+/, '') || trimmed;
}

const normalizeColorToken = (c) => String(c || 'Standard').trim().toUpperCase();
const normalizeSizeToken = (s) => String(s || 'Standard').trim().toUpperCase();
const cleanSizeToken = (s) => normalizeSizeToken(s).split(/[\s(]/)[0];

/**
 * Tiered SKU resolver shared by stock-check and quick-scan endpoints.
 * Short-circuits as soon as an indexed tier finds a match.
 */
async function findMatchingSku({
    createRequest,
    sql,
    findSkuOrTransitFallback,
    query,
    cleanDigits,
    paddedDigits,
    allowNameWildcard = false
}) {
    if (!query) return null;

    // Tier 1: Direct SARGABLE index seek on product_Code, VENDOR_EAN_NO, or exact article_no
    const tier1Req = createRequest();
    tier1Req.input('q', sql.NVarChar, query);
    tier1Req.input('cleanDigits', sql.NVarChar, cleanDigits);
    tier1Req.input('paddedDigits', sql.NVarChar, paddedDigits);

    const tier1Res = await tier1Req.query(`
        SELECT TOP 1 ${SKU_SELECT_COLUMNS}
        FROM SKU_NAMES s WITH (NOLOCK)
        WHERE s.product_Code = @q
           OR s.product_Code = @cleanDigits
           OR s.product_Code = @paddedDigits
           OR s.VENDOR_EAN_NO = @q
           OR s.VENDOR_EAN_NO = @cleanDigits
           OR s.article_no = @q
    `);
    if (tier1Res.recordset && tier1Res.recordset[0]) {
        return tier1Res.recordset[0];
    }

    // Tier 2: SARGABLE prefix seek on article_no (e.g. partial article code)
    const tier2Req = createRequest();
    tier2Req.input('q', sql.NVarChar, query);
    const tier2Res = await tier2Req.query(`
        SELECT TOP 1 ${SKU_SELECT_COLUMNS}
        FROM SKU_NAMES s WITH (NOLOCK)
        WHERE s.article_no LIKE @q + '%'
    `);
    if (tier2Res.recordset && tier2Res.recordset[0]) {
        return tier2Res.recordset[0];
    }

    // Tier 3: Live SKU or Inbound Transit Challan (DOCWSL_SKU_MIRROR) before wildcard scan
    if (typeof findSkuOrTransitFallback === 'function') {
        const transitMatch = await findSkuOrTransitFallback(query, cleanDigits, paddedDigits);
        if (transitMatch) return transitMatch;
    }

    // Tier 4: Substring match on article_name ONLY for non-barcode multi-char text searches
    const looksLikeNumericBarcode = /^\d{6,}$/.test(query);
    if (allowNameWildcard && query.length >= 2 && !looksLikeNumericBarcode) {
        const tier4Req = createRequest();
        tier4Req.input('q', sql.NVarChar, query);
        const tier4Res = await tier4Req.query(`
            SELECT TOP 1 ${SKU_SELECT_COLUMNS}
            FROM SKU_NAMES s WITH (NOLOCK)
            WHERE s.article_name LIKE '%' + @q + '%'
        `);
        if (tier4Res.recordset && tier4Res.recordset[0]) {
            return tier4Res.recordset[0];
        }
    }

    return null;
}

/**
 * Fetch all color/size SKU variants and live POS stock for a matched article_no.
 */
async function fetchArticleVariants({ createRequest, sql, articleNo }) {
    if (!articleNo) return [];
    const variantReq = createRequest();
    variantReq.input('art', sql.NVarChar, articleNo);
    const variantsRes = await variantReq.query(`
        SELECT
            RTRIM(s.product_Code) as barcode,
            RTRIM(s.article_no) as articleNo,
            ISNULL(s.article_name, s.section_name) as itemName,
            s.section_name as sectionName,
            ISNULL(s.sub_section_name, '') as subSectionName,
            ISNULL(s.para1_name, 'Standard') as color,
            ISNULL(s.para2_name, 'Standard') as size,
            ISNULL(s.para2_order, 99) as sizeOrder,
            ISNULL(s.mrp, 0) as mrp,
            ISNULL(p.quantity_in_stock, 0) as stock,
            RTRIM(ISNULL(s.VENDOR_EAN_NO, '')) as vendorEan
        FROM SKU_NAMES s WITH (NOLOCK)
        LEFT JOIN PMT01106 p WITH (NOLOCK) ON s.product_Code = p.product_code
        WHERE s.article_no = @art
        ORDER BY s.para1_name, s.para2_order, s.para2_name
    `);
    return variantsRes.recordset || [];
}

/**
 * Find the exact scanned variant row matching padded/unpadded barcode or vendor EAN.
 */
function findSpecificVariantRow(rows, query, cleanDigits, paddedDigits) {
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const candidateKeys = new Set(
        [query, cleanDigits, paddedDigits].map(barcodeKey).filter(Boolean)
    );
    return (
        rows.find((r) => {
            const bKey = barcodeKey(r.barcode);
            const eKey = barcodeKey(r.vendorEan);
            return (bKey && candidateKeys.has(bKey)) || (eKey && candidateKeys.has(eKey));
        }) || rows[0]
    );
}

function serializePendingTagSummary(t, fallbackMrp) {
    return {
        id: t.id,
        barcode: String(t.barcode || '').trim(),
        size: t.size,
        color: t.color,
        notes: t.notes || '',
        mrp: t.mrp || fallbackMrp,
        soldPrice: t.soldPrice,
        salesperson: t.salesperson || '',
        createdAt: t.createdAt
    };
}

/**
 * Build the structured stock-checker response payload with grouped colors, sizes,
 * merged duplicate barcodes, and active pending tag overlays.
 */
function buildStockCheckPayload({
    matched,
    rows,
    allPendingTags = [],
    query,
    cleanDigits,
    paddedDigits
}) {
    const normalizedRows = (rows || []).map((r) => ({
        ...r,
        barcode: String(r.barcode || '').trim(),
        articleNo: String(r.articleNo || matched.articleNo || '').trim(),
        color: String(r.color || 'Standard').trim() || 'Standard',
        size: String(r.size || 'Standard').trim() || 'Standard',
        vendorEan: String(r.vendorEan || '').trim(),
        stock: Math.max(0, Number(r.stock) || 0),
        sizeOrder: Number(r.sizeOrder) || 99,
        mrp: Number(r.mrp) || 0
    }));

    const matchedArticle = String(matched.articleNo || normalizedRows[0]?.articleNo || '').trim();
    const matchedItemName = matched.itemName || normalizedRows[0]?.itemName || 'Apparel Item';
    const matchedSection = matched.sectionName || normalizedRows[0]?.sectionName || 'Apparel';
    const matchedSubSection = matched.subSectionName || normalizedRows[0]?.subSectionName || '';
    const mrp = normalizedRows[0]?.mrp || Number(matched.mrp) || 0;
    const totalStock = normalizedRows.reduce((sum, r) => sum + r.stock, 0);

    // Active pending tags matching this articleNo or any of its variant barcodes
    const artUpper = matchedArticle.toUpperCase();
    const variantBarcodeKeys = new Set(
        normalizedRows.map((r) => barcodeKey(r.barcode)).filter(Boolean)
    );
    const activePendingForArticle = (Array.isArray(allPendingTags) ? allPendingTags : []).filter((t) => {
        if (!t || t.status !== 'active') return false;
        const tagArt = String(t.articleNo || '').trim().toUpperCase();
        const tagBcKey = barcodeKey(t.barcode);
        return (artUpper && tagArt === artUpper) || (tagBcKey && variantBarcodeKeys.has(tagBcKey));
    });

    const getPendingTagsForVariant = (clr, sz, barcodes = []) => {
        const normClr = normalizeColorToken(clr);
        const normSz = normalizeSizeToken(sz);
        const tokenSz = cleanSizeToken(sz);
        const bcodeKeys = new Set(barcodes.map(barcodeKey).filter(Boolean));
        const seen = new Set();

        return activePendingForArticle.filter((t) => {
            const uid = t.id || `${barcodeKey(t.barcode)}:${normalizeColorToken(t.color)}:${normalizeSizeToken(t.size)}`;
            if (seen.has(uid)) return false;

            const tBcKey = barcodeKey(t.barcode);
            if (tBcKey && bcodeKeys.has(tBcKey)) {
                seen.add(uid);
                return true;
            }

            const tClr = normalizeColorToken(t.color);
            if (tClr !== normClr && tClr !== 'STANDARD' && normClr !== 'STANDARD') return false;

            const tSz = normalizeSizeToken(t.size);
            const tToken = cleanSizeToken(t.size);
            if (tSz === normSz || (tokenSz && tToken === tokenSz)) {
                seen.add(uid);
                return true;
            }
            return false;
        });
    };

    // Pass 1: Aggregate rows by (color, size) collecting all barcodes before pending tag overlay
    const colorMap = {};
    for (const r of normalizedRows) {
        const clr = r.color;
        if (!colorMap[clr]) {
            colorMap[clr] = { color: clr, totalStock: 0, sizeBuckets: {} };
        }
        colorMap[clr].totalStock += r.stock;

        const sz = r.size;
        if (!colorMap[clr].sizeBuckets[sz]) {
            colorMap[clr].sizeBuckets[sz] = {
                size: sz,
                stock: 0,
                barcode: r.barcode,
                barcodes: [],
                vendorEan: r.vendorEan,
                sizeOrder: r.sizeOrder
            };
        }
        const bucket = colorMap[clr].sizeBuckets[sz];
        bucket.stock += r.stock;
        if (!bucket.barcode && r.barcode) bucket.barcode = r.barcode;
        if (!bucket.vendorEan && r.vendorEan) bucket.vendorEan = r.vendorEan;
        if (r.sizeOrder < bucket.sizeOrder) bucket.sizeOrder = r.sizeOrder;
        if (r.barcode && !bucket.barcodes.includes(r.barcode)) {
            bucket.barcodes.push(r.barcode);
        }
    }

    // Pass 2: Overlay active pending tags onto existing buckets & create buckets for orphaned pending tags
    for (const c of Object.values(colorMap)) {
        c.sizeMap = {};
        for (const bucket of Object.values(c.sizeBuckets)) {
            const matchingPending = getPendingTagsForVariant(c.color, bucket.size, bucket.barcodes);
            if (bucket.stock > 0 || matchingPending.length > 0) {
                c.sizeMap[bucket.size] = {
                    size: bucket.size,
                    stock: bucket.stock,
                    pendingTagsCount: matchingPending.length,
                    pendingTagDetails: matchingPending.map((t) => serializePendingTagSummary(t, mrp)),
                    hasPendingTag: matchingPending.length > 0,
                    barcode: bucket.barcode,
                    barcodes: bucket.barcodes,
                    vendorEan: bucket.vendorEan,
                    sizeOrder: bucket.sizeOrder
                };
            }
        }
    }

    for (const t of activePendingForArticle) {
        const clr = String(t.color || 'Standard').trim() || 'Standard';
        const sz = String(t.size || 'Standard').trim() || 'Standard';
        if (!colorMap[clr]) {
            colorMap[clr] = { color: clr, totalStock: 0, sizeMap: {} };
        }
        if (!colorMap[clr].sizeMap) colorMap[clr].sizeMap = {};

        // Skip orphaned placement if this pending tag's barcode is already represented in another color/size bucket
        const tBcKey = barcodeKey(t.barcode);
        const alreadyPlaced = Object.values(colorMap).some((col) =>
            Object.values(col.sizeMap || {}).some((s) =>
                (s.pendingTagDetails || []).some((d) => d.id === t.id || (tBcKey && barcodeKey(d.barcode) === tBcKey))
            )
        );
        if (alreadyPlaced) continue;

        if (!colorMap[clr].sizeMap[sz]) {
            const matchingPending = getPendingTagsForVariant(clr, sz, [t.barcode]);
            colorMap[clr].sizeMap[sz] = {
                size: sz,
                stock: 0,
                pendingTagsCount: matchingPending.length,
                pendingTagDetails: matchingPending.map((x) => serializePendingTagSummary(x, mrp)),
                hasPendingTag: matchingPending.length > 0,
                barcode: String(t.barcode || '').trim(),
                barcodes: t.barcode ? [String(t.barcode).trim()] : [],
                vendorEan: '',
                sizeOrder: 99
            };
        }
    }

    const colors = Object.values(colorMap).map((c) => {
        const sizeList = Object.values(c.sizeMap || {}).sort((a, b) => a.sizeOrder - b.sizeOrder);
        const pendingTagsCount = sizeList.reduce((sum, s) => sum + (s.pendingTagsCount || 0), 0);
        return {
            color: c.color,
            totalStock: c.totalStock,
            pendingTagsCount,
            hasPendingTags: pendingTagsCount > 0,
            sizes: sizeList
        };
    });

    // Aggregated sizes across all colors
    const sizeMap = {};
    for (const r of normalizedRows) {
        if (!sizeMap[r.size]) {
            sizeMap[r.size] = {
                size: r.size,
                stock: 0,
                pendingTagsCount: 0,
                hasPendingTag: false,
                barcode: r.barcode,
                sizeOrder: r.sizeOrder
            };
        }
        sizeMap[r.size].stock += r.stock;
        if (r.sizeOrder < sizeMap[r.size].sizeOrder) sizeMap[r.size].sizeOrder = r.sizeOrder;
    }

    for (const c of colors) {
        for (const s of c.sizes || []) {
            if (!sizeMap[s.size]) {
                sizeMap[s.size] = {
                    size: s.size,
                    stock: 0,
                    pendingTagsCount: 0,
                    hasPendingTag: false,
                    barcode: s.barcode,
                    sizeOrder: s.sizeOrder || 99
                };
            }
            sizeMap[s.size].pendingTagsCount += s.pendingTagsCount || 0;
            sizeMap[s.size].hasPendingTag = sizeMap[s.size].pendingTagsCount > 0;
        }
    }

    const sizes = Object.values(sizeMap).sort((a, b) => a.sizeOrder - b.sizeOrder);
    const specificMatch = findSpecificVariantRow(normalizedRows, query, cleanDigits, paddedDigits);

    return {
        success: true,
        articleNo: matchedArticle,
        itemName: matchedItemName,
        sectionName: matchedSection,
        subSectionName: matchedSubSection,
        mrp,
        totalStock,
        hasPendingTags: activePendingForArticle.length > 0,
        totalPendingTags: activePendingForArticle.length,
        pendingTagsList: activePendingForArticle.map((t) => ({
            id: t.id,
            barcode: String(t.barcode || '').trim(),
            articleNo: t.articleNo || matchedArticle,
            articleName: t.articleName || matchedItemName,
            color: t.color,
            size: t.size,
            status: t.status,
            notes: t.notes || '',
            salesperson: t.salesperson || '',
            mrp: t.mrp || mrp,
            soldPrice: t.soldPrice,
            createdAt: t.createdAt
        })),
        scannedBarcode: query,
        matchedBarcode: specificMatch?.barcode || matched.barcode || query,
        matchedColor: specificMatch?.color || matched.color || (colors[0]?.color || ''),
        matchedSize: specificMatch?.size || matched.size || '',
        matchedStock: Math.max(0, specificMatch?.stock || 0),
        colors,
        sizes,
        variants: normalizedRows
    };
}

/**
 * Create the GET /api/staff/stock-check Express handler with injected DB & pending-tag readers.
 */
function createStockCheckHandler({ createRequest, sql, findSkuOrTransitFallback, readPendingTags }) {
    return async function handleStockCheck(req, res) {
        try {
            const { query, cleanDigits, paddedDigits } = normalizeLookupQuery(
                req.query.q || req.query.barcode || req.query.articleNo
            );
            if (!query) {
                return res.json({ success: false, message: 'Barcode or Article No is required' });
            }

            const matched = await findMatchingSku({
                createRequest,
                sql,
                findSkuOrTransitFallback,
                query,
                cleanDigits,
                paddedDigits,
                allowNameWildcard: true
            });

            if (!matched) {
                return res.json({ success: false, message: `No item found matching "${query}"` });
            }

            let rows = await fetchArticleVariants({ createRequest, sql, articleNo: matched.articleNo });
            if (rows.length === 0) {
                rows = [{
                    ...matched,
                    stock: matched.isInboundTransit ? Math.max(1, Number(matched.stock) || 1) : Math.max(0, Number(matched.stock) || 0),
                    vendorEan: matched.vendorEan || ''
                }];
            }

            let allPendingTags = [];
            try {
                allPendingTags = typeof readPendingTags === 'function' ? readPendingTags() : [];
            } catch (ptagErr) {
                console.warn('[StaffStockCheck] Error reading pending tags:', ptagErr.message);
            }

            const payload = buildStockCheckPayload({
                matched,
                rows,
                allPendingTags,
                query,
                cleanDigits,
                paddedDigits
            });

            return res.json(payload);
        } catch (err) {
            console.error('[StaffStockCheck API Error]', err);
            return res.status(500).json({ success: false, error: err.message });
        }
    };
}

module.exports = {
    SKU_SELECT_COLUMNS,
    normalizeLookupQuery,
    barcodeKey,
    findMatchingSku,
    fetchArticleVariants,
    findSpecificVariantRow,
    buildStockCheckPayload,
    createStockCheckHandler
};

