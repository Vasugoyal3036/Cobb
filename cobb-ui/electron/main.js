import { app, BrowserWindow, protocol, net } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

// Register custom protocol scheme before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true } }
]);

let win;
let backendProcess = null;

// --- AUTO-START BACKEND SERVER ---
function startBackendServer() {
  const backendDir = path.join(process.env.APP_ROOT, '..', 'CobbDashboard');
  const serverScript = path.join(backendDir, 'server.js');

  if (!fs.existsSync(serverScript)) {
    console.log('[Electron] Backend server.js not found at:', serverScript);
    return;
  }

  console.log('[Electron] Starting backend server...');
  backendProcess = spawn('node', [serverScript], {
    cwd: backendDir,
    stdio: 'pipe',
    shell: true
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend ERR] ${data.toString().trim()}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`[Backend] Process exited with code ${code}`);
    backendProcess = null;
  });
}

function stopBackendServer() {
  if (backendProcess) {
    console.log('[Electron] Stopping backend server...');
    backendProcess.kill();
    backendProcess = null;
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
    },
  });

  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message} (line ${line} in ${sourceId})`);
  });

  if (VITE_DEV_SERVER_URL) {
    console.log('[Electron] Loading dev server URL:', VITE_DEV_SERVER_URL);
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    console.log('[Electron] Loading app://index.html');
    win.loadURL('app://-/index.html');
  }

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Electron] Failed to load:', errorCode, errorDescription);
  });
}

app.on('window-all-closed', () => {
  stopBackendServer();
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopBackendServer();
});

app.whenReady().then(() => {
  // Start backend automatically
  startBackendServer();

  // Handle custom protocol
  protocol.handle('app', (request) => {
    let url = request.url.substring('app://-/'.length);
    if (!url) url = 'index.html';
    // Remove query params or hashes
    url = url.split('?')[0].split('#')[0];
    
    let filePath = path.join(RENDERER_DIST, url);
    // fallback to index.html for SPA routing
    if (!fs.existsSync(filePath)) {
      filePath = path.join(RENDERER_DIST, 'index.html');
    }
    return net.fetch('file://' + filePath);
  });

  createWindow();
});
