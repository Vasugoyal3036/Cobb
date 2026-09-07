const fs = require('fs');
const file = 'd:\\cobbbb\\cobb-ui\\src\\App.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace all block setToasts
content = content.replace(/setToasts\(prev => \[\s*\{\s*id: Date\.now\(\),\s*msg: `New WhatsApp message from \$\{data\.message\.pushName \|\| data\.message\.from\}`,\s*type: 'success'\s*\},\s*\.\.\.prev\s*\]\.slice\(0, 3\)\);/g, 
  "addToast({ msg: `New WhatsApp message from ${data.message.pushName || data.message.from}`, type: 'success' });");

content = content.replace(/setToasts\(prev => \[newToast, \.\.\.prev\]\.slice\(0, 3\)\);\s*setTimeout\(\(\) => \{\s*setToasts\(prev => prev\.filter\(t => t\.id !== toastId\)\);\s*\}, 5000\);/g,
  "addToast(newToast);");

content = content.replace(/setToasts\(prev => \[\s*\{\s*id: Date\.now\(\),\s*title: "Live Bill Processed",\s*billNumber: wsData\.data\.billNumber,\s*customer: wsData\.data\.customer,\s*amount: wsData\.data\.amount,\s*paymentMode: wsData\.data\.paymentMode,\s*duration: 5000\s*\},\s*\.\.\.prev\s*\]\.slice\(0, 3\)\);/g,
  "addToast({ title: 'Live Bill Processed', billNumber: wsData.data.billNumber, customer: wsData.data.customer, amount: wsData.data.amount, paymentMode: wsData.data.paymentMode });");

content = content.replace(/setToasts\(prev => \[\s*\{\s*id: Date\.now\(\),\s*title: "Inventory Alert",\s*msg: `Item \$\{wsData\.data\.sku\} scanned!`,\s*type: 'info',\s*duration: 4000\s*\},\s*\.\.\.prev\s*\]\.slice\(0, 3\)\);/g,
  "addToast({ title: 'Inventory Alert', msg: `Item ${wsData.data.sku} scanned!`, type: 'info' });");

content = content.replace(/setToasts\(prev => \[\s*\{\s*id: Date\.now\(\),\s*title: "System Update",\s*msg: "Connected to Live Activity Stream",\s*type: 'success',\s*duration: 3000\s*\},\s*\.\.\.prev\s*\]\.slice\(0, 3\)\);/g,
  "addToast({ title: 'System Update', msg: 'Connected to Live Activity Stream', type: 'success' });");

fs.writeFileSync(file, content);
console.log('Replaced specific setToasts calls');
