import { isBarcodeDuplicate } from '../components/tabs/PendingTagsTab';

const canonicalBarcode = (code) => {
  const s = String(code || '').trim().toUpperCase();
  return s ? (s.replace(/^0+/, '') || s) : '';
};

const normalizeStoreId = (activeStore) => (
  (!activeStore || activeStore === 'ALL' || activeStore === 'STORE_01')
    ? 'DEMO_STORE_001'
    : activeStore
);

function extractItemsArray(snap) {
  if (!snap || snap.status !== 'fulfilled' || !snap.value?.exists()) return [];
  const data = snap.value.data();
  return Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
}

function normalizeCatalogItem(it, defaultStock = 0) {
  const barcode = String(it.SKU || it.sku || it.barcode || it.code || '').trim();
  const articleNo = String(it.ArticleNo || it.articleNo || it.article || '').trim();
  const itemName = String(it.ItemName || it.itemName || it.desc || 'Apparel Item').trim();
  const sectionName = String(it.ProductType || it.sectionName || 'Apparel').trim();
  const subSectionName = String(it.subSectionName || '').trim();
  const color = String(it.Color || it.color || it.p1 || 'Standard').trim() || 'Standard';
  const size = String(it.Size || it.size || it.p2 || 'Standard').trim() || 'Standard';
  const mrp = Number(it.MRP ?? it.mrp ?? 0) || 0;
  const stock = Math.max(0, Number(it.Stock ?? it.stock ?? it.quantity ?? defaultStock) || 0);
  return {
    barcode,
    articleNo,
    itemName,
    sectionName,
    subSectionName,
    color,
    size,
    sizeOrder: Number(it.sizeOrder) || 99,
    mrp,
    stock,
    vendorEan: String(it.vendorEan || it.VENDOR_EAN_NO || '').trim()
  };
}

/**
 * Pure builder that constructs a /api/staff/stock-check compatible response
 * from synced Cloud Firestore inventory, master catalog, inbound GIT parcels, and pending tags.
 */
export function buildStockCheckFromCloudData({
  query,
  inventoryItems = [],
  masterItems = [],
  parcels = [],
  pendingTags = []
}) {
  const q = String(query || '').trim();
  if (!q) return null;
  const qUpper = q.toUpperCase();
  const looksLikeNumericBarcode = /^\d{6,}$/.test(q);

  // Merge inventory (live stock) + master catalog, preferring live inventory stock per SKU
  const mergedByBarcode = new Map();
  const orderList = [];

  for (const raw of inventoryItems) {
    const item = normalizeCatalogItem(raw, 0);
    const key = canonicalBarcode(item.barcode) || `${item.articleNo}:${item.color}:${item.size}`;
    if (!mergedByBarcode.has(key)) {
      mergedByBarcode.set(key, item);
      orderList.push(item);
    }
  }
  for (const raw of masterItems) {
    const item = normalizeCatalogItem(raw, 0);
    const key = canonicalBarcode(item.barcode) || `${item.articleNo}:${item.color}:${item.size}`;
    if (!mergedByBarcode.has(key)) {
      mergedByBarcode.set(key, item);
      orderList.push(item);
    }
  }

  // Exact barcode -> exact article -> prefix article -> non-numeric itemName substring
  let matched = orderList.find((it) => isBarcodeDuplicate(it.barcode, q) || it.articleNo.toUpperCase() === qUpper);
  if (!matched) {
    matched = orderList.find((it) => it.articleNo.toUpperCase().startsWith(qUpper));
  }
  if (!matched && q.length >= 2 && !looksLikeNumericBarcode) {
    matched = orderList.find((it) => it.itemName.toUpperCase().includes(qUpper));
  }

  let rows = [];
  if (matched) {
    const targetArt = matched.articleNo.toUpperCase();
    rows = targetArt
      ? orderList.filter((it) => it.articleNo.toUpperCase() === targetArt)
      : [matched];
  } else {
    // Check inbound GIT parcels if not yet synced to inventory catalog
    const transitRows = [];
    for (const p of parcels) {
      for (const it of (p?.items || [])) {
        const normalized = normalizeCatalogItem(it, Math.max(1, Number(it.qty || it.quantity || 1)));
        if (
          isBarcodeDuplicate(normalized.barcode, q) ||
          (normalized.articleNo && normalized.articleNo.toUpperCase() === qUpper)
        ) {
          transitRows.push({ ...normalized, stock: Math.max(1, Number(it.qty || it.quantity || 1)) });
        }
      }
    }
    if (transitRows.length === 0) return null;
    matched = transitRows[0];
    rows = transitRows;
  }

  const articleNo = matched.articleNo;
  const artUpper = articleNo.toUpperCase();
  const variantKeys = new Set(rows.map((r) => canonicalBarcode(r.barcode)).filter(Boolean));
  const activePending = (Array.isArray(pendingTags) ? pendingTags : []).filter((t) => {
    if (!t || t.status !== 'active') return false;
    const tArt = String(t.articleNo || '').trim().toUpperCase();
    const tBc = canonicalBarcode(t.barcode);
    return (artUpper && tArt === artUpper) || (tBc && variantKeys.has(tBc));
  });

  const colorMap = {};
  for (const r of rows) {
    if (!colorMap[r.color]) {
      colorMap[r.color] = { color: r.color, totalStock: 0, sizeBuckets: {} };
    }
    colorMap[r.color].totalStock += r.stock;
    if (!colorMap[r.color].sizeBuckets[r.size]) {
      colorMap[r.color].sizeBuckets[r.size] = {
        size: r.size,
        stock: 0,
        barcode: r.barcode,
        barcodes: [],
        vendorEan: r.vendorEan,
        sizeOrder: r.sizeOrder
      };
    }
    const bucket = colorMap[r.color].sizeBuckets[r.size];
    bucket.stock += r.stock;
    if (r.barcode && !bucket.barcodes.includes(r.barcode)) {
      bucket.barcodes.push(r.barcode);
    }
  }

  const colors = Object.values(colorMap).map((c) => {
    const sizes = [];
    for (const b of Object.values(c.sizeBuckets)) {
      const bKeys = new Set(b.barcodes.map(canonicalBarcode).filter(Boolean));
      const matchingPending = activePending.filter((t) => {
        const tBc = canonicalBarcode(t.barcode);
        if (tBc && bKeys.has(tBc)) return true;
        return (
          String(t.color || '').trim().toUpperCase() === c.color.toUpperCase() &&
          String(t.size || '').trim().toUpperCase() === b.size.toUpperCase()
        );
      });
      if (b.stock > 0 || matchingPending.length > 0) {
        sizes.push({
          size: b.size,
          stock: b.stock,
          pendingTagsCount: matchingPending.length,
          pendingTagDetails: matchingPending,
          hasPendingTag: matchingPending.length > 0,
          barcode: b.barcode,
          barcodes: b.barcodes,
          vendorEan: b.vendorEan,
          sizeOrder: b.sizeOrder
        });
      }
    }
    const pendingTagsCount = sizes.reduce((sum, s) => sum + s.pendingTagsCount, 0);
    return {
      color: c.color,
      totalStock: c.totalStock,
      pendingTagsCount,
      hasPendingTags: pendingTagsCount > 0,
      sizes
    };
  });

  const sizeMap = {};
  for (const r of rows) {
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
  }

  const totalStock = rows.reduce((sum, r) => sum + r.stock, 0);
  const specificMatch = rows.find((r) => isBarcodeDuplicate(r.barcode, q)) || rows[0];

  return {
    success: true,
    fromCloudFallback: true,
    articleNo,
    itemName: matched.itemName,
    sectionName: matched.sectionName,
    subSectionName: matched.subSectionName,
    mrp: rows[0]?.mrp || matched.mrp || 0,
    totalStock,
    hasPendingTags: activePending.length > 0,
    totalPendingTags: activePending.length,
    pendingTagsList: activePending,
    scannedBarcode: q,
    matchedBarcode: specificMatch?.barcode || q,
    matchedColor: specificMatch?.color || colors[0]?.color || '',
    matchedSize: specificMatch?.size || '',
    matchedStock: specificMatch?.stock || 0,
    colors,
    sizes: Object.values(sizeMap),
    variants: rows
  };
}

const CLOUD_CATALOG_CACHE_TTL_MS = 120000;
const cloudCatalogCache = new Map();

/**
 * Clear the in-memory Firestore catalog cache (useful for manual refresh or unit tests).
 */
export function clearCloudStockCache() {
  cloudCatalogCache.clear();
}

/**
 * Queries synced Firebase Firestore store catalogs when local/ngrok backend is unreachable.
 * Caches snapshot payloads in memory per store for 2 minutes to make repeat scans instant.
 */
export async function lookupStockInCloudFallback(query, activeStore, { bypassCache = false } = {}) {
  if (!query) return null;
  try {
    const storeId = normalizeStoreId(activeStore);
    const cached = !bypassCache ? cloudCatalogCache.get(storeId) : null;

    if (cached && (Date.now() - cached.fetchedAt) < CLOUD_CATALOG_CACHE_TTL_MS) {
      return buildStockCheckFromCloudData({ query, ...cached.data });
    }

    const { db } = await import('./firebase');
    if (!db) return null;
    const { doc, getDoc } = await import('firebase/firestore');

    const [invSnap, masterSnap, parcelsSnap, ptagsSnap] = await Promise.allSettled([
      getDoc(doc(db, 'stores', storeId, 'data', 'inventory')),
      getDoc(doc(db, 'stores', storeId, 'data', 'inventory_master')),
      getDoc(doc(db, 'stores', storeId, 'data', 'parcels_transit')),
      getDoc(doc(db, 'stores', storeId, 'data', 'pending_tags'))
    ]);

    const inventoryItems = extractItemsArray(invSnap);
    const masterItems = extractItemsArray(masterSnap);
    const parcelsData = parcelsSnap.status === 'fulfilled' && parcelsSnap.value?.exists()
      ? (parcelsSnap.value.data() || {})
      : {};
    const parcels = Array.isArray(parcelsData.allParcels)
      ? parcelsData.allParcels
      : (Array.isArray(parcelsData.activeInTransit) ? parcelsData.activeInTransit : []);
    const pendingTags = ptagsSnap.status === 'fulfilled' && ptagsSnap.value?.exists()
      ? (ptagsSnap.value.data()?.tags || [])
      : [];

    const catalogData = { inventoryItems, masterItems, parcels, pendingTags };
    cloudCatalogCache.set(storeId, { fetchedAt: Date.now(), data: catalogData });

    return buildStockCheckFromCloudData({ query, ...catalogData });
  } catch {
    return null;
  }
}

