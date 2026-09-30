const fs = require('fs');
let code = fs.readFileSync('d:/cobbbb/CobbDashboard/server.js', 'utf8');

const sigIdx = code.indexOf('process.on');
if (sigIdx !== -1) {
    console.log(code.substring(sigIdx, sigIdx + 1500));
} else {
    console.log("No process.on found");
}
