const fs = require('fs');
const code = fs.readFileSync('d:/cobbbb/CobbDashboard/server.js', 'utf8');

const startIdx = code.indexOf('// 2. Comprehensive Store Owner EOD Closing Digest');
const endIdx = code.indexOf('// 3. ', startIdx); 

console.log('Start index:', startIdx);
console.log('Next section index:', endIdx);

if (startIdx !== -1 && endIdx !== -1) {
    console.log(code.substring(endIdx, endIdx + 200));
}
