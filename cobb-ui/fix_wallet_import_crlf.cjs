const fs = require('fs');
let app = fs.readFileSync('d:/cobbbb/cobb-ui/src/App.jsx', 'utf8');

if (!app.match(/Wallet\b.*from ['"]lucide-react['"]/)) {
    app = app.replace(/Eye([\r\n\s]*)\}\s*from\s*['"]lucide-react['"];?/, 'Eye,$1  Wallet$1} from \'lucide-react\';');
    fs.writeFileSync('d:/cobbbb/cobb-ui/src/App.jsx', app);
    console.log('Wallet import added correctly');
} else {
    console.log('Wallet already imported');
}
