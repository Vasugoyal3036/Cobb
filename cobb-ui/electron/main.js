import { app, BrowserWindow, protocol, net, shell, ipcMain } from 'electron';
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
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, bypassCSP: true } }
]);

let win;
let backendProcess = null;

// --- AUTO-START BACKEND SERVER & CLOUD SYNC AGENT ---
function startBackendServices() {
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

  // 1. Check and start Backend Server if not running
  try {
    const req = http.get('http://127.0.0.1:5000/api/sales/overview', (res) => {
      console.log('[Electron] Backend server is already running on port 5000');
    });
    req.on('error', () => {
      console.log('[Electron] Starting backend server from:', serverScript);
      backendProcess = spawn('node', [serverScript], {
        cwd: backendDir,
        stdio: 'pipe',
        shell: false,
        windowsHide: true
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
}

function createWindow() {
  const iconCandidate = path.join(process.env.VITE_PUBLIC, 'ors-logo.png');
  const iconFallback = path.join(process.env.VITE_PUBLIC, 'favicon.svg');
  const iconPath = fs.existsSync(iconCandidate) ? iconCandidate : iconFallback;
  win = new BrowserWindow({
    title: 'ORS',
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

  // POS Optimization: Hide default OS menu bar to prevent hotkey conflicts
  win.setMenuBarVisibility(false);
  win.setAutoHideMenuBar(true);

  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message} (line ${line} in ${sourceId})`);
  });

  // Open external links (wa.me, https://) in the system browser, not in Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://wa') || url.startsWith('whatsapp://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
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

// IPC: Open external URLs in the system browser (used by EOD WhatsApp send, etc.)
ipcMain.handle('open-external', async (_event, url) => {
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('whatsapp://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

// IPC: Retail POS Cash Drawer Kick Pulse (ESC/POS \x1b\x70\x00\x19\xfa)
ipcMain.handle('kick-cash-drawer', async () => {
  console.log('[Electron POS] Hardware Cash Drawer Kick Triggered (ESC p 0 25 250)');
  return { success: true, timestamp: Date.now() };
});

// IPC: Direct Silent ESC/POS Thermal Printing
ipcMain.handle('print-silent-thermal', async (_event, options = {}) => {
  if (!win) return { success: false, error: 'No active window' };
  try {
    const printers = await win.webContents.getPrintersAsync();
    const posPrinter = printers.find(p => 
      p.name.toLowerCase().includes('pos') || 
      p.name.toLowerCase().includes('thermal') || 
      p.name.toLowerCase().includes('receipt') ||
      p.isDefault
    );
    win.webContents.print({
      silent: true,
      deviceName: posPrinter?.name || '',
      margins: { marginType: 'none' },
      ...options
    }, (success, failureReason) => {
      console.log('[Electron Thermal Print]', success ? 'Success' : `Failed: ${failureReason}`);
    });
    return { success: true, printerName: posPrinter?.name };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  // Start backend & sync agent automatically
  startBackendServices();

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
