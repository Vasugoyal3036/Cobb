const fs = require('fs');
const content = fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\all_mrc.txt', 'utf8');

const diffLines = content.split('\\n');
let recovered = [];
let inDiff = false;
let foundStart = false;

for (let i = 0; i < diffLines.length; i++) {
    let line = diffLines[i];
    if (line.includes('@@ -406,952')) {
        inDiff = true;
        foundStart = true;
        continue;
    }
    if (inDiff) {
        if (line.startsWith('-')) {
            recovered.push(line.substring(1));
        } else if (line.startsWith('+')) {
            // skip
        } else if (line.startsWith(' ')) {
            recovered.push(line.substring(1));
        } else if (line.includes('[diff_block_end]')) {
            break;
        } else {
            // maybe it doesn't start with space because it's empty line
            if (line === '') {
                recovered.push('');
            } else if (line.startsWith('\"') || line.startsWith('}')) {
                // end of json string
                break;
            } else {
                recovered.push(line);
            }
        }
    }
}

fs.writeFileSync('d:\\cobbbb\\cobb-ui\\src\\recovered.txt', recovered.join('\n'));
console.log('Recovered lines count:', recovered.length);
if (!foundStart) console.log('Did not find @@ -406,952');
