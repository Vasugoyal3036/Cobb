const fs = require('fs');

const file = 'd:\\cobbbb\\cobb-ui\\src\\App.jsx';
const content = fs.readFileSync(file, 'utf8');

const markers = [
  "{/* 1. COMMAND CENTER */}",
  "{/* 4. DEAD STOCK WITH AI OUTFIT MATCHER */}",
  "{activeTab === 'deadstock' && (",
  "{/* 6. AI CAMPAIGN BUILDER */}",
  "{/* 7. AUTOMATION ENGINE */}",
  "{/* 8. LIVE BILLS */}",
  "{/* 9. VIP & DORMANT */}",
  "{/* CUSTOMER PROFILE MODAL / DRAWER WITH AI */}",
];

markers.forEach(m => {
  const index = content.indexOf(m);
  if (index !== -1) {
    const lineNum = content.substring(0, index).split('\n').length;
    console.log(`FOUND: "${m}" at line ${lineNum} (index ${index})`);
  } else {
    console.log(`MISSING: "${m}"`);
  }
});
