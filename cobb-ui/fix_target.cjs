const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');
c = c.replace('const appState = {', 'const appState = {\n    DAILY_TARGET: typeof DAILY_TARGET !== "undefined" ? DAILY_TARGET : undefined,\n    targetProgress: typeof targetProgress !== "undefined" ? targetProgress : undefined,');
fs.writeFileSync('src/App.jsx', c);
