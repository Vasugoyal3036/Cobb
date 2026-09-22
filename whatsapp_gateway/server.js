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

async function killBrowserProcesses() {
    clearWatchdog();
    isClientReady = false;

    // 1. Terminate current client's Puppeteer browser tree if active
    if (client) {
        try {
            if (client.pupBrowser) {
                const pid = client.pupBrowser.process()?.pid;
                if (pid) {
                    try { execSync(`taskkill /PID ${pid} /T /F 2>NUL`, { windowsHide: true }); } catch (e) {}
                }
            }
            await client.destroy().catch(() => {});
        } catch (e) {}
        client = null;
    }

    // 2. Kill any orphaned Chromium/Puppeteer processes holding the session locks
    try {
        execSync('powershell -WindowStyle Hidden -Command "Get-CimInstance Win32_Process | Where-Object { ($_.CommandLine -match \'session-cobb-pos-session\' -or ($_.ExecutablePath -match \'puppeteer\' -and $_.ProcessId -ne $PID)) } | Invoke-CimMethod -MethodName Terminate"', { windowsHide: true });
    } catch (e) {}

    // Brief cooldown for Windows file handle release
    await new Promise(r => setTimeout(r, 600));
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
        console.warn('[WATCHDOG] WhatsApp Web initialization taking >120s. Safely rebooting browser process while preserving session...');
        await killBrowserProcesses();
        cleanStaleLocksAndCaches();
        initWhatsApp(false); // ALWAYS preserve saved session tokens!
    }, 120000);
}

let isReconnecting = false;
let isInitializing = false;

async function initWhatsApp(isFresh = false) {
    if (isInitializing) {
        console.log('[WHATSAPP] Initialization already in progress. Skipping redundant call.');
        return;
    }
    isInitializing = true;
    clearWatchdog();
    isClientReady = false;
    currentQrCodeUrl = null;

    try {
        await killBrowserProcesses();
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

        const inboundCooldown = new Map();

        client.on('ready', () => {
            clearWatchdog();
            isClientReady = true;
            currentQrCodeUrl = null;
            reconnectAttempts = 0;
            isReconnecting = false;
            console.log('[WHATSAPP] Client is ONLINE and ready to dispatch messages!');
            flushOutbox();
        });

        // --- INBOUND TWO-WAY WHATSAPP CONCIERGE & REVIEW ROUTER ---
        client.on('message', async (msg) => {
            try {
                // Ignore broadcast statuses, group chats, or our own messages
                if (!msg || msg.fromMe || !msg.from || msg.from.includes('@g.us') || msg.from === 'status@broadcast') {
                    return;
                }

                const rawBody = (msg.body || '').trim();
                if (!rawBody) return;
                const lower = rawBody.toLowerCase();
                const phone = msg.from.replace('@c.us', '');
                const cleanPhone = phone.startsWith('91') && phone.length === 12 ? phone.slice(2) : phone;

                console.log(`[WHATSAPP INBOUND] From ${cleanPhone}: "${rawBody}"`);

                // Anti-spam cooldown: max 1 automated reply per 4 seconds to the same phone
                const now = Date.now();
                if (inboundCooldown.has(phone) && now - inboundCooldown.get(phone) < 4000) {
                    return;
                }
                inboundCooldown.set(phone, now);

                // 1. Loyalty Points / Tier Balance
                if (lower === '1' || lower.includes('point') || lower.includes('loyalty') || lower.includes('balance') || lower.includes('coins')) {
                    try {
                        const res = await fetch(`http://localhost:5000/api/loyalty/customer/${cleanPhone}`, { signal: AbortSignal.timeout(4000) });
                        if (res.ok) {
                            const cust = await res.json();
                            const reply = `🏆 *Cobb VIP Loyalty Status*\n\nHello *${cust.customerName || 'Valued Customer'}*! 👋\n\n✨ *Tier:* ${cust.tier || 'Silver'}\n⭐ *Available Points:* ${Number(cust.points || 0).toLocaleString('en-IN')} pts\n💰 *Cash Value:* ₹${Number(cust.pointsValue || 0).toLocaleString('en-IN')}\n🛍️ *Total Store Visits:* ${cust.totalVisits || 1}\n\n👉 Show your phone at the billing counter to redeem points on your next purchase!\n\n_Reply 2 for active offers • Reply 3 for store location_`;
                            await client.sendMessage(msg.from, reply);
                            return;
                        }
                    } catch (e) {}

                    await client.sendMessage(msg.from, `🏆 *Cobb VIP Loyalty*\n\nThank you for reaching out! To redeem points at checkout, simply quote your registered mobile number: *${cleanPhone}*.\n\n_Reply 2 for today's active offers_`);
                    return;
                }

                // 2. Active In-Store Offers
                if (lower === '2' || lower.includes('offer') || lower.includes('deal') || lower.includes('discount') || lower.includes('sale') || lower.includes('scheme')) {
                    const reply = `🏷️ *Today's In-Store Cobb Specials*\n\n✨ *Buy 2 Get 1 FREE* on selected shirts & casual tees\n✨ *Flat 20% OFF* on premium Italian-fit suits & blazers\n✨ *Additional 5% OFF* on all bills above ₹4,999!\n\n📍 _Offers valid exclusively in-store today._\n\n_Reply 1 for points • Reply 3 for store location_`;
                    await client.sendMessage(msg.from, reply);
                    return;
                }

                // 3. Store Timings & Location
                if (lower === '3' || lower.includes('timing') || lower.includes('location') || lower.includes('address') || lower.includes('map') || lower.includes('open') || lower.includes('time')) {
                    const reply = `📍 *Cobb Apparels Flagship Store*\n\n🕒 *Hours:* 10:30 AM – 9:30 PM (Open all 7 days)\n📍 *Address:* Cobb Apparels Store, Main Market\n🗺️ *Google Maps:* https://maps.google.com/?q=Cobb+Apparels\n👔 *Collections:* Men's Suits, Blazers, Formal Shirts, Chinos, Denim & Winterwear\n\nWe look forward to welcoming you! 🛍️`;
                    await client.sendMessage(msg.from, reply);
                    return;
                }

                // 4. Positive Google Review (4 or 5 Stars)
                if (['5', '5 star', '5 stars', '4', '4 star', '4 stars', 'excellent', 'great', 'superb', 'best'].some(k => lower === k || lower.startsWith(k))) {
                    const reply = `🌟 *Thank you so much for the 5-Star rating!* 🙏\n\nYour feedback means everything to our local team. Would you mind taking 15 seconds to share your review on our Google Maps page?\n\n⭐ *Tap here to review:* https://g.page/r/cobb-store/review\n\nThank you for being part of the Cobb family! 👔`;
                    await client.sendMessage(msg.from, reply);
                    return;
                }

                // 5. Customer Grievance (1 to 3 Stars)
                if (['1', '1 star', '2', '2 star', '3', '3 star', 'bad', 'poor', 'worst', 'issue', 'complaint'].some(k => lower === k || lower.startsWith(k))) {
                    const reply = `🙏 *We sincerely apologize for falling short of your expectations.*\n\nYour feedback has been logged with highest priority for our Store Manager. We will look into this right away.\n\nThank you for helping us improve our service.`;
                    await client.sendMessage(msg.from, reply);

                    // Forward to CRM backend for staff alert
                    try {
                        await fetch('http://localhost:5000/api/whatsapp/inbound-alert', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ phone: cleanPhone, message: rawBody, type: 'grievance' })
                        });
                    } catch (e) {}
                    return;
                }

                // 6. Help / Counter Support
                if (lower === '4' || lower.includes('help') || lower.includes('support') || lower.includes('call') || lower.includes('manager')) {
                    const reply = `🛎️ *Store Counter Alerted*\n\nOur store representative has received your request and will follow up shortly.\n\n_Reply 1: Points | 2: Offers | 3: Location_`;
                    await client.sendMessage(msg.from, reply);
                    try {
                        await fetch('http://localhost:5000/api/whatsapp/inbound-alert', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ phone: cleanPhone, message: rawBody, type: 'support_request' })
                        });
                    } catch (e) {}
                    return;
                }

                // 7. Generic Greeting
                if (['hi', 'hello', 'hey', 'namaste', 'start', 'cobb', 'menu', 'help'].some(k => lower.includes(k))) {
                    const reply = `👋 *Welcome to Cobb Retail Concierge!*\n\nHow can we help you today? Please reply with a number:\n\n1️⃣ Check *Loyalty Points & Tier*\n2️⃣ View *Today's In-Store Offers*\n3️⃣ Check *Store Timings & Address*\n4️⃣ Contact *Store Counter / Manager*\n\n_Cobb Apparels — Redefining Fashion_`;
                    await client.sendMessage(msg.from, reply);
                }
            } catch (inboundErr) {
                console.error('[WHATSAPP INBOUND ERROR]:', inboundErr.message);
            }
        });

        client.on('auth_failure', async (msg) => {
            clearWatchdog();
            console.error('[WHATSAPP] Authentication failure:', msg);
            isClientReady = false;
            console.log('[WHATSAPP] Auth revoked by WhatsApp servers. Clearing stale tokens and requesting new QR code...');
            await killBrowserProcesses();
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

        await client.initialize();
    } catch (err) {
        clearWatchdog();
        console.error('[WHATSAPP] Client initialization error:', err.message);
        scheduleReconnect();
    } finally {
        isInitializing = false;
    }
}

function scheduleReconnect() {
    if (isReconnecting) return;
    isReconnecting = true;
    reconnectAttempts++;
    // Exponential backoff capped at 30s. NEVER wipe the session on reconnect!
    const delay = Math.min(reconnectAttempts * 5000, 30000);
    console.log(`[WHATSAPP] Scheduling reconnect attempt ${reconnectAttempts} in ${delay/1000}s (preserving session)...`);
    setTimeout(async () => {
        isReconnecting = false;
        await initWhatsApp(false); // ALWAYS preserve saved session!
    }, delay);
}

// Graceful shutdown hooks
const cleanExit = async () => {
    console.log('[WHATSAPP] Graceful shutdown triggered. Closing browser session cleanly...');
    await killBrowserProcesses();
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
        await killBrowserProcesses();
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }
        res.json({ success: true, message: 'WhatsApp session wiped. Generating new QR code...' });
        setTimeout(() => initWhatsApp(true), 500);
    } catch (err) {
        console.error('[WHATSAPP] Reset error:', err);
        res.status(500).json({ error: err.message });
    }
});

const outboxQueue = [];
let isFlushingOutbox = false;

function formatWhatsAppNumber(number) {
    if (!number) return null;
    let clean = String(number).replace(/[^0-9]/g, '').replace(/^0+/, '');
    if (!clean) return null;
    if (clean.length === 10) {
        return `91${clean}`;
    }
    if (clean.length === 12 && clean.startsWith('91')) {
        return clean;
    }
    if (clean.length > 10) {
        return `91${clean.slice(-10)}`;
    }
    return clean;
}

function isUnregisteredError(err) {
    if (!err) return false;
    const msg = String(err?.message || err || '').toLowerCase();
    return msg.includes('no lid') ||
           msg.includes('wid error') ||
           msg.includes('not-authorized') ||
           msg.includes('invalid jid') ||
           msg.includes('no-such-user') ||
           msg.includes('not registered') ||
           msg.includes('unregistered') ||
           msg.includes('not-registered') ||
           msg.includes('no user') ||
           msg.includes('user not found') ||
           msg.includes('marked as unregistered') ||
           msg.includes('invalid number') ||
           msg.includes('cannot read properties of undefined');
}

async function dispatchMessage(number, message, mediaPath) {
    const formattedNumber = formatWhatsAppNumber(number);
    if (!formattedNumber || formattedNumber.length < 10) {
        return { success: false, skipped: true, error: 'Invalid phone number format.' };
    }

    const chatId = `${formattedNumber}@c.us`;

    if (mediaPath) {
        const resolvedPath = path.isAbsolute(mediaPath) ? mediaPath : path.join(__dirname, mediaPath);
        if (fs.existsSync(resolvedPath)) {
            try {
                const media = MessageMedia.fromFilePath(resolvedPath);
                await client.sendMessage(chatId, media, { caption: message });
                console.log(`[SENT] Media dispatched to ${chatId}`);
                return { success: true, type: 'media' };
            } catch (mediaErr) {
                if (isUnregisteredError(mediaErr)) {
                    console.log(`[SKIPPED] ${chatId} is not on WhatsApp.`);
                    return { success: false, skipped: true, error: 'Phone number is not registered on WhatsApp.' };
                }
                console.warn(`[WARN] Media dispatch failed for ${chatId}, falling back to text:`, mediaErr.message);
            }
        }
    }

    try {
        await client.sendMessage(chatId, message);
        console.log(`[SENT] Text dispatched to ${chatId}`);
        return { success: true, type: 'text' };
    } catch (textErr) {
        console.error(`[DEBUG SEND ERROR for ${chatId}]:`, textErr);
        if (isUnregisteredError(textErr)) {
            console.log(`[SKIPPED] ${chatId} is not on WhatsApp.`);
            return { success: false, skipped: true, error: 'Phone number is not registered on WhatsApp.' };
        }
        throw textErr;
    }
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
                    if (!res.headersSent) {
                        if (result && result.skipped) {
                            res.status(400).json(result);
                        } else if (result && result.success) {
                            res.json(result);
                        } else {
                            res.status(500).json(result || { error: 'Dispatch failed' });
                        }
                    }
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
        return res.json(result);
    } catch (err) {
        if (isUnregisteredError(err)) {
            return res.status(400).json({ success: false, skipped: true, error: 'Phone number is not registered on WhatsApp.' });
        }
        console.error(`[ERROR] Primary send failed to ${number}:`, err.message || err);
        try {
            const formattedNumber = formatWhatsAppNumber(number);
            const chatId = `${formattedNumber}@c.us`;
            await client.sendMessage(chatId, message);
            console.log(`[SENT FALLBACK] Text dispatched to ${chatId}`);
            return res.json({ success: true, type: 'fallback' });
        } catch (fallbackErr) {
            console.error(`[ERROR] Fallback send failed to ${number}:`, fallbackErr.message || fallbackErr);
            if (isUnregisteredError(fallbackErr)) {
                return res.status(400).json({ success: false, skipped: true, error: 'Phone number is invalid or not registered on WhatsApp.' });
            }
            if (fallbackErr.message && (fallbackErr.message.includes('detached Frame') || fallbackErr.message.includes('Session closed') || fallbackErr.message.includes('Target closed'))) {
                console.error('[WHATSAPP] Detected detached frame or closed session! Safely scheduling client recovery...');
                scheduleReconnect();
            }
            return res.status(500).json({ error: `WhatsApp gateway dispatch error: ${fallbackErr.message || fallbackErr}` });
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
