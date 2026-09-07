const fs = require('fs');
const logPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/654bbaf7-bda4-4218-b09e-cfcbc70a286b/.system_generated/logs/transcript_full.jsonl';
const lines = fs.readFileSync(logPath, 'utf8').split('\n');
for (const line of lines) {
    if (line && line.includes('"step_index":207')) {
        const parsed = JSON.parse(line);
        console.log(parsed.content);
        break;
    }
}
