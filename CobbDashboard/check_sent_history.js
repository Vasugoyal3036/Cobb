const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'sent_bills.txt');
if (fs.existsSync(file)) {
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    console.log(`sent_bills.txt has ${lines.length} recorded bills.`);
    console.log("Last 5 recorded CM_IDs:", lines.slice(-5));
} else {
    console.log("sent_bills.txt does not exist.");
}
