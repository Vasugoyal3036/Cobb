const fs = require('fs');
const code = fs.readFileSync('d:/cobbbb/CobbDashboard/server.js', 'utf8');

const startIdx = code.indexOf('// 2. Comprehensive Store Owner EOD Closing Digest');
const nextSection = code.indexOf('// 3. Automation Queue Engine'); // Assuming there's a 3.

console.log('Start index:', startIdx);
console.log('Next section index:', nextSection);

if (startIdx !== -1 && nextSection !== -1) {
    console.log(code.substring(nextSection, nextSection + 200));
}
