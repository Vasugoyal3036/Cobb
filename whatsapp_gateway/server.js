const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

process.on('uncaughtException', (err) => console.error('[FATAL UNCAUGHT]:', err.message));
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

// Clean up stale lock files & ephemeral crash-prone caches without touching auth tokens
function cleanStaleLocksAndCaches() {
    const profileDir = path.join(sessionPath, `session-${clientId}`);
    if (!fs.existsSync(profileDir)) return;

    try {
        const cleanDir = (dir) => {
            if (!fs.existsSync(dir)) return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    // Ephemeral caches that corrupt on sudden power cuts
                    if (['GPUCache', 'DawnGraphiteCache', 'Crashpad'].includes(entry.name)) {
                        try { fs.rmSync(fullPath, { recursive: true, force: true }); } catch (e) {}
                    } else {
                        cleanDir(fullPath);
                    }
                } else {
                    // Lock files that prevent Chromium from launching after a crash/restart
                    if (
                        entry.name.includes('Singleton') ||
                        entry.name === 'DevToolsActivePort' ||
                        entry.name === '.parentlock' ||
                        entry.name === 'LOCK'
                    ) {
                        try { fs.unlinkSync(fullPath); } catch (e) {}
                    }
                }
            }
        };
        cleanDir(profileDir);
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
    // 60-second watchdog: If neither 'ready' nor 'qr' fires, the browser session is hung
    watchdogTimer = setTimeout(async () => {
        console.error('[WATCHDOG] WhatsApp Web initialization hung for >60s. Auto-recovering...');
        consecutiveWatchdogFailures++;
        if (consecutiveWatchdogFailures >= 2) {
            console.error('[WATCHDOG] Corrupted session detected after repeated hangs. Wiping session cache to force fresh QR pairing...');
            try {
                if (client) await client.destroy().catch(() => {});
            } catch (e) {}
            try {
                if (fs.existsSync(sessionPath)) {
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                }
            } catch (e) {}
            consecutiveWatchdogFailures = 0;
            initWhatsApp(true);
            return;
        }
        try {
            if (client) await client.destroy().catch(() => {});
        } catch (e) {}
        cleanStaleLocksAndCaches();
        initWhatsApp(false);
    }, 60000);
}

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
                '--disable-features=IsolateOrigins,site-per-process',
                '--no-default-browser-check',
                '--disable-background-networking',
                '--disable-component-update'
            ],
            timeout: 60000
        }
    });

    startWatchdog();

    client.on('qr', (qr) => {
        clearWatchdog();
        consecutiveWatchdogFailures = 0;
        try {
            currentQrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(qr);
            isClientReady = false;
            console.log('[WHATSAPP] Fresh QR Code generated. Ready for scan.');
        } catch (err) {
            console.error('[WHATSAPP] QR Generation Error:', err);
        }
    });

    client.on('authenticated', () => {
        clearWatchdog();
        consecutiveWatchdogFailures = 0;
        console.log('[WHATSAPP] Scanned successfully! Authenticating session...');
        reconnectAttempts = 0;
    });

    client.on('ready', () => {
        clearWatchdog();
        consecutiveWatchdogFailures = 0;
        isClientReady = true;
        currentQrCodeUrl = null;
        reconnectAttempts = 0;
        console.log('[WHATSAPP] Client is ONLINE and ready to dispatch messages!');
    });

    client.on('auth_failure', async (msg) => {
        clearWatchdog();
        console.error('[WHATSAPP] Authentication failure:', msg);
        isClientReady = false;
        try {
            if (client) await client.destroy().catch(() => {});
        } catch (e) {}
        console.log('[WHATSAPP] Clearing stale session and requesting new QR code...');
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
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('[WHATSAPP] Max reconnect attempts reached. Auto-resetting session...');
        reconnectAttempts = 0;
        initWhatsApp(true);
        return;
    }
    reconnectAttempts++;
    const delay = Math.min(reconnectAttempts * 10000, 60000);
    console.log(`[WHATSAPP] Scheduling reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay/1000}s...`);
    setTimeout(() => {
        try {
            if (client) client.destroy().catch(() => {});
        } catch (e) {}
        cleanStaleLocksAndCaches();
        initWhatsApp(false);
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
        qrCodeUrl: currentQrCodeUrl
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

app.post('/send', async (req, res) => {
    const { number, message, mediaPath } = req.body;

    if (!number || !message) {
        return res.status(400).json({ error: 'Number and message are required.' });
    }

    if (!isClientReady || !client) {
        return res.status(503).json({ error: 'WhatsApp client is not ready. Verify QR pairing.' });
    }

    try {
        const cleanNumber = String(number).replace(/[^0-9]/g, '');
        const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;

        const isRegistered = await client.isRegisteredUser(`${formattedNumber}@c.us`).catch(() => true);
        if (isRegistered === false) {
            console.log(`[SKIPPED] ${formattedNumber} is not registered on WhatsApp.`);
            return res.status(400).json({ error: 'Phone number is not registered on WhatsApp.' });
        }

        let chatId = `${formattedNumber}@c.us`;

        if (mediaPath) {
            const resolvedPath = path.isAbsolute(mediaPath) ? mediaPath : path.join(__dirname, mediaPath);
            if (fs.existsSync(resolvedPath)) {
                const media = MessageMedia.fromFilePath(resolvedPath);
                await client.sendMessage(chatId, media, { caption: message });
                console.log(`[SENT] Media dispatched to ${chatId}`);
                return res.json({ success: true, type: 'media' });
            }
        }

        await client.sendMessage(chatId, message);
        console.log(`[SENT] Text dispatched to ${chatId}`);
        res.json({ success: true, type: 'text' });
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
app.listen(PORT, () => {
    console.log(`WhatsApp Gateway Server running on http://localhost:${PORT}`);
    initWhatsApp(false);
});
