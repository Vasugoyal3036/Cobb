const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = __dirname;
const stage = path.join(root, 'staging');
const targetAsar = path.join(process.env.LOCALAPPDATA, 'Programs', 'cobb-ui', 'resources', 'app.asar');

console.log('Target asar:', targetAsar);

if (fs.existsSync(stage)) {
  fs.rmSync(stage, { recursive: true, force: true });
}
fs.mkdirSync(stage);

// Copy package.json
fs.copyFileSync(path.join(root, 'package.json'), path.join(stage, 'package.json'));

// Copy dist-electron
fs.cpSync(path.join(root, 'dist-electron'), path.join(stage, 'dist-electron'), { recursive: true });

// Copy dist
fs.cpSync(path.join(root, 'dist'), path.join(stage, 'dist'), { recursive: true });

console.log('Staging prepared. Packing with @electron/asar...');
execSync(`npx -y @electron/asar pack "${stage}" "${targetAsar}"`, { stdio: 'inherit' });

fs.rmSync(stage, { recursive: true, force: true });
console.log('app.asar successfully repacked!');
