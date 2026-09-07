const fs = require('fs');

const appPath = 'd:\\cobbbb\\cobb-ui\\src\\App.jsx';
let content = fs.readFileSync(appPath, 'utf-8');

// 1. Add import
content = content.replace(
  "import React, { useState, useEffect, useRef } from 'react';",
  "import React, { useState, useEffect, useRef } from 'react';\nimport { useToast } from './context/ToastContext';"
);

// 2. Replace state hook
content = content.replace(
  "const [toasts, setToasts] = useState([]);",
  "const { addToast } = useToast();"
);

// 3. Remove the floating toast container JSX (approximate block)
// I will use regex to find the block
const toastBlockRegex = /\{\/\* Floating Toast Notifications Container with Timer Progress Bar \*\/\}[\s\S]*?\{\/\* Toast Visual Progress Countdown Bar \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*\)\s*}\s*<\/div>/;

content = content.replace(toastBlockRegex, '');

// Since there are multiple forms of setToasts, I will just leave this script as is 
// and do the JSX removal manually if this fails.

fs.writeFileSync(appPath, content);
console.log('Done basic replacement. Please check the file manually for setToasts calls.');
