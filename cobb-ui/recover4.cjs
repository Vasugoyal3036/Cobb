const fs = require('fs');
const content = fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\all_mrc.txt', 'utf8');

const diffLines = content.split('\\n');
let recovered = [];
let inDiff = false;

for (let i = 0; i < diffLines.length; i++) {
    let line = diffLines[i];
    if (line.includes('@@ -406,952')) {
        inDiff = true;
        continue;
    }
    if (inDiff) {
        if (line.startsWith('-')) {
            recovered.push(line.substring(1));
        } else if (line.includes('[diff_block_end]')) {
            break;
        } else if (line.startsWith('+') || line.startsWith(' ')) {
            // skip context and additions
        } else {
             if (line.startsWith('\"') || line.startsWith('}')) break;
        }
    }
}

// Write the lines to be inserted, BUT we must REMOVE the `handleNextTip` stuff
// because the user wants to remove the AI briefing feature completely.
// Wait, actually I just need to return the functions, but omit the handleNextTip and AI tips functions.

let finalLines = [];
let skipTip = false;
for (let i=0; i<recovered.length; i++) {
    let line = recovered[i];
    // Remove formatting \r
    line = line.replace(/\\r/g, '');
    
    if (line.includes('const handleNextTip =')) continue;
    if (line.includes('const handlePrevTip =')) continue;
    if (line.includes('const handleRefreshForecastTips =')) {
        skipTip = true;
        continue;
    }
    if (skipTip) {
        if (line.includes('};') && !line.includes('  ')) { 
            // Wait, handleRefreshForecastTips ends with `  };\n`
            if (line.startsWith('  };')) { skipTip = false; }
        } else if (line.trim() === '};') {
            skipTip = false;
        }
        continue;
    }
    
    // We also don't want the AI demand forecaster slider card at the end.
    if (line.includes('{/* AI Demand Forecaster Slider Card */}')) {
        break; // stop completely! The rest is the card which we don't want.
    }
    
    finalLines.push(line);
}

fs.writeFileSync('d:\\cobbbb\\cobb-ui\\src\\recovered_clean.txt', finalLines.join('\n'));
console.log('Clean recovered lines count:', finalLines.length);
