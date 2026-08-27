const fs = require('fs');
const c = fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', 'utf8').split('\\n');
let b = 0;
for(let i=0; i<c.length; i++){
  let bts = (c[i].match(/\`/g) || []).length;
  let esc = (c[i].match(/\\\`/g) || []).length;
  b += bts;
  b -= esc;
  if (b % 2 !== 0) {
    console.log('Unclosed at line ' + (i+1));
    break;
  }
}
