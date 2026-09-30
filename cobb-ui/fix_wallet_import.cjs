const fs = require('fs');
let app = fs.readFileSync('d:/cobbbb/cobb-ui/src/App.jsx', 'utf8');

if (!app.includes('Wallet,')) {
    app = app.replace(/Eye\n\} from 'lucide-react';/, "Eye,\n  Wallet\n} from 'lucide-react';");
    fs.writeFileSync('d:/cobbbb/cobb-ui/src/App.jsx', app);
    console.log('Wallet import added correctly');
} else {
    console.log('Wallet already imported');
}
