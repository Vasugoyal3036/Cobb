const fs = require('fs');
const c = fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', 'utf8');
const lines = c.split('\n');
let backtickCount = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let ticks = (line.match(/`/g) || []).length;
  // Ignore escaped backticks?
  ticks -= (line.match(/\\`/g) || []).length;
  backtickCount += ticks;
  if (backtickCount % 2 !== 0) {
    console.log(`Open backtick spanning line ${i+1}`);
  }
}
