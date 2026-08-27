const fs = require('fs');
let code = fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', 'utf-8');

const toRemove = [
  'axios.get(`${API_BASE}/api/customers/dormant`).then(res => setDormant(res.data)).catch(console.error);',
  'axios.get(`${API_BASE}/api/inventory`).then(res => setInventory(res.data)).catch(console.error);',
  'axios.get(`${API_BASE}/api/inventory/dead-stock`).then(res => setDeadStock(res.data)).catch(console.error);',
  'axios.get(`${API_BASE}/api/analytics/monthly-products`).then(res => setMonthlyProducts(res.data)).catch(console.error);',
  'axios.get(`${API_BASE}/api/financials/gst-summary`).then(res => setGstSummary(res.data)).catch(console.error);',
  'axios.get(`${API_BASE}/api/inventory/size-matrix`).then(res => setSizeMatrix(res.data)).catch(console.error);',
  'axios.get(`${API_BASE}/api/analytics/top-movers`).then(res => setTopMoversData(res.data)).catch(console.error);',
  'axios.get(`${API_BASE}/api/customers/vip`).then(res => setVips(res.data)).catch(console.error);'
];

for (const line of toRemove) {
  code = code.replace(line, '');
}

const lazyLoadEffect = `
  useEffect(() => {
    switch(activeTab) {
      case 'inventory':
        axios.get(\`\${API_BASE}/api/inventory\`).then(res => setInventory(res.data)).catch(console.error);
        break;
      case 'deadstock':
        axios.get(\`\${API_BASE}/api/inventory/dead-stock\`).then(res => setDeadStock(res.data)).catch(console.error);
        break;
      case 'monthly':
        axios.get(\`\${API_BASE}/api/analytics/monthly-products\`).then(res => setMonthlyProducts(res.data)).catch(console.error);
        break;
      case 'gst':
        axios.get(\`\${API_BASE}/api/financials/gst-summary\`).then(res => setGstSummary(res.data)).catch(console.error);
        break;
      case 'sizematrix':
        axios.get(\`\${API_BASE}/api/inventory/size-matrix\`).then(res => setSizeMatrix(res.data)).catch(console.error);
        break;
      case 'topmovers':
        axios.get(\`\${API_BASE}/api/analytics/top-movers\`).then(res => setTopMoversData(res.data)).catch(console.error);
        break;
      case 'vip':
        axios.get(\`\${API_BASE}/api/customers/vip\`).then(res => setVips(res.data)).catch(console.error);
        break;
    }
  }, [activeTab]);
`;

code = code.replace('useEffect(() => {', lazyLoadEffect + '\n  useEffect(() => {');

code = code.replace('{ id: "trending", label: "Trending Catalog", icon: Star, colorClass: "text-amber-400 hover:bg-slate-900 hover:text-white", activeColorClass: "bg-amber-500/15 text-amber-400 font-bold border-l-2 border-amber-500" },', '');
code = code.replace('{ id: "campaigns", label: "AI Campaigns", icon: Megaphone, colorClass: "text-indigo-400 hover:bg-slate-900 hover:text-indigo-300", activeColorClass: "bg-indigo-500/15 text-indigo-400 font-bold border-l-2 border-indigo-500" },', '');
code = code.replace('{ id: "dormant", label: "Dormant Clients", icon: AlertCircle },', '');

fs.writeFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', code);
console.log('App.jsx has been rewritten successfully.');
