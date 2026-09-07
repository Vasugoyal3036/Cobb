const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');
let m = c.match(/import\s+\{[\s\S]*?\}\s+from\s+['"]lucide-react['"];/);
console.log(m ? m[0] : 'not found');
