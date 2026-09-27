/**
 * Utility for formatting and printing ESC/POS thermal receipts
 * Supports 80mm (48 characters wide) and 58mm (32 characters wide)
 */

export const DEFAULT_STORE_INFO = {
  name: 'COBB APPARELS',
  address: 'Fatehpur Road, Pundri, Haryana',
  phone: '+91 91381 22820',
  gstin: '06AABCC1234F1Z5',
  tagline: 'Premium Menswear & Lifestyle'
};

/**
 * Pads and aligns text for thermal receipt monospace layout
 */
export function formatLine(left, right, width = 48) {
  const leftStr = String(left || '');
  const rightStr = String(right || '');
  const spaceCount = Math.max(width - leftStr.length - rightStr.length, 1);
  return leftStr + ' '.repeat(spaceCount) + rightStr;
}

export function formatDivider(char = '-', width = 48) {
  return char.repeat(width);
}

export function centerText(text, width = 48) {
  const str = String(text || '').trim();
  if (str.length >= width) return str;
  const pad = Math.floor((width - str.length) / 2);
  return ' '.repeat(pad) + str;
}

/**
 * Triggers standard browser print with thermal-optimized styling
 */
export function triggerThermalPrint(printContentId) {
  const elem = document.getElementById(printContentId);
  if (!elem) {
    window.print();
    return;
  }

  // Create an isolated printable iframe to guarantee thermal roll page sizing
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
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Thermal Receipt</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 8px 12px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            color: #000;
            background: #fff;
            width: 76mm;
            line-height: 1.35;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .flex-between { display: flex; justify-content: space-between; }
          .qr-container { display: flex; justify-content: center; margin: 8px 0; }
          .qr-container img { width: 140px; height: 140px; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; font-size: 12px; border-bottom: 1px dashed #000; padding: 3px 0; }
          td { font-size: 12px; padding: 2px 0; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
        </style>
      </head>
      <body>
        ${elem.innerHTML}
      </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1500);
  }, 300);
}
