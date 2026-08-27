const fs = require('fs');
const c = fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', 'utf8').split('\n');
for(let i=1080; i<1150; i++) {
  const line = c[i];
  if(line.includes('\`')) {
    console.log('Line '+(i+1)+': '+line);
  }
}
