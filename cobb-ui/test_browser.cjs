const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  const logs = [];
  
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
  });
  
  page.on('pageerror', err => {
    errors.push(err.toString());
  });
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Wait a bit for React to render
    await new Promise(r => setTimeout(r, 5000));
    
    // Get page content
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasContent = bodyText.trim().length > 10;
    const bodyHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 2000));
    
    console.log('\n=== PAGE STATUS ===');
    console.log('Has meaningful content:', hasContent);
    console.log('Body text preview:', bodyText.substring(0, 300));
    console.log('\n=== BODY HTML (first 2000 chars) ===');
    console.log(bodyHTML);
    
  } catch (navErr) {
    console.log('Navigation error:', navErr.message);
  }
  
  console.log('\n=== CONSOLE LOGS ===');
  logs.forEach(l => console.log(l));
  
  console.log('\n=== PAGE ERRORS ===');
  errors.forEach(e => console.log(e));
  
  if (errors.length === 0 && logs.filter(l => l.includes('[error]')).length === 0) {
    console.log('\n*** NO ERRORS DETECTED - APP LOADED SUCCESSFULLY! ***');
  }
  
  await browser.close();
})();
