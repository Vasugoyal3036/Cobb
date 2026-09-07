const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json()); process.on('uncaughtException', (err) => console.error('Uncaught:', err)); process.on('unhandledRejection', (reason) => console.error('Unhandled:', reason));

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'cobb-pos-session',
        dataPath: path.join(__dirname, '.wwebjs_auth')
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
            '--unhandled-rejections=strict'
        ]
    }
});

let isClientReady = false;
let currentQrCodeUrl = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('[WHATSAPP] Max reconnect attempts reached. Manual restart required.');
        return;
    }
    reconnectAttempts++;
    const delay = Math.min(reconnectAttempts * 10000, 60000); // 10s, 20s, 30s... max 60s
    console.log(`[WHATSAPP] Scheduling reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay/1000}s...`);
    setTimeout(() => {
        console.log(`[WHATSAPP] Reconnect attempt ${reconnectAttempts}...`);
        client.initialize().catch(err => {
            console.error('[WHATSAPP] Reconnect initialization error:', err.message);
            scheduleReconnect();
        });
    }, delay);
}

client.on('qr', async (qr) => {
    try {
        currentQrCodeUrl = await QRCode.toDataURL(qr);
        isClientReady = false;
        console.log('[WHATSAPP] Fresh QR Code generated. Displaying on dashboard...');
    } catch (err) {
        console.error('[WHATSAPP] QR Error:', err);
    }
});

client.on('authenticated', () => {
    console.log('[WHATSAPP] Scanned successfully! Authenticating session...');
    reconnectAttempts = 0; // Reset on successful auth
});

client.on('ready', () => {
    isClientReady = true;
    currentQrCodeUrl = null;
    reconnectAttempts = 0; // Reset on ready
    console.log('[WHATSAPP] Client is online and ready to send messages!');
});

client.on('auth_failure', (msg) => {
    console.error('[WHATSAPP] Authentication failure:', msg);
    isClientReady = false;
    // Clear stale session and reconnect
    console.log('[WHATSAPP] Clearing stale session data and reconnecting...');
    scheduleReconnect();
});

client.on('disconnected', (reason) => {
    console.log('[WHATSAPP] Session disconnected:', reason);
    isClientReady = false;
    // Auto-reconnect on disconnect
    console.log('[WHATSAPP] Auto-reconnecting after disconnect...');
    scheduleReconnect();
});

app.get('/status', (req, res) => {
    res.json({
        isReady: isClientReady,
        qrCodeUrl: currentQrCodeUrl
    });
});

app.post('/send', async (req, res) => {
    const { number, message, mediaPath } = req.body;

    if (!number || !message) {
        return res.status(400).json({ error: 'Number and message are required.' });
    }

    if (!isClientReady) {
        return res.status(503).json({ error: 'WhatsApp client is not ready. Verify QR pairing.' });
    }

    try {
        const cleanNumber = String(number).replace(/[^0-9]/g, '');
        const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;

        // 1. Check if number is registered on WhatsApp
        const isRegistered = await client.isRegisteredUser(`${formattedNumber}@c.us`).catch(() => true);
        if (isRegistered === false) {
            console.log(`[SKIPPED] ${formattedNumber} is not registered on WhatsApp.`);
            return res.status(400).json({ error: 'Phone number is not registered on WhatsApp.' });
        }

        // 2. Default to standard @c.us format (bypasses @lid bug)
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
    client.initialize().catch(err => {
        console.error('[FATAL] Initialization error:', err.message);
    });
});
