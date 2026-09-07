const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

const newVars = [
  'totalMonthlyUnits', 'totalMonthlyRevenue', 'maxHourlyRevenue', 'averageOrderValue'
];

const newSafeProps = newVars.map(v => `${v}: typeof ${v} !== 'undefined' ? ${v} : undefined`).join(',\n    ');

c = c.replace('const appState = {', 'const appState = {\n    ' + newSafeProps + ',');

fs.writeFileSync('src/App.jsx', c);
