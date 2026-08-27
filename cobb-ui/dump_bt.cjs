const fs = require('fs');
const c = fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', 'utf8').split('\\n');
let out = '';
for(let i=0; i<c.length; i++) {
  if (c[i].includes('\`')) {
     out += `${i+1}: ${c[i]}\\n`;
  }
}
fs.writeFileSync('d:\\cobbbb\\cobb-ui\\src\\backticks.txt', out);
