const fs = require('fs');
const lines = fs.readFileSync('d:/cobbbb/cobb-ui/src/components/tabs/DashboardTab.jsx', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("activeTab === 'returns'")) {
        console.log(lines.slice(i, i + 50).join('\n'));
        break;
    }
}
