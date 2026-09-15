const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

process.on('uncaughtException', (err) => {
    console.error('[FATAL UNCAUGHT]:', err.message);
    if (err.code === 'EADDRINUSE') {
        process.exit(1);
    }
});
process.on('unhandledRejection', (reason) => console.error('[FATAL UNHANDLED]:', reason));

const sessionPath = path.join(__dirname, '.wwebjs_auth');
const clientId = 'cobb-pos-session';

let client = null;
let isClientReady = false;
let currentQrCodeUrl = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let watchdogTimer = null;
let consecutiveWatchdogFailures = 0;

// Clean up stale lock files & ephemeral crash-prone caches without touching auth tokens or database files
function cleanStaleLocksAndCaches() {
    const profileDir = path.join(sessionPath, `session-${clientId}`);
    if (!fs.existsSync(profileDir)) return;

    try {
        const ephemeralCacheNames = ['GPUCache', 'DawnGraphiteCache', 'Crashpad', 'ShaderCache'];

        // Clean root profile directory for locks and ephemeral caches
        const entries = fs.readdirSync(profileDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(profileDir, entry.name);
            if (entry.isDirectory()) {
                if (ephemeralCacheNames.includes(entry.name)) {
                    try { fs.rmSync(fullPath, { recursive: true, force: true }); } catch (e) {}
                }
            } else {
                // Remove ONLY Chromium process locks (do NOT touch LevelDB LOCK files inside databases)
                if (
                    entry.name.includes('Singleton') ||
                    entry.name === 'DevToolsActivePort' ||
                    entry.name === '.parentlock'
                ) {
                    try { fs.unlinkSync(fullPath); } catch (e) {}
                }
            }
        }

        // Also check Default/ folder if present
        const defaultDir = path.join(profileDir, 'Default');
        if (fs.existsSync(defaultDir)) {
            const defaultEntries = fs.readdirSync(defaultDir, { withFileTypes: true });
            for (const entry of defaultEntries) {
                const fullPath = path.join(defaultDir, entry.name);
                if (entry.isDirectory() && ephemeralCacheNames.includes(entry.name)) {
                    try { fs.rmSync(fullPath, { recursive: true, force: true }); } catch (e) {}
                } else if (entry.isFile() && (entry.name.includes('Singleton') || entry.name === '.parentlock')) {
                    try { fs.unlinkSync(fullPath); } catch (e) {}
                }
            }
        }
        console.log('[WHATSAPP] Pre-launch lock files & ephemeral caches cleaned successfully.');
    } catch (err) {
        console.warn('[WHATSAPP] Lock cleanup warning:', err.message);
    }
}

function clearWatchdog() {
    if (watchdogTimer) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
    }
}

function startWatchdog() {
    clearWatchdog();
    // 120-second watchdog: If neither 'ready' nor 'qr' fires after 2 minutes,
    // Chromium might have hung on boot. Safely reboot Chromium WITHOUT wiping the session.
    watchdogTimer = setTimeout(async () => {
        console.warn('[WATCHDOG] WhatsApp Web initialization taking >120s. Restarting browser process while preserving session...');
        try {
            if (client) await client.destroy().catch(() => {});
        } catch (e) {}
        cleanStaleLocksAndCaches();
        initWhatsApp(false); // ALWAYS preserve saved session tokens!
    }, 120000);
}

let isReconnecting = false;

function initWhatsApp(isFresh = false) {
    clearWatchdog();
    isClientReady = false;
    currentQrCodeUrl = null;

    cleanStaleLocksAndCaches();

    console.log(`[WHATSAPP] Initializing WhatsApp Client (${isFresh ? 'Fresh Session' : 'Saved LocalAuth'})...`);

    client = new Client({
        authStrategy: new LocalAuth({
            clientId: clientId,
            dataPath: sessionPath
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-session-crashed-bubble',
                '--no-default-browser-check',
                '--disable-background-networking',
                '--disable-component-update',
                '--disable-blink-features=AutomationControlled',
                '--disable-renderer-backgrounding',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows'
            ],
            timeout: 120000
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    });

    startWatchdog();

    client.on('qr', (qr) => {
        clearWatchdog();
        reconnectAttempts = 0;
        isReconnecting = false;
        try {
            currentQrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(qr);
            isClientReady = false;
            console.log('[WHATSAPP] Fresh QR Code generated. Ready for scan.');
        } catch (err) {
            console.error('[WHATSAPP] QR Generation Error:', err);
        }
    });

    client.on('authenticated', () => {
        console.log('[WHATSAPP] Scanned successfully! Authenticating session...');
        reconnectAttempts = 0;
        isReconnecting = false;
        startWatchdog();
    });

    client.on('ready', () => {
        clearWatchdog();
        isClientReady = true;
        currentQrCodeUrl = null;
        reconnectAttempts = 0;
        isReconnecting = false;
        console.log('[WHATSAPP] Client is ONLINE and ready to dispatch messages!');
        flushOutbox();
    });

    client.on('auth_failure', async (msg) => {
        clearWatchdog();
        console.error('[WHATSAPP] Authentication failure:', msg);
        isClientReady = false;
        try {
            if (client) await client.destroy().catch(() => {});
        } catch (e) {}
        console.log('[WHATSAPP] Auth revoked by WhatsApp servers. Clearing stale tokens and requesting new QR code...');
        try {
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
            }
        } catch (e) {}
        initWhatsApp(true);
    });

    client.on('disconnected', (reason) => {
        clearWatchdog();
        console.log('[WHATSAPP] Session disconnected:', reason);
        isClientReady = false;
        scheduleReconnect();
    });

    client.initialize().catch(err => {
        clearWatchdog();
        console.error('[WHATSAPP] Client initialization error:', err.message);
        scheduleReconnect();
    });
}

function scheduleReconnect() {
    if (isReconnecting) return;
    isReconnecting = true;
    reconnectAttempts++;
    // Exponential backoff capped at 60s. NEVER wipe the session on max attempts!
    // When internet recovers (e.g. overnight broadband drops), the saved LocalAuth logs right back in.
    const delay = Math.min(reconnectAttempts * 10000, 60000);
    console.log(`[WHATSAPP] Scheduling reconnect attempt ${reconnectAttempts} in ${delay/1000}s (preserving session)...`);
    setTimeout(async () => {
        try {
            if (client) await client.destroy().catch(() => {});
        } catch (e) {}
        cleanStaleLocksAndCaches();
        isReconnecting = false;
        initWhatsApp(false); // ALWAYS preserve saved session!
    }, delay);
}

// Graceful shutdown hooks
const cleanExit = async () => {
    console.log('[WHATSAPP] Graceful shutdown triggered. Closing browser session cleanly...');
    clearWatchdog();
    try {
        if (client) await client.destroy().catch(() => {});
    } catch (e) {}
    process.exit(0);
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);

app.get('/status', (req, res) => {
    res.json({
        isReady: isClientReady,
        qrCodeUrl: currentQrCodeUrl,
        hasClient: !!client,
        reconnectAttempts: reconnectAttempts
    });
});

// One-click force reset endpoint
app.post('/reset', async (req, res) => {
    console.log('[WHATSAPP] Reset requested via API. Rebuilding session...');
    clearWatchdog();
    try {
        isClientReady = false;
        currentQrCodeUrl = null;
        if (client) {
            await client.destroy().catch(() => {});
        }
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }
        res.json({ success: true, message: 'WhatsApp session wiped. Generating new QR code...' });
        setTimeout(() => initWhatsApp(true), 1000);
    } catch (err) {
        console.error('[WHATSAPP] Reset error:', err);
        res.status(500).json({ error: err.message });
    }
});

const outboxQueue = [];
let isFlushingOutbox = false;

async function dispatchMessage(number, message, mediaPath) {
    const cleanNumber = String(number).replace(/[^0-9]/g, '');
    const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;

    const isRegistered = await client.isRegisteredUser(`${formattedNumber}@c.us`).catch(() => true);
    if (isRegistered === false) {
        console.log(`[SKIPPED] ${formattedNumber} is not registered on WhatsApp.`);
        return { success: false, skipped: true, error: 'Phone number is not registered on WhatsApp.' };
    }

    let chatId = `${formattedNumber}@c.us`;

    if (mediaPath) {
        const resolvedPath = path.isAbsolute(mediaPath) ? mediaPath : path.join(__dirname, mediaPath);
        if (fs.existsSync(resolvedPath)) {
            const media = MessageMedia.fromFilePath(resolvedPath);
            await client.sendMessage(chatId, media, { caption: message });
            console.log(`[SENT] Media dispatched to ${chatId}`);
            return { success: true, type: 'media' };
        }
    }

    await client.sendMessage(chatId, message);
    console.log(`[SENT] Text dispatched to ${chatId}`);
    return { success: true, type: 'text' };
}

async function flushOutbox() {
    if (!isClientReady || !client || outboxQueue.length === 0 || isFlushingOutbox) return;
    isFlushingOutbox = true;
    console.log(`[OUTBOX] Auto-flushing ${outboxQueue.length} buffered checkout message(s)...`);
    
    while (outboxQueue.length > 0 && isClientReady && client) {
        const item = outboxQueue.shift();
        try {
            const result = await dispatchMessage(item.number, item.message, item.mediaPath);
            if (item.resolve) item.resolve(result);
        } catch (err) {
            console.error(`[OUTBOX RETRY ERROR] Failed for ${item.number}:`, err.message);
            if (item.reject) item.reject(err);
        }
    }
    isFlushingOutbox = false;
}

app.post('/send', async (req, res) => {
    const { number, message, mediaPath } = req.body;

    if (!number || !message) {
        return res.status(400).json({ error: 'Number and message are required.' });
    }

    if (!isClientReady || !client) {
        console.log(`[OUTBOX QUEUE] WhatsApp client momentarily reconnecting. Buffering checkout message for ${number}...`);
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                const idx = outboxQueue.findIndex(q => q.timer === timer);
                if (idx !== -1) outboxQueue.splice(idx, 1);
                if (!res.headersSent) {
                    res.status(503).json({ error: 'WhatsApp client is reconnecting. Message queued for automatic background delivery.' });
                }
                resolve();
            }, 30000);

            outboxQueue.push({
                number,
                message,
                mediaPath,
                timer,
                resolve: (result) => {
                    clearTimeout(timer);
                    if (!res.headersSent) res.json(result);
                    resolve();
                },
                reject: (err) => {
                    clearTimeout(timer);
                    if (!res.headersSent) res.status(500).json({ error: err.message });
                    resolve();
                }
            });
        });
    }

    try {
        const result = await dispatchMessage(number, message, mediaPath);
        if (result.skipped) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (err) {
        console.error(`[ERROR] Send failed to ${number}:`, err);
        try {
            const cleanNumber = String(number).replace(/[^0-9]/g, '');
            const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
            await client.sendMessage(`${formattedNumber}@c.us`, message);
            console.log(`[SENT FALLBACK] Text dispatched to ${formattedNumber}@c.us`);
            return res.json({ success: true, type: 'fallback' });
        } catch (fallbackErr) {
            res.status(400).json({ error: 'Phone number is invalid or not registered on WhatsApp.' });
        }
    }
});

const PORT = 3000;
const server = app.listen(PORT, () => {
    console.log(`WhatsApp Gateway Server running on http://localhost:${PORT}`);
    initWhatsApp(false);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`[FATAL] Port ${PORT} is already in use by another process. Exiting...`);
        process.exit(1);
    } else {
        console.error('[FATAL SERVER ERROR]:', err);
        process.exit(1);
    }
});
