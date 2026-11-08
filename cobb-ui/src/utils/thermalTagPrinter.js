import JsBarcode from 'jsbarcode';

/**
 * Standard Cobb Apparel Categories with retail presets
 */
export const COBB_CATEGORIES = [
  {
    id: 'casual_shirt',
    name: 'CASUAL SHIRT',
    shortCode: 'CS',
    section: 'MENSWEAR',
    defaultSizes: ['38 (S)', '39 (M)', '40 (L)', '42 (XL)', '44 (XXL)'],
    defaultMrp: 2799,
    promo: 'BUY 1 GET 2 FREE',
    type: 'tops'
  },
  {
    id: 'formal_shirt',
    name: 'FORMAL SHIRT',
    shortCode: 'FS',
    section: 'MENSWEAR',
    defaultSizes: ['38 (S)', '39 (M)', '40 (L)', '42 (XL)', '44 (XXL)'],
    defaultMrp: 2499,
    promo: 'BUY 1 GET 2 FREE',
    type: 'tops'
  },
  {
    id: 'denim',
    name: 'DENIM / JEANS',
    shortCode: 'DN',
    section: 'MENSWEAR',
    defaultSizes: ['28', '30', '32', '34', '36', '38', '40'],
    defaultMrp: 3199,
    promo: 'BUY 1 GET 2 FREE',
    type: 'bottoms'
  },
  {
    id: 'casual_trouser',
    name: 'CASUAL TROUSER',
    shortCode: 'CT',
    section: 'MENSWEAR',
    defaultSizes: ['30', '32', '34', '36', '38', '40'],
    defaultMrp: 2499,
    promo: 'BUY 1 GET 2 FREE',
    type: 'bottoms'
  },
  {
    id: 'formal_trouser',
    name: 'FORMAL TROUSER',
    shortCode: 'FT',
    section: 'MENSWEAR',
    defaultSizes: ['30', '32', '34', '36', '38', '40'],
    defaultMrp: 2699,
    promo: 'BUY 1 GET 2 FREE',
    type: 'bottoms'
  },
  {
    id: 'tshirt_half',
    name: 'T-SHIRT HALF SL',
    shortCode: 'TH',
    section: 'MENSWEAR-SM',
    defaultSizes: ['S', 'M', 'L', 'XL', '2XL'],
    defaultMrp: 1299,
    promo: 'BUY 1 GET 2 FREE',
    type: 'alpha'
  },
  {
    id: 'tshirt_full',
    name: 'T-SHIRT FULL SL',
    shortCode: 'TF',
    section: 'MENSWEAR-WN',
    defaultSizes: ['M', 'L', 'XL', '2XL'],
    defaultMrp: 1699,
    promo: 'BUY 1 GET 2 FREE',
    type: 'alpha'
  },
  {
    id: 'polo_tshirt',
    name: 'POLO T-SHIRT',
    shortCode: 'PT',
    section: 'MENSWEAR-SM',
    defaultSizes: ['M', 'L', 'XL', '2XL'],
    defaultMrp: 1599,
    promo: 'BUY 1 GET 2 FREE',
    type: 'alpha'
  },
  {
    id: 'blazer',
    name: 'BLAZER',
    shortCode: 'BZ',
    section: 'MENSWEAR-WN',
    defaultSizes: ['36', '38', '40', '42', '44', '46'],
    defaultMrp: 5999,
    promo: 'FLAT 50% OFF',
    type: 'tops'
  },
  {
    id: 'suit_blazer',
    name: 'SUIT / BLAZER',
    shortCode: 'ST',
    section: 'MENSWEAR-WN',
    defaultSizes: ['38', '40', '42', '44'],
    defaultMrp: 6999,
    promo: 'FLAT 50% OFF',
    type: 'tops'
  },
  {
    id: 'jacket',
    name: 'WINTER JACKET',
    shortCode: 'JK',
    section: 'MENSWEAR-WN',
    defaultSizes: ['M', 'L', 'XL', '2XL'],
    defaultMrp: 3999,
    promo: 'FLAT 50% OFF',
    type: 'alpha'
  },
  {
    id: 'sweatshirt',
    name: 'SWEATSHIRT / HOODIE',
    shortCode: 'SW',
    section: 'MENSWEAR-WN',
    defaultSizes: ['M', 'L', 'XL', '2XL'],
    defaultMrp: 2499,
    promo: 'BUY 1 GET 2 FREE',
    type: 'alpha'
  },
  {
    id: 'lower',
    name: 'LOWER / TRACK PANT',
    shortCode: 'LW',
    section: 'MENSWEAR',
    defaultSizes: ['M', 'L', 'XL', '2XL'],
    defaultMrp: 1999,
    promo: 'BUY 1 GET 2 FREE',
    type: 'alpha'
  },
  {
    id: 'shorts',
    name: 'SHORTS / BERMUDA',
    shortCode: 'SH',
    section: 'MENSWEAR-SM',
    defaultSizes: ['30', '32', '34', '36', '38'],
    defaultMrp: 1599,
    promo: 'BUY 1 GET 2 FREE',
    type: 'bottoms'
  },
  {
    id: 'accessories',
    name: 'ACCESSORIES',
    shortCode: 'AC',
    section: 'ACCESSORIES',
    defaultSizes: ['FREE'],
    defaultMrp: 999,
    promo: 'FLAT 50% OFF',
    type: 'free'
  }
];

/**
 * Standard Cobb Retail MRP presets
 */
export const MRP_PRESETS = [
  999, 1299, 1499, 1699, 1799, 1899, 1999, 2199, 2299, 2499, 2699, 2799, 2999, 3199, 3499, 3999, 4999, 5999, 6999
];

/**
 * Standard Cobb Retail Promo Presets
 */

/**
 * Standard Garment Defect Types
 */
export const DEFECT_TYPES = [
  { id: 'ZIPPER', label: 'Zipper / Runner Break', icon: '⚡', hindi: 'Chain / Runner Tooti' },
  { id: 'STITCH_TEAR', label: 'Stitch Tear / Seam Open', icon: '✂️', hindi: 'Silai Khuli / Cut' },
  { id: 'STAIN', label: 'Fabric Stain / Spot', icon: '🎨', hindi: 'Daag / Rang Fika' },
  { id: 'MISSING_BUTTON', label: 'Missing Button / Snap', icon: '🔘', hindi: 'Button Toota / Gayab' },
  { id: 'TRANSIT_DAMAGE', label: 'Carton / Box Damage', icon: '📦', hindi: 'Gatta Geela / Transit' },
  { id: 'OTHER', label: 'Other Defect', icon: '⚠️', hindi: 'Anya Defect' }
];

export const PROMO_PRESETS = [
  'BUY 1 GET 2 FREE',
  'BUY 2 GET 50% OFF',
  'FLAT 50% OFF',
  'FLAT 60% OFF',
  'SPECIAL STORE DEAL'
];

/**
 * Auto-generate a scannable 10-digit Cobb standard barcode
 * Example: 0082 + 2 digits MRP mod + 4 random digits = 10 digits (Standard Cobb format)
 */
export function generateQuickTagBarcode(categoryName = '', mrp = 1999, seed = null) {
  const cleanMrp = Math.abs(parseInt(mrp, 10)) || 1999;
  const mrpSuffix = String(cleanMrp % 100).padStart(2, '0');
  const rand4 = seed ? String(seed).padStart(4, '0').slice(-4) : Math.floor(1000 + Math.random() * 9000);
  return `0082${mrpSuffix}${rand4}`;
}

/**
 * Generate a scannable SVG barcode string using JsBarcode
 */
export function generateBarcodeSvg(barcode, options = {}) {
  const code = String(barcode || '').trim();
  if (!code) return '';

  try {
    if (typeof document !== 'undefined' && document.createElementNS) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      JsBarcode(svg, code, {
        format: options.format || 'CODE128',
        width: options.width || 1.8,
        height: options.height || 40,
        displayValue: options.displayValue !== false,
        fontSize: options.fontSize || 12,
        font: 'monospace',
        margin: options.margin || 2,
        background: '#ffffff',
        lineColor: '#000000',
        ...options
      });
      return svg.outerHTML;
    }
  } catch (err) {
    console.warn('[thermalTagPrinter] SVG barcode generation fallback:', err.message);
  }

  // Graceful fallback for non-DOM / test environments
  return `<div style="font-family:monospace;font-size:14px;font-weight:bold;letter-spacing:2px;text-align:center;padding:4px;border:1px dashed #000;">* ${code} *</div>`;
}

/**
 * Render single garment tag card HTML
 */
function renderSingleTagCard(tag, widthMm, barcodeSvg, nowStr, mfgDateStr) {
  const mrpFormatted = Number(tag.mrp || 0).toLocaleString('en-IN');
  const soldFormatted = tag.soldPrice ? Number(tag.soldPrice).toLocaleString('en-IN') : null;
  const categoryName = tag.category || tag.articleName || 'MENSWEAR';
  const articleNo = tag.articleNo || 'COBB-ART';
  const color = tag.color || 'STANDARD';
  const size = tag.size || 'FREE';
  const section = tag.section || 'APPAREL';
  const promo = tag.promo || 'BUY 1 GET 2 FREE';

  return `
    <div class="tag-card">
      <!-- Tag fastener hole punch marker -->
      <div class="hole-punch"></div>
      <h1 class="brand-title">COBB APPARELS</h1>
      <div class="brand-sub">GOYAL - HOUSE OF FASHION • PUNDRI</div>

      <div class="divider"></div>

      <!-- Prominent Category / Commodity Banner -->
      <div class="category-block">
        <div class="category-eyebrow">COMMODITY / ITEM</div>
        <div class="category-title">${categoryName}</div>
      </div>

      <!-- Article & Specs Metadata -->
      <div class="article-info">
        <div style="display:flex; justify-content:space-between;">
          <span><strong>ART:</strong> ${articleNo}</span>
          <span><strong>COL:</strong> ${color}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:1px;">
          <span><strong>SEC:</strong> ${section}</span>
          <span><strong>QTY:</strong> 1 N</span>
        </div>
      </div>

      <!-- Oversized High-Visibility Size Box -->
      <div class="size-box">
        SIZE: ${size}
      </div>

      <!-- Scannable Code 128 / EAN Barcode -->
      <div class="barcode-container">
        ${barcodeSvg}
      </div>

      <div class="divider"></div>

      <!-- Pricing & Promotion Block -->
      <div class="price-block">
        <div class="mrp-label">MAXIMUM RETAIL PRICE</div>
        <div class="mrp-value">₹${mrpFormatted}</div>
        <div class="tax-sub">(INCLUSIVE OF ALL TAXES)</div>

        <div class="promo-pill">${promo}</div>
        ${soldFormatted ? `<div class="deal-pill">Single Pc Deal: ₹${soldFormatted}</div>` : ''}

        <div class="statutory-row">
          <span>Pkd: ${mfgDateStr}</span>
          <span>Consumer Care: Pundri</span>
        </div>
      </div>

      <div class="double-divider"></div>

      <!-- Authorized Store Replacement Tag Footer -->
      <div class="footer-note">
        COBB APPARELS PVT. LTD.<br/>
        * REPLACEMENT GARMENT PRICE TAG *<br/>
        Printed: ${nowStr}
      </div>
    </div>
  `;
}

/**
 * Render complete printable HTML for a 58mm or 80mm replacement garment tag
 * Supports copies option (e.g. { copies: 2 })
 */
export function renderThermalTagHtml(tag, options = {}) {
  const widthMm = options.paperSize === '80mm' ? 80 : 58;
  const printableMm = widthMm === 80 ? 74 : 52;
  const copies = Math.max(1, parseInt(options.copies, 10) || 1);

  const barcodeSvg = generateBarcodeSvg(tag.barcode, {
    width: widthMm === 80 ? 2.1 : 1.7,
    height: widthMm === 80 ? 46 : 38
  });

  const now = new Date();
  const nowStr = now.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  const mfgDateStr = now.toLocaleString('en-IN', {
    month: 'short',
    year: 'numeric'
  });

  const cardsHtml = Array.from({ length: copies }, (_, idx) => `
    <div class="tag-page ${idx < copies - 1 ? 'page-break' : ''}">
      ${renderSingleTagCard(tag, widthMm, barcodeSvg, nowStr, mfgDateStr)}
    </div>
  `).join('\n');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Replacement Garment Tag - ${tag.category || tag.articleNo || tag.barcode}</title>
        <style>
          @page {
            size: ${widthMm}mm auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 4px 6px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, monospace, sans-serif;
            color: #000;
            background: #fff;
            width: ${printableMm}mm;
            line-height: 1.25;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .tag-page {
            width: 100%;
          }
          .page-break {
            page-break-after: always;
            margin-bottom: 8px;
          }
          .tag-card {
            border: 1.5px solid #000;
            border-radius: 6px;
            padding: 6px 4px;
            text-align: center;
          }
          .hole-punch {
            display: inline-block;
            width: 10px;
            height: 10px;
            border: 1.5px solid #000;
            border-radius: 50%;
            margin-bottom: 2px;
          }
          .brand-title {
            font-size: 14px;
            font-weight: 900;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin: 0;
          }
          .brand-sub {
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #222;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 4px 0;
          }
          .double-divider {
            border-top: 2px solid #000;
            margin: 4px 0;
          }
          .category-block {
            background: #f1f5f9;
            border: 1px solid #000;
            border-radius: 4px;
            padding: 3px 2px;
            margin-bottom: 4px;
          }
          .category-eyebrow {
            font-size: 8px;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #444;
          }
          .category-title {
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #000;
          }
          .article-info {
            font-size: 11px;
            font-weight: 700;
            text-align: left;
            padding: 0 2px;
          }
          .size-box {
            background: #000;
            color: #fff;
            padding: 4px 2px;
            margin: 4px 0;
            border-radius: 4px;
            font-size: 15px;
            font-weight: 900;
            letter-spacing: 1px;
            text-align: center;
          }
          .barcode-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 3px 0;
          }
          .barcode-container svg {
            max-width: 100%;
            height: auto;
          }
          .price-block {
            text-align: center;
            margin-top: 2px;
          }
          .mrp-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .mrp-value {
            font-size: 19px;
            font-weight: 900;
            letter-spacing: -0.5px;
          }
          .tax-sub {
            font-size: 8px;
            font-weight: 600;
          }
          .promo-pill {
            display: inline-block;
            border: 1px solid #000;
            border-radius: 3px;
            padding: 2px 4px;
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            margin-top: 3px;
          }
          .deal-pill {
            font-size: 10px;
            font-weight: 800;
            margin-top: 2px;
          }
          .statutory-row {
            display: flex;
            justify-content: space-between;
            font-size: 8px;
            font-weight: 700;
            color: #333;
            margin-top: 3px;
            padding: 0 2px;
          }
          .footer-note {
            font-size: 8px;
            color: #333;
            margin-top: 4px;
            text-align: center;
            line-height: 1.2;
          }
        </style>
      </head>
      <body>
        ${cardsHtml}
      </body>
    </html>
  `;
}

/**
 * Triggers printing of the thermal garment tag via isolated iframe or window popup
 */
export function triggerThermalTagPrint(tag, options = {}) {
  const html = renderThermalTagHtml(tag, options);

  // If running in browser with iframe support
  if (typeof document !== 'undefined') {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();

      iframe.contentWindow.focus();
      setTimeout(() => {
        try {
          iframe.contentWindow.print();
        } catch (e) {
          console.warn('Iframe print error, falling back to window:', e);
        }
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 3000);
      }, 350);
      return true;
    } catch (err) {
      console.warn('Iframe print creation error:', err);
    }
  }

  // Window popup fallback (for popout / Android / iOS)
  if (typeof window !== 'undefined') {
    const printWindow = window.open('', '_blank', 'width=380,height=580');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 400);
      return true;
    }
  }

  return false;
}


/**
 * Render thermal print HTML for a Quarantined Damaged Garment
 */
export function renderDamageSlipHtml(damage, options = {}) {
  const widthMm = options.paperSize === '80mm' ? 80 : 58;
  const printableMm = widthMm === 80 ? 74 : 52;

  const barcodeSvg = generateBarcodeSvg(damage.barcode, {
    width: widthMm === 80 ? 2.0 : 1.6,
    height: widthMm === 80 ? 40 : 34
  });

  const now = new Date();
  const nowStr = now.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const mrpFormatted = Number(damage.mrp || 0).toLocaleString('en-IN');
  const defectObj = DEFECT_TYPES.find(d => d.id === damage.defectType) || { label: damage.defectType || 'DEFECT' };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>DAMAGE QUARANTINE SLIP - ${damage.barcode || damage.articleNo}</title>
        <style>
          @page {
            size: ${widthMm}mm auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 4px 6px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, monospace, sans-serif;
            color: #000;
            background: #fff;
            width: ${printableMm}mm;
            line-height: 1.25;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .tag-card {
            border: 2px solid #000;
            border-radius: 6px;
            padding: 6px 4px;
            text-align: center;
          }
          .hole-punch {
            display: inline-block;
            width: 10px;
            height: 10px;
            border: 1.5px solid #000;
            border-radius: 50%;
            margin-bottom: 2px;
          }
          .warning-banner {
            background: #000;
            color: #fff;
            padding: 3px 2px;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            border-radius: 3px;
          }
          .brand-title {
            font-size: 11px;
            font-weight: 800;
            margin-top: 3px;
            text-transform: uppercase;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 4px 0;
          }
          .double-divider {
            border-top: 2px solid #000;
            margin: 4px 0;
          }
          .defect-banner {
            background: #fee2e2;
            border: 1px solid #dc2626;
            color: #991b1b;
            padding: 3px 2px;
            border-radius: 4px;
            margin: 3px 0;
            font-weight: 900;
            font-size: 11px;
            text-transform: uppercase;
          }
          .info-table {
            font-size: 10px;
            font-weight: 700;
            text-align: left;
            padding: 0 2px;
            line-height: 1.3;
          }
          .barcode-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 3px 0;
          }
          .barcode-container svg {
            max-width: 100%;
            height: auto;
          }
          .footer-note {
            font-size: 8px;
            color: #222;
            margin-top: 4px;
            text-align: center;
            line-height: 1.2;
          }
        </style>
      </head>
      <body>
        <div class="tag-card">
          <div class="hole-punch"></div>
          <div class="warning-banner">⚠️ DEFECT QUARANTINE</div>
          <div class="brand-title">COBB APPARELS • PUNDRI</div>

          <div class="divider"></div>

          <div class="defect-banner">
            ${defectObj.label}
          </div>

          <div class="info-table">
            ${damage.defectDesc ? `<div><strong>ISSUE:</strong> ${damage.defectDesc}</div>` : ''}
            <div><strong>ART:</strong> ${damage.articleNo || 'COBB-ART'}</div>
            <div><strong>ITEM:</strong> ${damage.articleName || damage.category || 'Garment'}</div>
            <div style="display:flex; justify-content:space-between;">
              <span><strong>SIZE:</strong> ${damage.size || 'FREE'}</span>
              <span><strong>COL:</strong> ${damage.color || 'STD'}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:2px;">
              <span><strong>MRP:</strong> ₹${mrpFormatted}</span>
              <span><strong>ACTION:</strong> ${damage.severity === 'minor' ? 'TAILOR REPAIR' : 'VENDOR RTV'}</span>
            </div>
          </div>

          <div class="divider"></div>

          <div class="barcode-container">
            ${barcodeSvg}
          </div>

          <div class="double-divider"></div>

          <div class="footer-note">
            DO NOT PUT ON SALES FLOOR • QUARANTINED<br/>
            Reported: ${nowStr} by ${damage.reportedBy || 'Staff'}<br/>
            * GOYAL - HOUSE OF FASHION *
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Triggers thermal print of the damage quarantine slip
 */
export function triggerDamageSlipPrint(damage, options = {}) {
  const html = renderDamageSlipHtml(damage, options);

  if (typeof document !== 'undefined') {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();

      iframe.contentWindow.focus();
      setTimeout(() => {
        try {
          iframe.contentWindow.print();
        } catch (e) {
          console.warn('Iframe print error, falling back to window:', e);
        }
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 3000);
      }, 350);
      return true;
    } catch (err) {
      console.warn('Iframe print creation error:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const printWindow = window.open('', '_blank', 'width=380,height=580');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 400);
      return true;
    }
  }

  return false;
}

/**
 * Render thermal print HTML for a Customer Hold Garment Bag Slip (58mm or 80mm)
 */
export function renderCustomerHoldBagSlipHtml(bag, options = {}) {
  const widthMm = options.paperSize === '80mm' ? 80 : 58;
  const printableMm = widthMm === 80 ? 74 : 52;
  const tagsList = Array.isArray(bag.tags) ? bag.tags : [];

  const now = new Date();
  const nowStr = now.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const bagCode = String(bag.bagNo || bag.batchId || 'HOLD-BAG').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 14);
  const barcodeSvg = generateBarcodeSvg(bagCode, {
    width: widthMm === 80 ? 1.8 : 1.4,
    height: widthMm === 80 ? 36 : 30
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Customer Hold Bag Slip - ${bag.bagNo || 'Bag'} - ${bag.customerName || 'Customer'}</title>
        <style>
          @page {
            size: ${widthMm}mm auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 4px 6px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, monospace, sans-serif;
            color: #000;
            background: #fff;
            width: ${printableMm}mm;
            line-height: 1.25;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .tag-card {
            border: 2px solid #000;
            border-radius: 6px;
            padding: 6px 4px;
            text-align: center;
          }
          .brand-title {
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 1.5px;
            text-transform: uppercase;
          }
          .sub-brand {
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 1px;
            color: #333;
            margin-top: 1px;
          }
          .desk-badge {
            display: inline-block;
            background: #000;
            color: #fff;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.8px;
            padding: 2px 8px;
            border-radius: 3px;
            margin: 4px 0;
            text-transform: uppercase;
          }
          .bag-pill {
            font-size: 15px;
            font-weight: 900;
            letter-spacing: 1px;
            margin: 3px 0;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 4px 0;
          }
          .double-divider {
            border-top: 2px solid #000;
            margin: 5px 0;
          }
          .info-table {
            width: 100%;
            font-size: 9px;
            text-align: left;
            border-collapse: collapse;
            margin: 3px 0;
          }
          .info-table td {
            padding: 1.5px 2px;
            vertical-align: top;
          }
          .info-table td.label {
            font-weight: 700;
            width: 32%;
            color: #444;
          }
          .info-table td.val {
            font-weight: 800;
          }
          .items-table {
            width: 100%;
            font-size: 8.5px;
            border-collapse: collapse;
            margin: 4px 0;
            text-align: left;
          }
          .items-table th {
            border-bottom: 1px solid #000;
            padding: 2px 1px;
            font-size: 8px;
            text-transform: uppercase;
          }
          .items-table td {
            padding: 2px 1px;
            border-bottom: 0.5px dotted #999;
          }
          .barcode-container {
            margin: 4px auto;
            text-align: center;
          }
          .barcode-container svg {
            max-width: 100%;
            height: auto;
            margin: 0 auto;
          }
          .footer-note {
            font-size: 7.5px;
            font-weight: 800;
            line-height: 1.2;
            margin-top: 4px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="tag-card">
          <div class="brand-title">COBB STORE</div>
          <div class="sub-brand">GOYAL - HOUSE OF FASHION</div>
          <div class="desk-badge">💼 CUSTOMER HOLD BAG SLIP</div>

          <div class="bag-pill">${bag.bagNo ? `BAG #${bag.bagNo}` : 'CUSTOMER HOLD'}</div>

          <div class="divider"></div>

          <table class="info-table">
            <tr>
              <td class="label">Customer:</td>
              <td class="val">${bag.customerName || 'Walk-in Guest'}</td>
            </tr>
            ${bag.customerPhone ? `
            <tr>
              <td class="label">Phone:</td>
              <td class="val">${bag.customerPhone}</td>
            </tr>
            ` : ''}
            <tr>
              <td class="label">Held At:</td>
              <td class="val">${nowStr}</td>
            </tr>
            ${bag.notes ? `
            <tr>
              <td class="label">Notes:</td>
              <td class="val">${bag.notes}</td>
            </tr>
            ` : ''}
          </table>

          <div class="divider"></div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 12%;">#</th>
                <th style="width: 48%;">Article / Item</th>
                <th style="width: 18%;">Size</th>
                <th style="width: 22%; text-align: right;">MRP</th>
              </tr>
            </thead>
            <tbody>
              ${tagsList.map((t, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${t.articleNo || t.barcode}</strong><br/><span style="font-size:7px;color:#555;">${t.articleName || t.color || ''}</span></td>
                  <td>${t.size || 'Free'}</td>
                  <td style="text-align: right; font-weight: bold;">₹${Number(t.mrp || 0).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="double-divider"></div>

          <table class="info-table" style="font-size: 10px;">
            <tr>
              <td class="label" style="font-size: 10px;">Total Pieces:</td>
              <td class="val" style="font-size: 11px; font-weight: 900;">${tagsList.length} Garments</td>
            </tr>
            <tr>
              <td class="label" style="font-size: 10px;">Total MRP:</td>
              <td class="val" style="font-size: 11px; font-weight: 900;">₹${Number(bag.totalMrp || 0).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td class="label" style="font-size: 9px;">Single-Pc Cash:</td>
              <td class="val" style="font-size: 10px; font-weight: 800;">₹${Number(bag.totalCollected || 0).toLocaleString('en-IN')}</td>
            </tr>
          </table>

          <div class="divider"></div>

          <div class="barcode-container">
            ${barcodeSvg}
          </div>

          <div class="double-divider"></div>

          <div class="footer-note">
            ⚠️ DO NOT MIX WITH GENERAL PENDING RACK<br/>
            Reserved exclusively for customer checkout.<br/>
            * ATTACH THIS SLIP SECURELY TO GARMENT BAG *
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Triggers thermal print of the Customer Hold Bag slip
 */
export function triggerCustomerHoldBagPrint(bag, options = {}) {
  const html = renderCustomerHoldBagSlipHtml(bag, options);

  if (typeof document !== 'undefined') {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();

      iframe.contentWindow.focus();
      setTimeout(() => {
        try {
          iframe.contentWindow.print();
        } catch (e) {
          console.warn('Iframe print error, falling back to window:', e);
        }
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 3000);
      }, 350);
      return true;
    } catch (err) {
      console.warn('Iframe print creation error:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const printWindow = window.open('', '_blank', 'width=380,height=580');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 400);
      return true;
    }
  }

  return false;
}
