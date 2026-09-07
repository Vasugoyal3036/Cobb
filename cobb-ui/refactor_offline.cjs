const fs = require('fs');
const file = 'd:\\cobbbb\\cobb-ui\\src\\App.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add import
if (!content.includes('./utils/offlineDb')) {
  content = content.replace(
    "import { useToast } from './context/ToastContext';",
    "import { useToast } from './context/ToastContext';\nimport { fetchWithOfflineFallback } from './utils/offlineDb';"
  );
}

// 2. Replace Inventory fetch
content = content.replace(
  /axios\.get\(`\$\{API_BASE\}\/api\/inventory`\)\.then\(res => setInventory\(res\.data\)\)\.catch\(console\.error\);/g,
  "fetchWithOfflineFallback('inventory', `${API_BASE}/api/inventory`).then(data => setInventory(data)).catch(console.error);"
);

// 3. Replace Dead Stock fetch
content = content.replace(
  /axios\.get\(`\$\{API_BASE\}\/api\/inventory\/dead-stock`\)\.then\(res => setDeadStock\(res\.data\)\)\.catch\(console\.error\);/g,
  "fetchWithOfflineFallback('dead-stock', `${API_BASE}/api/inventory/dead-stock`).then(data => setDeadStock(data)).catch(console.error);"
);

// 4. Replace Top Movers fetch
content = content.replace(
  /axios\.get\(`\$\{API_BASE\}\/api\/analytics\/top-movers`\)\.then\(res => setTopMoversData\(res\.data\)\)\.catch\(console\.error\);/g,
  "fetchWithOfflineFallback('top-movers', `${API_BASE}/api/analytics/top-movers`).then(data => setTopMoversData(data)).catch(console.error);"
);

fs.writeFileSync(file, content);
console.log('Offline DB integration complete');
