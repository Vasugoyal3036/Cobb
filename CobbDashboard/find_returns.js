const fs = require('fs');
const path = require('path');
const logPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/654bbaf7-bda4-4218-b09e-cfcbc70a286b/.system_generated/logs/transcript_full.jsonl';
const lines = fs.readFileSync(logPath, 'utf8').split('\n');
let originalFileContent = '';

for (const line of lines) {
    if (!line) continue;
    try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'VIEW_FILE' && parsed.content && parsed.content.includes('/api/sales/returns')) {
            console.log("Found VIEW_FILE containing /api/sales/returns at step", parsed.step_index);
            // Print the lines around it
            const linesContent = parsed.content.split('\n');
            const targetLine = linesContent.findIndex(l => l.includes('/api/sales/returns'));
            if (targetLine > -1) {
                 console.log(linesContent.slice(targetLine - 5, targetLine + 50).join('\n'));
                 break;
            }
        }
    } catch (e) {}
}
