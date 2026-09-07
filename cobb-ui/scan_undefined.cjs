// This script scans every tab component for variables/functions used
// that aren't defined locally (imported or declared in the file).
// It finds what's missing and adds them to the destructured props.

const fs = require('fs');
const path = require('path');

const tabDir = 'src/components/tabs';
const appFile = 'src/App.jsx';

// Read App.jsx to find all computed variables in the render body
const appContent = fs.readFileSync(appFile, 'utf8');

// Get ALL identifiers defined at any level in App.jsx
const appLines = appContent.split('\n');
const definedInApp = new Set();

for (const line of appLines) {
  // Match: const X = ..., let X = ..., function X(
  let m;
  m = line.match(/(?:const|let|var)\s+(\w+)\s*=/);
  if (m) definedInApp.add(m[1]);
  m = line.match(/(?:const|let|var)\s+\[(\w+),\s*(\w+)\]/);
  if (m) { definedInApp.add(m[1]); definedInApp.add(m[2]); }
  m = line.match(/function\s+(\w+)/);
  if (m) definedInApp.add(m[1]);
}

console.log(`Found ${definedInApp.size} identifiers defined in App.jsx`);

// For each tab file, find what's used but not defined
const tabFiles = fs.readdirSync(tabDir).filter(f => f.endsWith('.jsx'));

for (const file of tabFiles) {
  const filePath = path.join(tabDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find all identifiers used in JSX and JS 
  // We look for word-boundary identifiers that aren't common JS globals
  const jsGlobals = new Set([
    'React', 'useState', 'useEffect', 'useRef', 'useCallback', 'useMemo',
    'console', 'window', 'document', 'Math', 'Date', 'JSON', 'Array', 'Object',
    'String', 'Number', 'Boolean', 'Error', 'Promise', 'Set', 'Map', 'RegExp',
    'parseInt', 'parseFloat', 'isNaN', 'undefined', 'null', 'true', 'false',
    'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'fetch',
    'alert', 'confirm', 'prompt', 'navigator', 'location', 'history',
    'encodeURIComponent', 'decodeURIComponent', 'btoa', 'atob',
    'Infinity', 'NaN', 'globalThis', 'this', 'arguments', 'super',
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
    'return', 'throw', 'try', 'catch', 'finally', 'new', 'delete', 'typeof',
    'instanceof', 'in', 'of', 'void', 'yield', 'await', 'async', 'class',
    'extends', 'static', 'get', 'set', 'import', 'export', 'default', 'from',
    'as', 'let', 'const', 'var', 'function', 'with',
    'props', 'e', 'i', 'j', 'k', 'v', 'c', 'r', 'x', 'y', 'acc', 'curr',
    'prev', 'item', 'index', 'key', 'value', 'err', 'error', 'data', 'res',
    'response', 'result', 'msg', 'el', 'ref', 'cb', 'fn', 'arg', 'args',
    'event', 'target', 'type', 'name', 'id', 'className', 'style', 'children',
    'onClick', 'onChange', 'onSubmit', 'onKeyDown', 'onBlur', 'onFocus',
    'href', 'src', 'alt', 'title', 'placeholder', 'disabled', 'checked',
    'min', 'max', 'step', 'rows', 'cols', 'width', 'height',
    'length', 'map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every',
    'includes', 'indexOf', 'slice', 'splice', 'push', 'pop', 'shift', 'unshift',
    'join', 'split', 'replace', 'match', 'test', 'trim', 'toLowerCase', 'toUpperCase',
    'toString', 'toFixed', 'toLocaleString', 'keys', 'values', 'entries',
    'assign', 'freeze', 'create', 'defineProperty', 'hasOwnProperty',
    'floor', 'ceil', 'round', 'abs', 'pow', 'sqrt', 'log', 'random',
    'now', 'getTime', 'getDate', 'getMonth', 'getFullYear', 'getHours',
    'toLocaleDateString', 'toISOString',
    'stringify', 'parse', 'from', 'isArray', 'flat', 'flatMap', 'fill',
    'sort', 'reverse', 'concat', 'copyWithin', 'findIndex',
    'startsWith', 'endsWith', 'padStart', 'padEnd', 'repeat', 'charAt',
    'charCodeAt', 'codePointAt', 'normalize', 'search', 'matchAll',
    'substring', 'substr',
    'then', 'catch', 'finally', 'all', 'race', 'resolve', 'reject',
    'has', 'add', 'delete', 'clear', 'size', 'entries', 'forEach',
  ]);
  
  // Find all identifiers that are imported in the file
  const importedIds = new Set();
  const importRegex = /import\s+(?:\{([^}]+)\}|(\w+))\s+from/g;
  let imMatch;
  while ((imMatch = importRegex.exec(content)) !== null) {
    if (imMatch[1]) {
      imMatch[1].split(',').forEach(s => {
        const trimmed = s.trim().split(/\s+as\s+/);
        importedIds.add(trimmed[trimmed.length - 1].trim());
      });
    }
    if (imMatch[2]) importedIds.add(imMatch[2]);
  }
  
  // Find all locally declared identifiers
  const localIds = new Set();
  const lines = content.split('\n');
  for (const line of lines) {
    let m;
    m = line.match(/(?:const|let|var)\s+(\w+)\s*=/);
    if (m) localIds.add(m[1]);
    m = line.match(/(?:const|let|var)\s+\[(\w+),\s*(\w+)\]/);
    if (m) { localIds.add(m[1]); localIds.add(m[2]); }
    m = line.match(/function\s+(\w+)/);
    if (m) localIds.add(m[1]);
    // Also match arrow functions as params: (x, y) => or x =>
  }
  
  // Find the existing destructured props
  const propsMatch = content.match(/const\s*\{([^}]+)\}\s*=\s*props/);
  const existingProps = new Set();
  if (propsMatch) {
    propsMatch[1].split(',').forEach(s => {
      const trimmed = s.trim();
      if (trimmed) existingProps.add(trimmed);
    });
  }
  
  console.log(`\n=== ${file} ===`);
  console.log(`  Imported: ${importedIds.size}, Local: ${localIds.size}, Props: ${existingProps.size}`);
}

// Now let's take a different approach - find ALL variables used in DashboardTab 
// that are also defined in App.jsx but NOT in DashboardTab's own scope
const dashFile = path.join(tabDir, 'DashboardTab.jsx');
const dashContent = fs.readFileSync(dashFile, 'utf8');

// Find uses of identifiers that look like they come from App.jsx
// These are identifiers used as JSX components or in expressions
const usedIdentifiers = new Set();
const idRegex = /\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g;
let idMatch;
while ((idMatch = idRegex.exec(dashContent)) !== null) {
  usedIdentifiers.add(idMatch[1]);
}

// Filter to only those defined in App.jsx
const fromApp = [...usedIdentifiers].filter(id => definedInApp.has(id));

// Check which ones are NOT imported or locally defined in DashboardTab
const dashImported = new Set();
const dashImportRegex = /import\s+(?:\{([^}]+)\}|(\w+))\s+from/g;
let dim;
while ((dim = dashImportRegex.exec(dashContent)) !== null) {
  if (dim[1]) {
    dim[1].split(',').forEach(s => {
      const trimmed = s.trim().split(/\s+as\s+/);
      dashImported.add(trimmed[trimmed.length - 1].trim());
    });
  }
  if (dim[2]) dashImported.add(dim[2]);
}

const dashLocal = new Set();
const dashLines = dashContent.split('\n');
for (const line of dashLines) {
  let m;
  m = line.match(/(?:const|let|var)\s+(\w+)\s*=/);
  if (m) dashLocal.add(m[1]);
  m = line.match(/(?:const|let|var)\s+\[(\w+),\s*(\w+)\]/);
  if (m) { dashLocal.add(m[1]); dashLocal.add(m[2]); }
  m = line.match(/function\s+(\w+)/);
  if (m) dashLocal.add(m[1]);
}

const dashPropsMatch = dashContent.match(/const\s*\{([^}]+)\}\s*=\s*props/);
const dashProps = new Set();
if (dashPropsMatch) {
  dashPropsMatch[1].split(',').forEach(s => {
    const trimmed = s.trim();
    if (trimmed) dashProps.add(trimmed);
  });
}

const missing = fromApp.filter(id => 
  !dashImported.has(id) && !dashLocal.has(id) && !dashProps.has(id)
);

console.log('\n\n=== Variables from App.jsx used in DashboardTab but NOT defined/imported/destructured: ===');
console.log(missing.join('\n'));
