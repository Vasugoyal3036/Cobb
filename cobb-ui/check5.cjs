const fs = require('fs');
const c = fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', 'utf8').split('\n');
for(let i=845; i<1080; i++) {
  const line = c[i];
  const clean = line.replace(/\\\`/g, '');
  const ticks = (clean.match(/\`/g) || []).length;
  if(ticks > 0) {
    console.log('Line '+(i+1)+': '+line);
  }
}
