const fs = require('fs');
let c = fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', 'utf8');
const block = fs.readFileSync('d:\\cobbbb\\cobb-ui\\missing_block.txt', 'utf8');

c = c.replace(/className=\{\`w-\r?\n\s*\{\/\* BENTO GRID: Middle Row \*\/\}/, 'className={`w-' + block + '\\n                {/* BENTO GRID: Middle Row */}');

fs.writeFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', c);
console.log("Done");
