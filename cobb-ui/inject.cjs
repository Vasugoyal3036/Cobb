const fs = require('fs');

const app = fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', 'utf8');
const lines = app.split('\n');

const recovered = fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\recovered_clean.txt', 'utf8');

// Find the line index of `                {/* BENTO GRID: Middle Row */}`
let index = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('{/* BENTO GRID: Middle Row */}')) {
        index = i;
        break;
    }
}

if (index !== -1) {
    // Insert recovered right before this line
    lines.splice(index, 0, recovered);
    fs.writeFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', lines.join('\n'));
    console.log('Successfully injected recovered lines into App.jsx!');
} else {
    console.log('Could not find injection point!');
}
