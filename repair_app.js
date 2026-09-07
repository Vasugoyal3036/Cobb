const fs = require('fs');
const path = require('path');

const appJsxPath = path.join(__dirname, 'cobb-ui', 'src', 'App.jsx');
let content = fs.readFileSync(appJsxPath, 'utf8');

// Replace const [var, setVar] = useState([]) with let [var, setVar] = useState([]); if (!Array.isArray(var)) var = [];
content = content.replace(/const \[([a-zA-Z0-9_]+),\s*([a-zA-Z0-9_]+)\]\s*=\s*useState\(\[\]\);/g, 
  'let [$1, $2] = useState([]); if (!Array.isArray($1)) $1 = [];'
);

// Specifically for returnsData
content = content.replace(/const \[returnsData,\s*setReturnsData\]\s*=\s*useState\(null\);/g,
  'let [returnsData, setReturnsData] = useState(null); if (returnsData && !Array.isArray(returnsData) && !returnsData.error && !returnsData.topArticles) returnsData = [];'
);

// specifically for TopMoversData which expects an object with topArticles array
content = content.replace(/const \[topMoversData,\s*setTopMoversData\]\s*=\s*useState\(null\);/g,
  'let [topMoversData, setTopMoversData] = useState(null); if (topMoversData && topMoversData.error) topMoversData = null;'
);

// Just to be absolutely safe for returnsData mapping
content = content.replace(/returnsData\.map/g, '(Array.isArray(returnsData) ? returnsData : []).map');
content = content.replace(/returnsData\.length/g, '(Array.isArray(returnsData) ? returnsData : []).length');
content = content.replace(/returnsData\.filter/g, '(Array.isArray(returnsData) ? returnsData : []).filter');

// Also clear the localforage cache just in case by injecting a script into index.html
const indexPath = path.join(__dirname, 'cobb-ui', 'index.html');
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  if (!indexContent.includes('localStorage.clear()')) {
    indexContent = indexContent.replace('</body>', '<script>if(window.location.search.includes("reset")) { localStorage.clear(); indexedDB.databases().then(dbs => dbs.forEach(db => indexedDB.deleteDatabase(db.name))); }</script></body>');
    fs.writeFileSync(indexPath, indexContent);
  }
}

fs.writeFileSync(appJsxPath, content);
console.log('App.jsx repaired with safety checks!');
