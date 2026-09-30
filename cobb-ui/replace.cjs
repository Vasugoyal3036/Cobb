const fs = require('fs');
let code = fs.readFileSync('d:/cobbbb/cobb-ui/src/components/Layout.jsx', 'utf8');
code = code.replace(/<(Activity|Calculator|Sparkles|FileText|Database) className=\"/g, '<$1 className=\"transition-transform duration-700 group-hover:rotate-[360deg] ');
fs.writeFileSync('d:/cobbbb/cobb-ui/src/components/Layout.jsx', code);
console.log("Done");
