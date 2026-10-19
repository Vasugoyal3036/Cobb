/**
 * COBB Customer Size Memory & Fit Guardian Engine
 * 
 * Automatically identifies customer fit patterns across garment categories:
 * - Shirts (Formals & Casuals)
 * - Trousers, Chinos & Denims
 * - Blazers & Suits
 * - T-Shirts & Polos
 * - Jackets & Winterwear
 */

export function categorizeGarment(categoryStr = '', subCategoryStr = '', articleName = '') {
  const text = `${categoryStr || ''} ${subCategoryStr || ''} ${articleName || ''}`.toUpperCase();
  
  if (text.includes('BLAZER') || text.includes('SUIT') || text.includes('COAT') || text.includes('WAISTCOAT') || text.startsWith('BLZ')) {
    return 'blazers';
  }
  if (text.includes('T SHIRT') || text.includes('T-SHIRT') || text.includes('TSHIRT') || text.includes('POLO')) {
    return 'tshirts';
  }
  if (text.includes('SWEATER') || text.includes('JACKET') || text.includes('HOOD') || text.includes('SWEATSHIRT') || text.includes('WINTER') || text.includes('CARDIGAN')) {
    return 'winterwear';
  }
  if (text.includes('TROUSER') || text.includes('JEAN') || text.includes('CHINO') || text.includes('DENIM') || text.includes('BOTTOM') || text.includes('SHORT')) {
    return 'trousers';
  }
  if (text.includes('SHIRT')) {
    return 'shirts';
  }
  return 'accessories';
}

export const CATEGORY_META = {
  shirts: { label: 'Shirts', shortLabel: 'Shirt', icon: '👔', color: '#3b82f6' },
  trousers: { label: 'Trousers & Denims', shortLabel: 'Trouser', icon: '👖', color: '#10b981' },
  blazers: { label: 'Blazers & Suits', shortLabel: 'Blazer', icon: '🧥', color: '#8b5cf6' },
  tshirts: { label: 'T-Shirts & Polos', shortLabel: 'T-Shirt', icon: '👕', color: '#f59e0b' },
  winterwear: { label: 'Jackets & Winterwear', shortLabel: 'Winter', icon: '❄️', color: '#06b6d4' }
};

export const DEMO_FIT_PROFILES = {
  '9812044810': {
    summaryText: '👔 Shirt: 40 | 👖 Trouser: 32 | 🧥 Blazer: 40 | 👕 T-Shirt: L',
    categories: {
      shirts: { label: 'Shirts', icon: '👔', primarySize: '40', confidence: 'High', totalPurchased: 4, lastPurchasedSize: '40', sizeBreakdown: { '40': 3, '39': 1 } },
      trousers: { label: 'Trousers & Denims', icon: '👖', primarySize: '32', confidence: 'High', totalPurchased: 3, lastPurchasedSize: '32', sizeBreakdown: { '32': 3 } },
      blazers: { label: 'Blazers & Suits', icon: '🧥', primarySize: '40', confidence: 'Medium', totalPurchased: 2, lastPurchasedSize: '40', sizeBreakdown: { '40': 2 } },
      tshirts: { label: 'T-Shirts & Polos', icon: '👕', primarySize: 'L', confidence: 'Initial', totalPurchased: 1, lastPurchasedSize: 'L', sizeBreakdown: { 'L': 1 } }
    },
    totalGarmentsPurchased: 10,
    hasHistory: true
  }
};

export function computeCustomerFitProfile(items = []) {
  const categories = {
    shirts: { label: 'Shirts', icon: '👔', sizes: {}, lastPurchasedSize: null, lastPurchaseDate: null, totalQty: 0 },
    trousers: { label: 'Trousers & Denims', icon: '👖', sizes: {}, lastPurchasedSize: null, lastPurchaseDate: null, totalQty: 0 },
    blazers: { label: 'Blazers & Suits', icon: '🧥', sizes: {}, lastPurchasedSize: null, lastPurchaseDate: null, totalQty: 0 },
    tshirts: { label: 'T-Shirts & Polos', icon: '👕', sizes: {}, lastPurchasedSize: null, lastPurchaseDate: null, totalQty: 0 },
    winterwear: { label: 'Jackets & Winterwear', icon: '❄️', sizes: {}, lastPurchasedSize: null, lastPurchaseDate: null, totalQty: 0 }
  };

  let totalGarments = 0;

  (items || []).forEach(item => {
    const catKey = categorizeGarment(
      item.Category || item.category || item.SECTION_NAME || item.section_name,
      item.SubCategory || item.subCategory || item.SUB_SECTION_NAME || item.sub_section_name,
      item.ArticleName || item.articleName || item.ARTICLE_NAME || item.article_name || item.name
    );
    if (!categories[catKey]) return;

    const rawSize = String(item.Size || item.size || item.para2_name || '').trim().toUpperCase();
    if (!rawSize || ['REGULAR', 'STANDARD', 'FREE', 'NA', 'ASSORTED'].includes(rawSize)) return;

    const qty = Number(item.Quantity || item.quantity || 1);
    const pDate = item.PurchaseDate || item.purchaseDate || item.BillDate || item.billDate || null;

    const catObj = categories[catKey];
    catObj.sizes[rawSize] = (catObj.sizes[rawSize] || 0) + qty;
    catObj.totalQty += qty;
    totalGarments += qty;

    if (!catObj.lastPurchasedSize && pDate) {
      catObj.lastPurchasedSize = rawSize;
      catObj.lastPurchaseDate = pDate;
    }
  });

  const categoryProfiles = {};
  const summaryParts = [];

  for (const [key, catObj] of Object.entries(categories)) {
    const sizeEntries = Object.entries(catObj.sizes).sort((a, b) => b[1] - a[1]);
    if (sizeEntries.length > 0) {
      const primarySize = sizeEntries[0][0];
      const primaryCount = sizeEntries[0][1];
      const confidence = catObj.totalQty >= 3 && (primaryCount / catObj.totalQty) >= 0.6 ? 'High' : (catObj.totalQty >= 2 ? 'Medium' : 'Initial');

      categoryProfiles[key] = {
        label: catObj.label,
        icon: catObj.icon,
        primarySize,
        confidence,
        totalPurchased: catObj.totalQty,
        lastPurchasedSize: catObj.lastPurchasedSize || primarySize,
        lastPurchaseDate: catObj.lastPurchaseDate,
        sizeBreakdown: catObj.sizes
      };

      const meta = CATEGORY_META[key];
      summaryParts.push(`${catObj.icon} ${meta?.shortLabel || key}: ${primarySize}`);
    }
  }

  return {
    summaryText: summaryParts.join(' | ') || 'No size history yet',
    categories: categoryProfiles,
    totalGarmentsPurchased: totalGarments,
    hasHistory: totalGarments > 0
  };
}

/**
 * Checks if a scanned or cart garment size matches or conflicts with customer's fit profile
 */
export function checkSizeMismatch(item, fitProfile) {
  if (!item || !fitProfile || !fitProfile.categories) {
    return { status: 'none', isMatch: false, isMismatch: false };
  }

  const catKey = categorizeGarment(
    item.category || item.Category || item.sectionName,
    item.subCategory || item.SubCategory || item.subSectionName,
    item.name || item.itemName || item.articleName
  );

  const catProfile = fitProfile.categories[catKey];
  if (!catProfile || !catProfile.primarySize) {
    return { status: 'unrecorded', category: catKey, isMatch: false, isMismatch: false };
  }

  const rawItemSize = String(item.size || item.Size || '').trim().toUpperCase();
  const rawExpectedSize = String(catProfile.primarySize || '').trim().toUpperCase();

  if (!rawItemSize || ['REGULAR', 'STANDARD', 'FREE', 'NA'].includes(rawItemSize)) {
    return { status: 'neutral', category: catKey, isMatch: false, isMismatch: false };
  }

  // Exact match
  if (rawItemSize === rawExpectedSize) {
    return {
      status: 'verified',
      isMatch: true,
      isMismatch: false,
      category: catKey,
      catLabel: catProfile.label,
      expectedSize: rawExpectedSize,
      scannedSize: rawItemSize,
      confidence: catProfile.confidence,
      message: `Verified Customer Fit (${rawExpectedSize})`
    };
  }

  // Mismatch detected
  return {
    status: 'mismatch',
    isMatch: false,
    isMismatch: true,
    category: catKey,
    catLabel: catProfile.label,
    expectedSize: rawExpectedSize,
    scannedSize: rawItemSize,
    confidence: catProfile.confidence,
    message: `Customer usually wears ${CATEGORY_META[catKey]?.shortLabel || catProfile.label} Size ${rawExpectedSize} (Cart: Size ${rawItemSize})`
  };
}
