const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'electron_debug.log');
fs.writeFileSync(logFile, '--- Starting Electron ---\n');

const electronPath = require('electron');
const app = spawn(electronPath, ['.'], {
  cwd: __dirname,
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' }
});

app.stdout.on('data', data => {
  fs.appendFileSync(logFile, `[STDOUT] ${data.toString()}`);
  console.log(data.toString());
});

app.stderr.on('data', data => {
  fs.appendFileSync(logFile, `[STDERR] ${data.toString()}`);
  console.error(data.toString());
});

app.on('close', code => {
  fs.appendFileSync(logFile, `--- Exited with code ${code} ---\n`);
  console.log(`Exited with code ${code}`);
});
