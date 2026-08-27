const fs = require('fs');

const raw = fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\recovered_raw.txt', 'utf8');
const obj = JSON.parse(raw);

let diff = '';
if (obj.tool_responses) {
    for (const tr of obj.tool_responses) {
        if (tr.name === 'default_api:multi_replace_file_content' && tr.response?.output?.includes('App.jsx')) {
            diff = tr.response.output;
        }
    }
} else if (obj.content) {
   // Maybe it is under content
   diff = obj.content;
} else if (obj.tool_calls) {
   // Wait, if it's a tool_call, then it's the model's message! We want the SYSTEM response message.
}

const lines = diff.split('\\n').join('\n').split('\n');
const recovered = [];
let inDiff = false;

for (const line of lines) {
    if (line.includes('@@ -406,952')) {
        inDiff = true;
        continue;
    }
    if (inDiff) {
        if (line.startsWith('-')) {
            recovered.push(line.substring(1));
        } else if (line.startsWith(' ')) {
            recovered.push(line.substring(1));
        } else if (line.startsWith('[diff_block_end]')) {
            break;
        }
    }
}

fs.writeFileSync('d:\\cobbbb\\cobb-ui\\src\\recovered.txt', recovered.join('\n'));
console.log('Recovered lines: ' + recovered.length);
