const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');
code = code.replace(/\(activeConsole === 'gateway' \? gatewayLogs : listenerLogs\)\.map/g, '((activeConsole === "gateway" ? gatewayLogs : listenerLogs) || []).map');
fs.writeFileSync('src/App.jsx', code);
console.log('Patched map correctly');
