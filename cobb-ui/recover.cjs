const fs = require('fs');
const readline = require('readline');

async function recover() {
    const path = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\9768fdde-9491-417d-95c6-c8bd8837c28d\\.system_generated\\logs\\transcript_full.jsonl';
    const fileStream = fs.createReadStream(path);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (line.includes('multi_replace_file_content')) {
            fs.appendFileSync('d:\\cobbbb\\cobb-ui\\src\\all_mrc.txt', line + '\\n\\n');
        }
    }
    console.log('Done mapping MRC lines');
}

recover();
