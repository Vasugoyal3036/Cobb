import { app, BrowserWindow, protocol, net } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

// Register custom protocol scheme before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } }
]);

let win;
let backendProcess = null;
let syncProcess = null;

// --- AUTO-START BACKEND SERVER ---
function startBackendServer() {
  const possiblePaths = [
    path.join(process.env.APP_ROOT, '..', 'CobbDashboard', 'server.js'),
    'D:\\cobbbb\\CobbDashboard\\server.js',
    path.join(process.cwd(), '..', 'CobbDashboard', 'server.js'),
    path.join(process.cwd(), 'CobbDashboard', 'server.js')
  ];
  const serverScript = possiblePaths.find(p => fs.existsSync(p));

  if (!serverScript) {
    console.log('[Electron] Backend server.js not found at any candidate path');
    return;
  }

  const backendDir = path.dirname(serverScript);
  const syncScript = path.join(backendDir, 'cloud_sync.js');

  try {
    const req = http.get('http://localhost:5000/api/sales/overview', (res) => {
      console.log('[Electron] Backend server is already running on port 5000');
    });
    req.on('error', () => {
      console.log('[Electron] Starting backend server from:', serverScript);
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

      if (fs.existsSync(syncScript)) {
        console.log('[Electron] Starting sync agent from:', syncScript);
        syncProcess = spawn('node', [syncScript], {
          cwd: backendDir,
          stdio: 'pipe',
          shell: true
        });

        syncProcess.stdout.on('data', (data) => {
          console.log(`[Sync Agent] ${data.toString().trim()}`);
        });

        syncProcess.stderr.on('data', (data) => {
          console.error(`[Sync Agent ERR] ${data.toString().trim()}`);
        });

        syncProcess.on('close', (code) => {
          console.log(`[Sync Agent] Process exited with code ${code}`);
          syncProcess = null;
        });
      }
    });
  } catch (err) {
    console.error('[Electron] Error checking backend status:', err);
  }
}

function stopBackendServer() {
  if (backendProcess) {
    console.log('[Electron] Stopping backend server...');
    backendProcess.kill();
    backendProcess = null;
  }
  if (syncProcess) {
    console.log('[Electron] Stopping sync agent...');
    syncProcess.kill();
    syncProcess = null;
  }
}

function createWindow() {
  const iconPath = path.join(process.env.VITE_PUBLIC, 'favicon.svg');
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
      webSecurity: false,
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
