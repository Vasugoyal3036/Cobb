const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Replace ANY instance of "something (NOLOCK)" with "something WITH (NOLOCK)"
// Also account for cases like "VW_CASHMEMO_PRINT_MST (NOLOCK)" and "m (NOLOCK)"
// First, temporarily change "WITH (NOLOCK)" to something else so we don't double replace
content = content.replace(/WITH \(NOLOCK\)/g, '@@WITH_NOLOCK@@');

// Now replace " (NOLOCK)" with " WITH (NOLOCK)"
content = content.replace(/ \(NOLOCK\)/g, ' WITH (NOLOCK)');

// Restore the ones that were already correct
content = content.replace(/@@WITH_NOLOCK@@/g, 'WITH (NOLOCK)');
content = content.replace(/WITH WITH \(NOLOCK\)/g, 'WITH (NOLOCK)');

fs.writeFileSync(serverPath, content);
console.log('Fixed NOLOCK syntax in server.js');
