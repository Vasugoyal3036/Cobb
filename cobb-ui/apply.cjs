const fs = require('fs');
let c = fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', 'utf8');
let m = fs.readFileSync('d:\\cobbbb\\cobb-ui\\fix3.cjs', 'utf8');

// Extract missingBlock string content manually
const startToken = "const missingBlock = `";
const endToken = "`;\\n\\n// Replace";
const startIdx = m.indexOf(startToken) + startToken.length;
const endIdx = m.indexOf(endToken);
const block = m.substring(startIdx, endIdx);

// Replace
c = c.replace('className={`w-\\n                {/* BENTO GRID: Middle Row */}', 'className={`w-' + block + '\\n                {/* BENTO GRID: Middle Row */}');

fs.writeFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', c);
