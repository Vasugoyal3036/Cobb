const fs = require('fs');
const c = fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', 'utf8').split('\n');
let count = 0;
for(let i=0; i<c.length; i++) {
  const line = c[i];
  // Replace escaped backticks with empty string so they don't count
  const clean = line.replace(/\\\`/g, '');
  const ticks = (clean.match(/\`/g) || []).length;
  count += ticks;
  if(count % 2 !== 0) {
    console.log('Unclosed backtick at line ' + (i+1) + ': ' + line);
    break;
  }
}
