const fs=require('fs');
let c=fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', 'utf8');
c=c.replace('Last Billed Date\\', 'Last Billed Date\\\\n";');
fs.writeFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', c);
