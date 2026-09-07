const puppeteer = require('puppeteer');
const { exec } = require('child_process');

// Start a static server on port 5555 serving the dist folder
const server = exec('npx -y serve -s dist -l 5555', { cwd: __dirname });

// Wait for server to start
setTimeout(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  
  page.on('pageerror', err => {
    errors.push(err.toString());
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push('[console.error] ' + msg.text());
    }
  });
  
  try {
    await page.goto('http://localhost:5555', { waitUntil: 'networkidle0', timeout: 15000 });
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasContent = bodyText.trim().length > 10;
    
    console.log('\n=== PRODUCTION BUILD TEST ===');
    console.log('Has meaningful content:', hasContent);
    console.log('Body text preview:', bodyText.substring(0, 200));
    
    if (errors.length > 0) {
      console.log('\n=== ERRORS ===');
      errors.forEach(e => console.log(e));
    } else {
      console.log('\n✅ PRODUCTION BUILD WORKS - ZERO ERRORS!');
    }
  } catch (navErr) {
    console.log('Navigation error:', navErr.message);
  }
  
  await browser.close();
  server.kill();
  process.exit(0);
}, 3000);
