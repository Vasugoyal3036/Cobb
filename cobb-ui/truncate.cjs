const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

// Find the line with `    </div>` at the end of the App
const endDivIndex = lines.findLastIndex(l => l.trim() === '</div>');
// That is line 3352. Line 3353 is `  );`. Line 3354 is `}\n...`
// Let's just slice up to endDivIndex + 1 (the `  );` line) and add a final `}`.
const newLines = lines.slice(0, endDivIndex + 2); // 0 to 3353
newLines.push('}');
newLines.push('');

fs.writeFileSync('src/App.jsx', newLines.join('\n'));
console.log("Truncated!");
