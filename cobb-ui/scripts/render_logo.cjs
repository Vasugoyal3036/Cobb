const puppeteer = require('D:/cobbbb/whatsapp_gateway/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Transparent viewport 1024x716 with Retina 2x scale
    await page.setViewport({ width: 512, height: 358, deviceScaleFactor: 2 });

    const svgPath = path.join(__dirname, '../public/ors-logo.svg');
    const svgContent = fs.readFileSync(svgPath, 'utf8');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              background: transparent !important;
              overflow: hidden;
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            svg {
              width: 100%;
              height: 100%;
            }
          </style>
        </head>
        <body>
          ${svgContent}
        </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const outPng = path.join(__dirname, '../public/ors-logo.png');
    await page.screenshot({
      path: outPng,
      omitBackground: true
    });

    console.log('Saved transparent PNG to:', outPng);

    // Also square version (512x512) for icons
    await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 2 });
    const squarePng = path.join(__dirname, '../public/ors-logo-square.png');
    await page.screenshot({
      path: squarePng,
      omitBackground: true
    });
    console.log('Saved square transparent PNG to:', squarePng);

    await browser.close();
    console.log('Puppeteer rendering complete!');
  } catch (err) {
    console.error('Rendering error:', err);
    process.exit(1);
  }
})();
