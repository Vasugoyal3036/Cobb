const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');
let m = c.match(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];/);

const lucideImport = m ? m[0] : '';

let files = fs.readdirSync('src/components/tabs');
files.forEach(f => {
  let p = 'src/components/tabs/' + f;
  let tabContent = fs.readFileSync(p, 'utf8');
  
  // Replace the old lucide-react import in the tab with the giant one from App.jsx!
  if (lucideImport) {
    if (tabContent.includes('lucide-react')) {
      tabContent = tabContent.replace(/import\s+\{[^}]+\}\s+from\s+['"]lucide-react['"];/, lucideImport);
    } else {
      tabContent = tabContent.replace(/(import React.*?;\n)/, '$1' + lucideImport + '\n');
    }
  }
  
  fs.writeFileSync(p, tabContent);
});

// Also replace in CustomerProfileModal.jsx
let modalPath = 'src/components/CustomerProfileModal.jsx';
if (fs.existsSync(modalPath) && lucideImport) {
  let modalContent = fs.readFileSync(modalPath, 'utf8');
  if (modalContent.includes('lucide-react')) {
    modalContent = modalContent.replace(/import\s+\{[^}]+\}\s+from\s+['"]lucide-react['"];/, lucideImport);
  } else {
    modalContent = modalContent.replace(/(import React.*?;\n)/, '$1' + lucideImport + '\n');
  }
  fs.writeFileSync(modalPath, modalContent);
}

console.log('Done!');
