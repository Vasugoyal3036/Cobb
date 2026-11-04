import JsBarcode from 'jsbarcode';

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
        height: options.height || 42,
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
 * Render complete printable HTML for a 58mm or 80mm replacement garment tag
 */
export function renderThermalTagHtml(tag, options = {}) {
  const widthMm = options.paperSize === '80mm' ? 80 : 58;
  const printableMm = widthMm === 80 ? 74 : 52;
  const barcodeSvg = generateBarcodeSvg(tag.barcode, {
    width: widthMm === 80 ? 2.1 : 1.7,
    height: widthMm === 80 ? 46 : 38
  });

  const nowStr = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const mrpFormatted = Number(tag.mrp || 0).toLocaleString('en-IN');
  const soldFormatted = tag.soldPrice ? Number(tag.soldPrice).toLocaleString('en-IN') : null;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Replacement Garment Tag - ${tag.barcode || tag.articleNo}</title>
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
            font-size: 18px;
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
          .footer-note {
            font-size: 8px;
            color: #333;
            margin-top: 4px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="tag-card">
          <div class="hole-punch"></div>
          <h1 class="brand-title">COBB APPARELS</h1>
          <div class="brand-sub">GOYAL - HOUSE OF FASHION • PUNDRI</div>

          <div class="divider"></div>

          <div class="article-info">
            <div><strong>ART:</strong> ${tag.articleNo || 'COBB-ART'}</div>
            <div><strong>ITEM:</strong> ${tag.articleName || 'Garment'}</div>
            <div style="display:flex; justify-content:space-between; margin-top:1px;">
              <span><strong>COL:</strong> ${tag.color || 'Standard'}</span>
              <span><strong>SEC:</strong> ${tag.section || 'Apparel'}</span>
            </div>
          </div>

          <div class="size-box">
            SIZE: ${tag.size || 'FREE'}
          </div>

          <div class="barcode-container">
            ${barcodeSvg}
          </div>

          <div class="divider"></div>

          <div class="price-block">
            <div class="mrp-label">Maximum Retail Price</div>
            <div class="mrp-value">₹${mrpFormatted}</div>
            <div class="tax-sub">(Inclusive of all taxes)</div>
            <div class="promo-pill">BUY 1 GET 2 FREE / 50% OFF</div>
            ${soldFormatted ? `<div style="font-size:10px; font-weight:800; margin-top:2px;">Single Pc Deal: ₹${soldFormatted}</div>` : ''}
          </div>

          <div class="double-divider"></div>

          <div class="footer-note">
            REPLACEMENT GARMENT PRICE TAG<br/>
            Printed: ${nowStr}
          </div>
        </div>
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

