const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');
code = code.replace(/setListenerLogs\(res\.data\.logs\);/g, 'setListenerLogs(res.data.logs || []);');
code = code.replace(/setGatewayLogs\(res\.data\.logs\);/g, 'setGatewayLogs(res.data.logs || []);');
code = code.replace(/\{\(\(activeConsole === 'gateway' \? gatewayLogs : listenerLogs\)\.length === 0\) \? \(/g, '{(((activeConsole === "gateway" ? gatewayLogs : listenerLogs) || []).length === 0) ? (');
code = code.replace(/\(\(activeConsole === 'gateway' \? gatewayLogs : listenerLogs\)\.map/g, '((activeConsole === "gateway" ? gatewayLogs : listenerLogs) || []).map');
fs.writeFileSync('src/App.jsx', code);
console.log('Patched correctly');
