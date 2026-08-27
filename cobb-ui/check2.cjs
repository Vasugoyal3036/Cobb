const fs = require('fs');
const c = fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', 'utf8').split('\\n');
for(let i=0; i<1100; i++) {
  let bts = (c[i].match(/\`/g) || []).length;
  if(bts % 2 !== 0) {
     console.log('Line '+(i+1)+': '+c[i]);
  }
}
