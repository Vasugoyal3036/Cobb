const fs = require('fs');
const lines = fs.readFileSync('C:/Users/hp/.gemini/antigravity-ide/brain/654bbaf7-bda4-4218-b09e-cfcbc70a286b/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

let found = false;
for (const line of lines) {
    if (!line) continue;
    try {
        const parsed = JSON.parse(line);
        if (parsed.content && parsed.content.includes('app.get(\'/api/sales/returns\'')) {
            console.log("Found at step", parsed.step_index, "type", parsed.type);
            const contentLines = parsed.content.split('\n');
            const targetLine = contentLines.findIndex(l => l.includes('app.get(\'/api/sales/returns\''));
            console.log(contentLines.slice(targetLine, targetLine + 50).join('\n'));
            found = true;
            break;
        }
    } catch (e) {}
}
