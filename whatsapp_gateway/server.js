const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia, Poll } = require('whatsapp-web.js');
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

// --- OWNER PHONES DEFINITION ---
const OWNER_PHONES = ['9138122820', '8708788707', '9034522000', '9466422821'];

function isOwnerPhone(phone) {
    if (!phone) return false;
    const clean = String(phone).replace(/[^0-9]/g, '');
    const tenDigit = clean.slice(-10);
    return OWNER_PHONES.includes(tenDigit);
}

// --- TWO-WAY CONCIERGE BOT CONFIGURATION ---
// Set to false to disable all automated chatbot / concierge replies to incoming customer messages
let enableInboundBot = false;

// --- WHATSAPP REVIEW BOT & 2-STEP FUNNEL CONFIGURATION ---
const GOOGLE_REVIEW_LINK = process.env.GOOGLE_REVIEW_LINK || 'https://search.google.com/local/writereview?placeid=ChIJHfCBR58ZDjkRpBbB9EV-Zew';
const REVIEW_SESSIONS_FILE = path.join(__dirname, 'review_sessions.json');

function loadReviewSessions() {
    try {
        if (!fs.existsSync(REVIEW_SESSIONS_FILE)) return {};
        return JSON.parse(fs.readFileSync(REVIEW_SESSIONS_FILE, 'utf8'));
    } catch (e) {
        return {};
    }
}

function saveReviewSessions(sessions) {
    try {
        fs.writeFileSync(REVIEW_SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8');
    } catch (e) { }
}

function getActiveReviewSession(phone) {
    if (!phone) return null;
    const cleanPhone = String(phone).replace(/[^0-9]/g, '').slice(-10);
    const sessions = loadReviewSessions();
    const session = sessions[cleanPhone];
    if (!session) return null;
    // Expire session after 48 hours
    const maxAge = 48 * 60 * 60 * 1000;
    if (Date.now() - (session.updatedAt || session.createdAt || 0) > maxAge) {
        delete sessions[cleanPhone];
        saveReviewSessions(sessions);
        return null;
    }
    return session;
}

function setReviewSession(phone, data) {
    if (!phone) return;
    const cleanPhone = String(phone).replace(/[^0-9]/g, '').slice(-10);
    const sessions = loadReviewSessions();
    const now = Date.now();
    sessions[cleanPhone] = {
        ...(sessions[cleanPhone] || {}),
        phone: cleanPhone,
        ...data,
        updatedAt: now,
        createdAt: sessions[cleanPhone]?.createdAt || now
    };
    saveReviewSessions(sessions);
    return sessions[cleanPhone];
}

function clearReviewSession(phone) {
    if (!phone) return;
    const cleanPhone = String(phone).replace(/[^0-9]/g, '').slice(-10);
    const sessions = loadReviewSessions();
    if (sessions[cleanPhone]) {
        delete sessions[cleanPhone];
        saveReviewSessions(sessions);
    }
}

function saveRatingToLedger(entry) {
    try {
        const ratingsFile = path.join(__dirname, '..', 'CobbDashboard', 'customer_ratings.json');
        let list = [];
        if (fs.existsSync(ratingsFile)) {
            try { list = JSON.parse(fs.readFileSync(ratingsFile, 'utf8')); } catch (e) { list = []; }
        }
        if (!Array.isArray(list)) list = [];

        const cleanPhone = String(entry.phone || '').replace(/[^0-9]/g, '').slice(-10);
        const existingIdx = list.findIndex(r => r.phone === cleanPhone && (entry.billNo ? r.billNo === entry.billNo : true));

        const ratingNum = Math.min(5, Math.max(1, Number(entry.rating) || 5));
        const ratingItem = {
            id: entry.id || `RATE_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            phone: cleanPhone || 'Anonymous',
            customerName: entry.customerName || 'Valued Shopper',
            rating: ratingNum,
            comment: entry.comment || (ratingNum >= 4 ? `${ratingNum}-Star Positive Rating` : `${ratingNum}-Star Grievance`),
            category: ratingNum >= 4 ? 'positive' : 'grievance',
            billNo: entry.billNo || '',
            timestamp: entry.timestamp || new Date().toISOString(),
            date: (entry.timestamp || new Date().toISOString()).split('T')[0],
            status: 'unread'
        };

        if (existingIdx >= 0) {
            list[existingIdx] = { ...list[existingIdx], ...ratingItem };
        } else {
            list.unshift(ratingItem);
        }

        if (list.length > 500) list.pop();
        fs.writeFileSync(ratingsFile, JSON.stringify(list, null, 2), 'utf8');
        console.log(`[RATING LEDGER] Saved rating ${ratingNum}★ for ${cleanPhone}. Total stored: ${list.length}`);

        // Forward to backend API to guarantee in-memory cache and Firestore sync
        try {
            fetch('http://localhost:5000/api/whatsapp/inbound-alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: cleanPhone,
                    customerName: entry.customerName,
                    message: entry.comment || `${ratingNum} Stars`,
                    type: ratingNum >= 4 ? 'rating_positive' : 'grievance_low_nps',
                    rating: ratingNum,
                    billNo: entry.billNo || ''
                })
            }).catch(() => { });
        } catch (e) { }

        return ratingItem;
    } catch (e) {
        console.error('[RATING LEDGER ERROR]:', e.message);
    }
}

function getLiveStoreRatingStats() {
    try {
        const ratingsFile = path.join(__dirname, '..', 'CobbDashboard', 'customer_ratings.json');
        if (fs.existsSync(ratingsFile)) {
            const list = JSON.parse(fs.readFileSync(ratingsFile, 'utf8'));
            if (Array.isArray(list) && list.length > 0) {
                const total = list.length;
                const sum = list.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
                const avg = (sum / total).toFixed(1);
                const positives = list.filter(r => (Number(r.rating) || 0) >= 4).length;
                const fiveStars = list.filter(r => (Number(r.rating) || 0) === 5).length;
                const pct = Math.round((positives / total) * 100);
                const fiveStarPct = Math.round((fiveStars / total) * 100);

                return {
                    hasData: true,
                    total,
                    avg,
                    pct,          // Satisfaction percentage (e.g. 95%)
                    fiveStarPct   // 5-Star % (e.g. 90%)
                };
            }
        }
    } catch (e) { }

    return {
        hasData: false,
        total: 0,
        avg: '0.0',
        pct: 0,
        fiveStarPct: 0
    };
}

// In-memory cache for resolved LIDs to phone numbers
const lidToPhoneCache = new Map();

async function resolvePhoneNumber(rawId) {
    if (!rawId) return '';
    const strId = typeof rawId === 'string' ? rawId : (rawId._serialized || rawId.user || '');
    if (!strId) return '';

    // If it's a standard @c.us JID without @lid, e.g. "919896253933@c.us"
    if (strId.includes('@c.us') && !strId.includes('@lid')) {
        const cleaned = strId.replace(/[^0-9]/g, '').slice(-10);
        if (cleaned && cleaned.length === 10) return cleaned;
    }

    // Check in-memory cache
    if (lidToPhoneCache.has(strId)) {
        return lidToPhoneCache.get(strId);
    }

    // If it's an @lid or non-standard format, resolve via WhatsApp Web Contact Collection
    if (isClientReady && client && client.pupPage) {
        try {
            const resolved = await client.pupPage.evaluate((targetId) => {
                try {
                    const WidFactory = window.require('WAWebWidFactory');
                    const ContactCollection = window.require('WAWebCollections').Contact;
                    const wid = WidFactory.createWid(targetId);
                    const contact = ContactCollection.get(wid) || ContactCollection.find(wid);
                    if (contact && contact.phoneNumber) {
                        return contact.phoneNumber._serialized || contact.phoneNumber.user || String(contact.phoneNumber);
                    }
                    if (contact && contact.id && !contact.id.isLid()) {
                        return contact.id._serialized || contact.id.user || String(contact.id);
                    }
                } catch (e) { }
                return null;
            }, strId);

            if (resolved) {
                const cleaned = String(resolved).replace(/[^0-9]/g, '').slice(-10);
                if (cleaned && cleaned.length === 10) {
                    lidToPhoneCache.set(strId, cleaned);
                    return cleaned;
                }
            }
        } catch (e) {
            console.warn('[RESOLVE PHONE ERR]:', e.message);
        }
    }

    // Fallback: check if any review session matches
    try {
        const sessions = loadReviewSessions();
        for (const [sPhone, sData] of Object.entries(sessions)) {
            if (sData.lid && sData.lid === strId) {
                lidToPhoneCache.set(strId, sPhone);
                return sPhone;
            }
        }
    } catch (e) { }

    // Fallback for regular phone numbers without @c.us
    const digits = strId.replace(/[^0-9]/g, '');
    if (digits.length <= 13 && digits.length >= 10) {
        return digits.slice(-10);
    }

    return '';
}

function getReviewPromptMessage(customerName = 'Valued Customer', cleanPhone = '', billNo = '') {
    const safeName = (customerName || 'Valued Customer').trim();
    const phoneParam = cleanPhone ? `?phone=${cleanPhone}&name=${encodeURIComponent(safeName)}${billNo ? `&bill=${encodeURIComponent(billNo.trim())}` : ''}` : '';
    const feedbackUrl = `https://cobb-store.web.app/feedback${phoneParam}`;

    return `⭐ *How was your shopping experience at Cobb Apparels?* ⭐\n\n` +
        `Hello *${safeName}*! 👋\n` +
        `Thank you for shopping at *Cobb Apparels (Pundri)* earlier today.\n\n` +
        `Could you please rate your visit by replying with a number? 🙏\n` +
        `5️⃣ - Excellent (⭐⭐⭐⭐⭐)\n` +
        `4️⃣ - Good (⭐⭐⭐⭐)\n` +
        `3️⃣ - Fair (⭐⭐⭐)\n` +
        `2️⃣ - Needs Improvement (⭐⭐)\n` +
        `1️⃣ - Poor (⭐)\n\n` +
        `🔗 *1-Tap Instant Review:* ${feedbackUrl}\n\n` +
        `_(Or select your rating in the poll below)_`;
}

function createRatingPoll() {
    return new Poll(
        'Rate your visit at Cobb Apparels (Pundri):',
        [
            '⭐⭐⭐⭐⭐ 5 - Excellent',
            '⭐⭐⭐⭐ 4 - Good',
            '⭐⭐⭐ 3 - Fair',
            '⭐⭐ 2 - Needs Improvement',
            '⭐ 1 - Poor'
        ],
        { allowMultipleAnswers: false }
    );
}

function createGrievancePoll() {
    return new Poll(
        'What went wrong? (Select all that apply):',
        [
            'Fitting / Alteration issue',
            'Staff behavior / Service delay',
            'Pricing / Offer discrepancy',
            'Fabric / Garment quality',
            'Other feedback'
        ],
        { allowMultipleAnswers: true }
    );
}

async function dispatchReviewSurvey(phone, customerName = 'Valued Customer', billNo = '') {
    const cleanPhone = String(phone).replace(/[^0-9]/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) return { success: false, error: 'Invalid phone number.' };
    const chatId = `91${cleanPhone}@c.us`;

    setReviewSession(cleanPhone, {
        customerName,
        billNo: billNo || '',
        step: 'waiting_rating'
    });

    const promptMsg = getReviewPromptMessage(customerName, cleanPhone, billNo);

    // 1. Dispatch text greeting with clear reply options & 1-tap link
    let textSent = false;
    try {
        await dispatchMessage(cleanPhone, promptMsg);
        textSent = true;
    } catch (msgErr) {
        console.warn(`[SURVEY] Text dispatch warning for ${cleanPhone}:`, msgErr.message);
    }

    // 2. Dispatch native interactive poll with clickable checkboxes
    let pollSent = false;
    if (isClientReady && client) {
        try {
            const ratingPoll = createRatingPoll();
            const sentMsg = await client.sendMessage(chatId, ratingPoll);
            if (sentMsg?.to?._serialized?.includes('@lid')) {
                lidToPhoneCache.set(sentMsg.to._serialized, cleanPhone);
                setReviewSession(cleanPhone, { lid: sentMsg.to._serialized });
            }
            console.log(`[POLL] Checkbox rating poll dispatched to ${chatId}`);
            pollSent = true;
        } catch (pollErr) {
            console.warn(`[POLL WARN] Rating poll send failed for ${chatId}:`, pollErr.message);
        }
    }

    return { success: textSent || pollSent, textSent, pollSent };
}

// --- PERSISTENT NPS 30-MINUTE SURVEY QUEUE ---
const NPS_QUEUE_FILE = path.join(__dirname, 'nps_queue.json');

function loadNpsQueue() {
    try {
        if (!fs.existsSync(NPS_QUEUE_FILE)) return [];
        return JSON.parse(fs.readFileSync(NPS_QUEUE_FILE, 'utf8'));
    } catch (e) {
        return [];
    }
}

function saveNpsQueue(queue) {
    try {
        fs.writeFileSync(NPS_QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8');
    } catch (e) { }
}

function queueNpsSurvey(phone, customerName = 'Valued Customer', billNo = '', delayMinutes = 30) {
    const cleanPhone = String(phone).replace(/[^0-9]/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) return;
    if (isOwnerPhone(cleanPhone) && delayMinutes > 0) {
        console.log(`[NPS QUEUE] Suppressing automated survey queue for owner phone ${cleanPhone}`);
        return;
    }

    const queue = loadNpsQueue();
    // Prevent duplicate pending surveys for same phone within 2 hours
    const existing = queue.find(q => q.phone === cleanPhone && q.status === 'pending');
    if (existing) return;

    const delayMs = Math.max(0, delayMinutes) * 60 * 1000;
    const scheduledAt = Date.now() + delayMs;

    queue.push({
        id: 'nps_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        phone: cleanPhone,
        customerName: customerName || 'Valued Customer',
        billNo: billNo || '',
        scheduledAt,
        createdAt: Date.now(),
        status: 'pending'
    });

    if (queue.length > 500) queue.shift();
    saveNpsQueue(queue);

    // Register active review session in 'waiting_rating' step
    setReviewSession(cleanPhone, {
        customerName: customerName || 'Valued Customer',
        billNo: billNo || '',
        step: 'waiting_rating'
    });

    console.log(`[NPS QUEUE] Queued survey for ${cleanPhone} (${customerName}) in ${delayMinutes}m (at ${new Date(scheduledAt).toLocaleTimeString()})`);
}

// Background worker: check pending NPS surveys every 25 seconds
setInterval(async () => {
    if (!isClientReady || !client) return;
    try {
        const queue = loadNpsQueue();
        const now = Date.now();
        let changed = false;

        for (const item of queue) {
            if (item.status === 'pending' && now >= item.scheduledAt) {
                item.status = 'sent';
                item.sentAt = now;
                changed = true;

                const name = item.customerName || 'Valued Customer';
                const surveyMsg = getReviewPromptMessage(name, item.phone, item.billNo);

                setReviewSession(item.phone, {
                    customerName: name,
                    billNo: item.billNo || '',
                    step: 'waiting_rating'
                });

                try {
                    await dispatchReviewSurvey(item.phone, name, item.billNo);
                    console.log(`[NPS DISPATCH] Sent feedback review survey & poll to ${item.phone}`);
                } catch (err) {
                    console.warn(`[NPS DISPATCH ERR] Failed for ${item.phone}:`, err.message);
                }
            }
        }

        if (changed) saveNpsQueue(queue);
    } catch (e) {
        console.error('[NPS TICKER ERROR]:', e.message);
    }
}, 25000);

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
                    try { fs.rmSync(fullPath, { recursive: true, force: true }); } catch (e) { }
                }
            } else {
                // Remove ONLY Chromium process locks (do NOT touch LevelDB LOCK files inside databases)
                if (
                    entry.name.includes('Singleton') ||
                    entry.name === 'DevToolsActivePort' ||
                    entry.name === '.parentlock'
                ) {
                    try { fs.unlinkSync(fullPath); } catch (e) { }
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
                    try { fs.rmSync(fullPath, { recursive: true, force: true }); } catch (e) { }
                } else if (entry.isFile() && (entry.name.includes('Singleton') || entry.name === '.parentlock')) {
                    try { fs.unlinkSync(fullPath); } catch (e) { }
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
                    try { execSync(`taskkill /PID ${pid} /T /F 2>NUL`, { windowsHide: true }); } catch (e) { }
                }
            }
            await client.destroy().catch(() => { });
        } catch (e) { }
        client = null;
    }

    // 2. Kill any orphaned Chromium/Puppeteer processes holding the session locks
    try {
        execSync('powershell -WindowStyle Hidden -Command "Get-CimInstance Win32_Process | Where-Object { ($_.CommandLine -match \'session-cobb-pos-session\' -or ($_.ExecutablePath -match \'puppeteer\' -and $_.ProcessId -ne $PID)) } | Invoke-CimMethod -MethodName Terminate"', { windowsHide: true });
    } catch (e) { }

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

                // Resolve customer phone supporting both @c.us and modern WhatsApp @lid
                let cleanPhone = await resolvePhoneNumber(msg.from);
                if (!cleanPhone && msg.author) {
                    cleanPhone = await resolvePhoneNumber(msg.author);
                }
                const phone = msg.from.replace('@c.us', '');
                if (!cleanPhone) cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
                if (!cleanPhone) return;

                // --- 2-STEP WHATSAPP REVIEW FUNNEL & GRIEVANCE INTERCEPTION ---
                const activeSession = getActiveReviewSession(cleanPhone);

                // SUPPRESS ALL AUTOMATED GENERAL REPLIES TO STORE OWNERS
                // (Allow active rating/review sessions and explicit rating replies so owner testing works)
                const isOwner = isOwnerPhone(cleanPhone) || isOwnerPhone(phone);
                const isRatingMsg = Boolean(activeSession && activeSession.step) ||
                    ['5', '4', '3', '2', '1', '⭐⭐⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐', '⭐⭐', '⭐'].includes(lower) ||
                    ['5 star', '5 stars', '4 star', '4 stars', '3 star', '2 star', '1 star', 'excellent', 'superb', 'great'].some(k => lower.includes(k));

                if (isOwner && !isRatingMsg) {
                    console.log(`[WHATSAPP INBOUND] Message from owner ${cleanPhone} ("${rawBody}") - suppressing automated general reply.`);
                    return;
                }

                console.log(`[WHATSAPP INBOUND] From ${cleanPhone}: "${rawBody}"`);

                // Anti-spam cooldown: max 1 automated reply per 4 seconds to the same phone
                const now = Date.now();
                if (inboundCooldown.has(phone) && now - inboundCooldown.get(phone) < 4000) {
                    return;
                }
                inboundCooldown.set(phone, now);

                // STEP 2: Grievance Detail Collection (Customer previously gave a low rating and was asked why)
                if (activeSession && activeSession.step === 'waiting_grievance_detail') {
                    let category = 'Customer Grievance';
                    let detail = rawBody;

                    if (lower === '1' || lower.includes('fitting') || lower.includes('alteration') || lower.includes('size')) {
                        category = 'Fitting / Alteration Issue';
                    } else if (lower === '2' || lower.includes('staff') || lower.includes('delay') || lower.includes('service') || lower.includes('wait') || lower.includes('cashier')) {
                        category = 'Staff Behavior / Service Delay';
                    } else if (lower === '3' || lower.includes('price') || lower.includes('pricing') || lower.includes('offer') || lower.includes('discount') || lower.includes('bill')) {
                        category = 'Pricing / Offer Discrepancy';
                    } else if (lower === '4' || lower.includes('fabric') || lower.includes('quality') || lower.includes('cloth') || lower.includes('color') || lower.includes('shrink')) {
                        category = 'Fabric / Garment Quality';
                    }

                    const reply = `🙏 *Thank you for your valuable feedback.*\n\n` +
                        `We have recorded your concern:\n` +
                        `📌 *Issue:* ${category}${detail && !['1', '2', '3', '4'].includes(detail) ? ` ("${detail}")` : ''}\n\n` +
                        `Our Store Manager (*Parbhat Goyal*) has been alerted directly and will look into this personally to ensure it is resolved. We truly value your trust in Cobb! 👔`;
                    await client.sendMessage(msg.from, reply);

                    try {
                        const grievancePoll = createGrievancePoll();
                        await client.sendMessage(msg.from, grievancePoll);
                    } catch (e) { }

                    setReviewSession(cleanPhone, {
                        step: 'completed',
                        grievanceCategory: category,
                        grievanceDetail: detail
                    });

                    // Forward detailed grievance to CRM backend
                    try {
                        await fetch('http://localhost:5000/api/whatsapp/inbound-alert', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                phone: cleanPhone,
                                customerName: activeSession.customerName,
                                message: `[${category}] ${detail}`,
                                type: 'grievance_low_nps',
                                rating: activeSession.rating || 2
                            })
                        });
                    } catch (e) { }

                    // Real-time WhatsApp Escalation to Store Owners
                    if (isClientReady && client) {
                        const starEmojis = '⭐'.repeat(activeSession.rating || 2) + '☆'.repeat(5 - (activeSession.rating || 2));
                        const escalationMsg = `🚨 *Customer Grievance Escalation — Immediate Action Required*\n\n` +
                            `👤 *Customer:* *${activeSession.customerName || 'Customer'}* (+91${cleanPhone})\n` +
                            `⭐ *Rating:* ${activeSession.rating || 2}/5 stars ${starEmojis}\n` +
                            `🏷️ *Category:* ${category}\n` +
                            `💬 *Customer Note:* "${detail}"\n` +
                            `${activeSession.billNo ? `🧾 *Bill No:* #${activeSession.billNo}\n` : ''}\n` +
                            `👉 *Please follow up personally with the customer to resolve their concern.*`;
                        for (const ownerPhone of OWNER_PHONES) {
                            try {
                                await client.sendMessage(`91${ownerPhone}@c.us`, escalationMsg);
                            } catch (e) {
                                console.warn(`[ESCALATION] Could not alert owner ${ownerPhone}:`, e.message);
                            }
                        }
                    }
                    return;
                }

                // STEP 1: Rating Evaluation (Either from an active review survey prompt or voluntary customer rating)
                const isWaitingRating = activeSession && activeSession.step === 'waiting_rating';

                const isPositiveRating = (isWaitingRating && (lower === '5' || lower === 'five' || lower === '4' || lower === 'four')) ||
                    ['5', 'five', '4', 'four', '5 star', '5 stars', '5/5', '5⭐', '4 star', '4 stars', '4/5', '4⭐', 'excellent', 'superb', 'great'].some(k => lower === k || lower.startsWith(k + ' ') || lower.endsWith(' ' + k) || lower.includes(k)) ||
                    lower.includes('⭐⭐⭐⭐⭐') || lower.includes('⭐⭐⭐⭐');

                const isNegativeRating = (isWaitingRating && (lower === '1' || lower === 'one' || lower === '2' || lower === 'two' || lower === '3' || lower === 'three')) ||
                    ['1', 'one', '2', 'two', '3', 'three', '1 star', '1 stars', '1/5', '1⭐', '2 star', '2 stars', '2/5', '2⭐', '3 star', '3 stars', '3/5', '3⭐', 'bad', 'poor', 'worst', 'issue', 'complaint', 'terrible', 'pathetic', 'dissatisfied'].some(k => lower === k || lower.startsWith(k + ' ') || lower.endsWith(' ' + k) || lower.includes(k)) ||
                    lower.includes('⭐⭐⭐') || lower.includes('⭐⭐') || lower.includes('⭐');
                    ['1 star', '1 stars', '1/5', '1⭐', '2 star', '2 stars', '2/5', '2⭐', '3 star', '3 stars', '3/5', '3⭐', 'bad', 'poor', 'worst', 'issue', 'complaint', 'terrible', 'pathetic', 'dissatisfied'].some(k => lower === k || lower.startsWith(k + ' ') || lower.endsWith(' ' + k) || lower.includes(k)) ||
                    lower.includes('⭐⭐⭐') || lower.includes('⭐⭐') || lower.includes('⭐');

                if (isPositiveRating) {
                    const ratingScore = (lower.includes('4') && !lower.includes('5')) ? 4 : 5;
                    saveRatingToLedger({
                        phone: cleanPhone,
                        customerName: activeSession?.customerName,
                        rating: ratingScore,
                        comment: rawBody,
                        billNo: activeSession?.billNo
                    });
                    const reply = `🌟 *Thank you so much for the ${ratingScore}-Star rating!* 🙏\n\n` +
                        `Your feedback means everything to our local team. Would you mind taking 15 seconds to share your review on our Google Maps page?\n\n` +
                        `⭐ *Tap here to review:*\n${GOOGLE_REVIEW_LINK}\n\n` +
                        `Thank you for being part of the Cobb family! 👔`;
                    await client.sendMessage(msg.from, reply);

                    setReviewSession(cleanPhone, {
                        step: 'completed',
                        rating: ratingScore
                    });

                    // Forward to CRM backend for permanent rating storage
                    try {
                        await fetch('http://localhost:5000/api/whatsapp/inbound-alert', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                phone: cleanPhone,
                                customerName: activeSession?.customerName,
                                message: rawBody,
                                type: 'rating_positive',
                                rating: ratingScore
                            })
                        });
                    } catch (e) { }
                    return;
                }

                if (isNegativeRating) {
                    let grievanceScore = 1;
                    if (lower.includes('3')) grievanceScore = 3;
                    else if (lower.includes('2')) grievanceScore = 2;

                    saveRatingToLedger({
                        phone: cleanPhone,
                        customerName: activeSession?.customerName,
                        rating: grievanceScore,
                        comment: rawBody,
                        billNo: activeSession?.billNo
                    });

                    // PRIVATELY INTERCEPT! Do not send public Google review link.
                    const reply = `🙏 *We sincerely apologize for falling short of your expectations.*\n\n` +
                        `We strive for 5-star service and want to make this right. Could you please reply with what went wrong?\n\n` +
                        `1️⃣ Fitting / Alteration issue\n` +
                        `2️⃣ Staff behavior / Service delay\n` +
                        `3️⃣ Pricing / Offer discrepancy\n` +
                        `4️⃣ Fabric / Garment quality\n\n` +
                        `_Or reply in your own words_ 💬`;
                    await client.sendMessage(msg.from, reply);

                    setReviewSession(cleanPhone, {
                        customerName: activeSession?.customerName || 'Customer',
                        billNo: activeSession?.billNo || '',
                        step: 'waiting_grievance_detail',
                        rating: grievanceScore
                    });

                    // Forward preliminary grievance to CRM backend
                    try {
                        await fetch('http://localhost:5000/api/whatsapp/inbound-alert', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                phone: cleanPhone,
                                customerName: activeSession?.customerName,
                                message: rawBody,
                                type: 'grievance_low_nps',
                                rating: grievanceScore
                            })
                        });
                    } catch (e) { }

                    // Preliminary Owner Escalation
                    if (isClientReady && client) {
                        const starEmojis = '⭐'.repeat(grievanceScore) + '☆'.repeat(5 - grievanceScore);
                        const escalationMsg = `🚨 *Low Rating Alert — Customer Grievance (Step 1)*\n\n` +
                            `A customer just rated us *${grievanceScore}/5 stars* ${starEmojis}\n\n` +
                            `📱 *From:* +91${cleanPhone}\n` +
                            `💬 *Initial reply:* "${rawBody}"\n\n` +
                            `_Awaiting their detailed feedback reason..._`;
                        for (const ownerPhone of OWNER_PHONES) {
                            try {
                                await client.sendMessage(`91${ownerPhone}@c.us`, escalationMsg);
                            } catch (e) {
                                console.warn(`[ESCALATION] Could not alert owner ${ownerPhone}:`, e.message);
                            }
                        }
                    }
                    return;
                }

                // SUPPRESS ALL AUTOMATED CHATBOT / CONCIERGE REPLIES IF BOT DISABLED
                if (!enableInboundBot) {
                    console.log(`[WHATSAPP INBOUND] Two-way bot disabled - suppressing automated reply to ${cleanPhone}.`);
                    return;
                }

                // 1. Loyalty Points / Tier Balance
                if (lower === '1' || lower.includes('point') || lower.includes('loyalty') || lower.includes('balance') || lower.includes('coin')) {
                    try {
                        const res = await fetch(`http://localhost:5000/api/loyalty/customer/${cleanPhone}`, { signal: AbortSignal.timeout(4000) });
                        if (res.ok) {
                            const cust = await res.json();
                            const reply = `🏆 *Cobb VIP Loyalty Status*\n\nHello *${cust.customerName || 'Valued Customer'}*! 👋\n\n✨ *Tier:* ${cust.tier || 'Silver'}\n⭐ *Available Points:* ${Number(cust.points || 0).toLocaleString('en-IN')} pts\n💰 *Cash Value:* ₹${Number(cust.pointsValue || 0).toLocaleString('en-IN')}\n🛍️ *Total Store Visits:* ${cust.totalVisits || 1}\n\n👉 Show your phone at the billing counter to redeem points on your next purchase!\n\n_Reply 2: Alterations | 3: Catalog | 4: Offers_`;
                            await client.sendMessage(msg.from, reply);
                            return;
                        }
                    } catch (e) { }

                    await client.sendMessage(msg.from, `🏆 *Cobb VIP Loyalty*\n\nThank you for reaching out! To redeem points at checkout, simply quote your registered mobile number: *${cleanPhone}*.\n\n_Reply 2: Alterations | 3: Catalog | 4: Offers_`);
                    return;
                }

                // 2. Alteration Status Check (Live from Alterations Desk)
                if (lower === '2' || lower.includes('alteration') || lower.includes('tailor') || lower.includes('fitting') || lower.includes('pant') || lower.includes('trouser')) {
                    try {
                        const res = await fetch(`http://localhost:5000/api/alterations/customer/${cleanPhone}`, { signal: AbortSignal.timeout(5000) });
                        if (res.ok) {
                            const data = await res.json();
                            if (data.success && data.alterations && data.alterations.length > 0) {
                                const latest = data.alterations[0];
                                const isReady = latest.status === 'Completed' || latest.status === 'Ready' || latest.status === 'Delivered';
                                const statusBadge = isReady ? '✅ *READY FOR PICKUP*' : '⏳ *IN PROGRESS (TAILORING)*';

                                const reply = `✂️ *Cobb Alterations Desk Status*\n\nHello *${latest.customerName}*! 👋\n\n${statusBadge}\n\n📌 *Garment:* ${latest.category} (Qty: ${latest.quantity})\n👔 *Master Tailor:* ${latest.tailorName || 'Store Master Tailor'}\n📅 *Expected Delivery:* ${latest.expectedDate || 'Today'}\n🏷️ *Job Status:* ${latest.status}\n\n${isReady ? '👉 You can collect your altered garment from the billing counter!' : '👉 We are finalizing your custom fit. You will receive an SMS/WhatsApp once ready.'}\n\n_Reply 1: Points | 3: Catalog | 4: Offers_`;
                                await client.sendMessage(msg.from, reply);
                                return;
                            }
                        }
                    } catch (e) { }

                    await client.sendMessage(msg.from, `✂️ *Cobb Alterations Desk*\n\nNo active alteration slips were found under mobile number *${cleanPhone}*.\n\nIf you recently dropped off garments, please verify your mobile number or visit the billing counter with your slip token! 🛍️\n\n_Reply 1: Points | 3: Catalog | 4: Offers_`);
                    return;
                }

                // 3. New Arrivals & Dynamic WhatsApp Catalog
                if (lower === '3' || lower.includes('catalog') || lower.includes('new arrival') || lower.includes('collection') || lower.includes('stock')) {
                    try {
                        const res = await fetch(`http://localhost:5000/api/whatsapp/concierge/catalog`, { signal: AbortSignal.timeout(5000) });
                        if (res.ok) {
                            const cat = await res.json();
                            if (cat.items && cat.items.length > 0) {
                                let reply = `🔥 *Cobb Trending Arrivals & Catalog* 🔥\n\n`;
                                cat.items.slice(0, 5).forEach((item, idx) => {
                                    const numEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'][idx];
                                    reply += `${numEmoji} *${item.articleName}*\n   Code: *${item.articleNo}* | ${item.category}\n   💰 Special Price: *₹${item.offerPrice.toLocaleString('en-IN')}* (MRP: ₹${item.mrp.toLocaleString('en-IN')})\n   👉 Reply *RESERVE ${item.articleNo}* to hold 24h\n\n`;
                                });
                                reply += `📍 *Click & Collect:* Reply with *RESERVE <Code>* to have any item set aside at the counter for 24 hours!\n\n_Reply 1: Points | 2: Alterations | 4: Offers_`;
                                await client.sendMessage(msg.from, reply);
                                return;
                            }
                        }
                    } catch (e) { }

                    await client.sendMessage(msg.from, `🛍️ *Cobb New Arrivals*\n\nOur fresh collection has arrived in-store!\n• Premium Formal & Linen Shirts\n• Italian Slim-Fit Trousers & Chinos\n• Fine Tailored Suits & Blazers\n\nVisit us today for exclusive in-store trials! 👔\n\n_Reply 1: Points | 2: Alterations_`);
                    return;
                }

                // Click & Collect Reservation (e.g. "RESERVE CFDH3378" or "HOLD CFDH3378")
                if (lower.startsWith('reserve') || lower.startsWith('hold')) {
                    const parts = rawBody.split(/\s+/);
                    const code = parts[1] || '';
                    if (code) {
                        try {
                            const res = await fetch(`http://localhost:5000/api/whatsapp/concierge/reserve`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ phone: cleanPhone, articleCode: code })
                            });
                            if (res.ok) {
                                const data = await res.json();
                                if (data.success) {
                                    const reply = `🛍️ *Item Reserved Successfully!* (Click & Collect)\n\n📌 *Article:* ${data.articleName}\n🏷️ *Code:* ${data.articleNo}\n🎫 *Hold Token:* *${data.holdToken}*\n⏳ *Hold Window:* 24 Hours\n📍 *Pickup Counter:* ${data.storeAddress}\n\nYour item has been set aside at the billing desk. Please quote your token *${data.holdToken}* upon arrival! 😊`;
                                    await client.sendMessage(msg.from, reply);
                                    return;
                                }
                            }
                        } catch (e) { }
                    }
                    await client.sendMessage(msg.from, `🛍️ *Reserve an Item*\n\nPlease reply in the format:\n*RESERVE <ArticleCode>*\n\nExample: *RESERVE CFDH3378*\n_Reply 3 to view trending article codes._`);
                    return;
                }

                // 4. In-Store Offers
                if (lower === '4' || lower.includes('offer') || lower.includes('deal') || lower.includes('discount') || lower.includes('sale') || lower.includes('scheme')) {
                    const reply = `🏷️ *Today's In-Store Cobb Specials*\n\n✨ *Buy 2 Get 1 FREE* on selected shirts & casual tees\n✨ *Flat 20% OFF* on premium Italian-fit suits & blazers\n✨ *Additional 5% OFF* on all bills above ₹4,999!\n\n📍 _Offers valid exclusively in-store today._\n\n_Reply 1: Points | 2: Alterations | 3: Catalog_`;
                    await client.sendMessage(msg.from, reply);
                    return;
                }

                // 5. Store Timings & Location
                if (lower === '5' || lower.includes('timing') || lower.includes('location') || lower.includes('address') || lower.includes('map') || lower.includes('open') || lower.includes('time')) {
                    const reply = `📍 *Cobb Apparels Flagship Store*\n\n🕒 *Hours:* 10:30 AM – 9:30 PM (Open all 7 days)\n📍 *Address:* Cobb Apparels Store, Main Market, Pundri\n🗺️ *Google Maps:* https://maps.google.com/?q=Cobb+Apparels+Pundri\n👔 *Collections:* Men's Suits, Blazers, Formal Shirts, Chinos, Denim & Winterwear\n\nWe look forward to welcoming you! 🛍️`;
                    await client.sendMessage(msg.from, reply);
                    return;
                }



                // 6. Help / Counter Support
                if (lower === '6' || lower.includes('help') || lower.includes('support') || lower.includes('call') || lower.includes('manager')) {
                    const reply = `🛎️ *Store Counter Alerted*\n\nOur store representative has received your request and will follow up shortly.\n\n_Reply 1: Points | 2: Alterations | 3: Catalog | 5: Location_`;
                    await client.sendMessage(msg.from, reply);
                    try {
                        await fetch('http://localhost:5000/api/whatsapp/inbound-alert', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ phone: cleanPhone, message: rawBody, type: 'support_request' })
                        });
                    } catch (e) { }
                    return;
                }

                // 7. Generic Greeting & Main Menu
                if (['hi', 'hello', 'hey', 'namaste', 'start', 'cobb', 'menu', 'help'].some(k => lower.includes(k))) {
                    const reply = `👋 *Welcome to Cobb Retail Concierge!*\n\nHow can we help you today? Please reply with a number:\n\n1️⃣ Check *Loyalty Points & VIP Tier* 🏆\n2️⃣ Check *Live Alteration Status* ✂️\n3️⃣ View *New Arrivals & Catalog* 🛍️\n4️⃣ Today's *In-Store Offers* 🏷️\n5️⃣ Store *Timings & Address* 📍\n6️⃣ Contact *Store Counter / Manager* 🛎️\n\n_Cobb Apparels — Redefining Fashion_`;
                    await client.sendMessage(msg.from, reply);
                }
            } catch (inboundErr) {
                console.error('[WHATSAPP INBOUND ERROR]:', inboundErr.message);
            }
        });

        // --- WHATSAPP POLL VOTE INTERCEPTION (CHECKBOX / RADIO SELECTION) ---
        client.on('vote_update', async (vote) => {
            try {
                if (!vote) return;
                const rawVoter = typeof vote.voter === 'string'
                    ? vote.voter
                    : (vote.voter?._serialized || vote.voter?.user || vote.senderUserJid || '');
                const parentRemote = vote.parentMsgKey?.remote?._serialized || vote.parentMsgKey?.remote?.user || '';

                // Try resolving phone from voter JID, or fall back to parentMsgKey remote chat
                let cleanPhone = await resolvePhoneNumber(rawVoter);
                if (!cleanPhone && parentRemote) {
                    cleanPhone = await resolvePhoneNumber(parentRemote);
                }

                if (!cleanPhone) {
                    console.warn('[VOTE UPDATE] Could not resolve voter phone:', { rawVoter, parentRemote });
                    return;
                }

                // Ignore if user unselected all options
                if (!vote.selectedOptions || vote.selectedOptions.length === 0) return;

                // Anti-spam cooldown per phone (2 seconds)
                const now = Date.now();
                if (inboundCooldown.has(cleanPhone) && (now - inboundCooldown.get(cleanPhone) < 2000)) return;
                inboundCooldown.set(cleanPhone, now);

                const chatId = (rawVoter && rawVoter.includes('@c.us') && !rawVoter.includes('@lid'))
                    ? rawVoter
                    : (parentRemote && parentRemote.includes('@c.us') && !parentRemote.includes('@lid'))
                        ? parentRemote
                        : `91${cleanPhone}@c.us`;

                console.log(`[VOTE UPDATE] Processing poll vote from ${cleanPhone} (${chatId}):`, vote.selectedOptions);
                const activeSession = getActiveReviewSession(cleanPhone);

                const grievanceMap = {
                    0: 'Fitting / Alteration Issue',
                    1: 'Staff Behavior / Service Delay',
                    2: 'Pricing / Offer Discrepancy',
                    3: 'Fabric / Garment Quality',
                    4: 'Other Feedback'
                };

                const isGrievanceStep = (activeSession && activeSession.step === 'waiting_grievance_detail') ||
                    (vote.parentMessage && vote.parentMessage.pollName && vote.parentMessage.pollName.toLowerCase().includes('went wrong'));

                // STEP 2: Customer voted on Grievance Checkboxes
                if (isGrievanceStep) {
                    const selectedCategories = vote.selectedOptions.map(o => {
                        if (o.name && !o.name.startsWith('Option')) return o.name;
                        if (typeof o.localId === 'number' && grievanceMap[o.localId]) return grievanceMap[o.localId];
                        return o.name || `Issue #${o.localId}`;
                    });

                    const detail = selectedCategories.join(', ') || 'Customer Grievance';
                    let category = 'Customer Grievance';
                    const lowerDetail = detail.toLowerCase();
                    if (lowerDetail.includes('fitting') || lowerDetail.includes('alteration') || lowerDetail.includes('size')) {
                        category = 'Fitting / Alteration Issue';
                    } else if (lowerDetail.includes('staff') || lowerDetail.includes('delay') || lowerDetail.includes('service')) {
                        category = 'Staff Behavior / Service Delay';
                    } else if (lowerDetail.includes('price') || lowerDetail.includes('pricing') || lowerDetail.includes('offer')) {
                        category = 'Pricing / Offer Discrepancy';
                    } else if (lowerDetail.includes('fabric') || lowerDetail.includes('quality') || lowerDetail.includes('cloth')) {
                        category = 'Fabric / Garment Quality';
                    }

                    const reply = `🙏 *Thank you for your valuable feedback.*\n\n` +
                        `We have recorded your concern:\n` +
                        `📌 *Issue:* ${category} ("${detail}")\n\n` +
                        `Our Store Manager (*Parbhat Goyal*) has been alerted directly and will look into this personally to ensure it is resolved. We truly value your trust in Cobb! 👔`;
                    await client.sendMessage(chatId, reply);

                    setReviewSession(cleanPhone, {
                        step: 'completed',
                        grievanceCategory: category,
                        grievanceDetail: detail
                    });

                    // Forward to CRM
                    try {
                        await fetch('http://localhost:5000/api/whatsapp/inbound-alert', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                phone: cleanPhone,
                                customerName: activeSession?.customerName,
                                message: `[${category}] ${detail}`,
                                type: 'grievance_low_nps',
                                rating: activeSession?.rating || 2
                            })
                        });
                    } catch (e) { }

                    // Real-time WhatsApp Escalation to Store Owners
                    if (isClientReady && client) {
                        const starEmojis = '⭐'.repeat(activeSession?.rating || 2) + '☆'.repeat(5 - (activeSession?.rating || 2));
                        const escalationMsg = `🚨 *Customer Grievance Escalation — Immediate Action Required*\n\n` +
                            `👤 *Customer:* *${activeSession?.customerName || 'Customer'}* (+91${cleanPhone})\n` +
                            `⭐ *Rating:* ${activeSession?.rating || 2}/5 stars ${starEmojis}\n` +
                            `🏷️ *Category:* ${category}\n` +
                            `💬 *Selected Items:* "${detail}"\n` +
                            `${activeSession?.billNo ? `🧾 *Bill No:* #${activeSession.billNo}\n` : ''}\n` +
                            `👉 *Please follow up personally with the customer to resolve their concern.*`;
                        for (const ownerPhone of OWNER_PHONES) {
                            try {
                                await client.sendMessage(`91${ownerPhone}@c.us`, escalationMsg);
                            } catch (e) {
                                console.warn(`[ESCALATION] Could not alert owner ${ownerPhone}:`, e.message);
                            }
                        }
                    }
                    return;
                }

                // STEP 1: Customer voted on Rating Poll
                const selected = vote.selectedOptions[0];
                const optName = String(selected.name || '').toLowerCase();
                const localId = typeof selected.localId === 'number' ? selected.localId : -1;

                const is5 = localId === 0 || optName.includes('5') || optName.includes('excellent');
                const is4 = localId === 1 || optName.includes('4') || optName.includes('good');
                const isPositive = is5 || is4;

                if (isPositive) {
                    const ratingScore = is5 ? 5 : 4;
                    saveRatingToLedger({
                        phone: cleanPhone,
                        customerName: activeSession?.customerName,
                        rating: ratingScore,
                        comment: selected.name || `${ratingScore} Stars`,
                        billNo: activeSession?.billNo
                    });
                    const reply = `🌟 *Thank you so much for the ${ratingScore}-Star rating!* 🙏\n\n` +
                        `Your feedback means everything to our local team. Would you mind taking 15 seconds to share your review on our Google Maps page?\n\n` +
                        `⭐ *Tap here to review:*\n${GOOGLE_REVIEW_LINK}\n\n` +
                        `Thank you for being part of the Cobb family! 👔`;
                    await client.sendMessage(chatId, reply);

                    setReviewSession(cleanPhone, {
                        step: 'completed',
                        rating: ratingScore
                    });

                    try {
                        await fetch('http://localhost:5000/api/whatsapp/inbound-alert', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                phone: cleanPhone,
                                customerName: activeSession?.customerName,
                                message: selected.name || `${ratingScore} Stars`,
                                type: 'rating_positive',
                                rating: ratingScore
                            })
                        });
                    } catch (e) { }
                    return;
                }

                // Negative / Low Rating (1, 2, or 3) -> Intercept Privately!
                let grievanceScore = 3;
                if (localId === 4 || optName.includes('1') || optName.includes('poor')) grievanceScore = 1;
                else if (localId === 3 || optName.includes('2')) grievanceScore = 2;

                saveRatingToLedger({
                    phone: cleanPhone,
                    customerName: activeSession?.customerName,
                    rating: grievanceScore,
                    comment: selected.name || `${grievanceScore} Stars`,
                    billNo: activeSession?.billNo
                });

                setReviewSession(cleanPhone, {
                    customerName: activeSession?.customerName || 'Customer',
                    billNo: activeSession?.billNo || '',
                    step: 'waiting_grievance_detail',
                    rating: grievanceScore
                });

                // Apology text + Multi-select grievance checkbox poll
                const apologyReply = `🙏 *We sincerely apologize for falling short of your expectations.*\n\n` +
                    `We strive for 5-star service and want to make this right. Could you please select what went wrong below?`;
                await client.sendMessage(chatId, apologyReply);

                try {
                    const grievancePoll = createGrievancePoll();
                    await client.sendMessage(chatId, grievancePoll);
                } catch (pollErr) {
                    console.warn(`[POLL ERR] Could not send grievance poll to ${cleanPhone}:`, pollErr.message);
                }

                // Alert CRM
                try {
                    await fetch('http://localhost:5000/api/whatsapp/inbound-alert', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            phone: cleanPhone,
                            customerName: activeSession?.customerName,
                            message: selected.name || `${grievanceScore} Stars`,
                            type: 'grievance_low_nps',
                            rating: grievanceScore
                        })
                    });
                } catch (e) { }

                // Alert Owners
                if (isClientReady && client) {
                    const starEmojis = '⭐'.repeat(grievanceScore) + '☆'.repeat(5 - grievanceScore);
                    const alertMsg = `🚨 *Low Rating Alert — Customer Grievance (Poll Tap)*\n\n` +
                        `A customer just rated us *${grievanceScore}/5 stars* ${starEmojis}\n\n` +
                        `📱 *From:* +91${cleanPhone}\n` +
                        `💬 *Selected:* "${selected.name || `${grievanceScore} Stars`}"\n\n` +
                        `_Awaiting their detailed feedback reason..._`;
                    for (const ownerPhone of OWNER_PHONES) {
                        try {
                            await client.sendMessage(`91${ownerPhone}@c.us`, alertMsg);
                        } catch (e) { }
                    }
                }
            } catch (voteErr) {
                console.error('[WHATSAPP POLL VOTE ERROR]:', voteErr.message);
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
            } catch (e) { }
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
    console.log(`[WHATSAPP] Scheduling reconnect attempt ${reconnectAttempts} in ${delay / 1000}s (preserving session)...`);
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
        reconnectAttempts: reconnectAttempts,
        inboundBotEnabled: enableInboundBot
    });
});

app.get('/bot-status', (req, res) => {
    res.json({ enabled: enableInboundBot });
});



app.post('/bot-toggle', (req, res) => {
    if (typeof req.body.enabled === 'boolean') {
        enableInboundBot = req.body.enabled;
    } else {
        enableInboundBot = !enableInboundBot;
    }
    console.log(`[WHATSAPP] Inbound two-way concierge bot is now ${enableInboundBot ? 'ENABLED' : 'DISABLED'}.`);
    res.json({ success: true, enabled: enableInboundBot });
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
const dispatchLedgerPath = path.join(__dirname, 'dispatch_ledger.json');
const completedDispatches = new Set();
const inFlightDispatches = new Map();

try {
    if (fs.existsSync(dispatchLedgerPath)) {
        const savedDispatches = JSON.parse(fs.readFileSync(dispatchLedgerPath, 'utf8'));
        if (Array.isArray(savedDispatches)) savedDispatches.forEach(key => completedDispatches.add(String(key)));
    }
} catch (err) {
    console.warn('[DISPATCH LEDGER] Could not load ledger:', err.message);
}

function recordCompletedDispatch(dedupeKey) {
    if (!dedupeKey) return;
    completedDispatches.add(dedupeKey);
    try {
        fs.writeFileSync(dispatchLedgerPath, JSON.stringify([...completedDispatches].slice(-5000), null, 2));
    } catch (err) {
        console.warn('[DISPATCH LEDGER] Could not save ledger:', err.message);
    }
}

async function dispatchIdempotently(dedupeKey, dispatchFn) {
    if (!dedupeKey) return dispatchFn();
    if (completedDispatches.has(dedupeKey)) {
        console.log(`[DEDUPED] Already dispatched ${dedupeKey}`);
        return { success: true, deduplicated: true };
    }
    if (inFlightDispatches.has(dedupeKey)) {
        console.log(`[DEDUPED] Waiting for in-flight dispatch ${dedupeKey}`);
        return inFlightDispatches.get(dedupeKey);
    }

    const dispatchPromise = Promise.resolve()
        .then(dispatchFn)
        .then(result => {
            if (result && result.success) recordCompletedDispatch(dedupeKey);
            return result;
        })
        .finally(() => inFlightDispatches.delete(dedupeKey));
    inFlightDispatches.set(dedupeKey, dispatchPromise);
    return dispatchPromise;
}

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
            const result = await dispatchIdempotently(item.dedupeKey, () => dispatchMessage(item.number, item.message, item.mediaPath));
            if (item.resolve) item.resolve(result);
        } catch (err) {
            console.error(`[OUTBOX RETRY ERROR] Failed for ${item.number}:`, err.message);
            if (item.reject) item.reject(err);
        }
    }
    isFlushingOutbox = false;
}

app.post('/send', async (req, res) => {
    const { number, message, mediaPath, dedupeKey } = req.body;

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
                dedupeKey,
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
        const result = await dispatchIdempotently(dedupeKey, () => dispatchMessage(number, message, mediaPath));
        if (result.skipped) {
            return res.status(400).json(result);
        }

        // On checkout: dispatch interactive rating poll immediately with the thank-you message
        const lowerMsg = (message || '').toLowerCase();
        const isBillDispatch = lowerMsg.includes('bill') || lowerMsg.includes('receipt') || lowerMsg.includes('cobb') || lowerMsg.includes('shopping') || lowerMsg.includes('total') || lowerMsg.includes('digital receipt');
        if (isBillDispatch && result.success) {
            const cleanPhone = String(number).replace(/[^0-9]/g, '').slice(-10);
            const customerNameMatch = message.match(/(?:Hello|Dear)\s+\*?([A-Za-z\s]+?)\*?(?:!|,)/i);
            const parsedName = customerNameMatch ? customerNameMatch[1].trim() : (req.body.customerName || 'Valued Customer');
            const billNoMatch = message.match(/(?:Bill|Inv(?:oice)?)\s*(?:No\.?|#)?\s*:?\s*\*?([A-Za-z0-9\/-]+)\*?/i);
            const parsedBillNo = billNoMatch ? billNoMatch[1].trim() : (req.body.billNo || '');

            setReviewSession(cleanPhone, {
                customerName: parsedName,
                billNo: parsedBillNo,
                step: 'waiting_rating'
            });

            // Dispatch interactive rating poll immediately with the thank-you message
            if (isClientReady && client) {
                try {
                    const chatId = `91${cleanPhone}@c.us`;
                    const ratingPoll = createRatingPoll();
                    const sentPoll = await client.sendMessage(chatId, ratingPoll);
                    if (sentPoll?.to?._serialized?.includes('@lid')) {
                        lidToPhoneCache.set(sentPoll.to._serialized, cleanPhone);
                        setReviewSession(cleanPhone, { lid: sentPoll.to._serialized });
                    }
                    console.log(`[CHECKOUT POLL] Rating poll dispatched immediately with thank-you bill to ${cleanPhone}`);
                } catch (pollErr) {
                    console.warn(`[CHECKOUT POLL ERR] Failed to dispatch rating poll to ${cleanPhone}:`, pollErr.message);
                }
            }
        }

        return res.json(result);
    } catch (err) {
        if (isUnregisteredError(err)) {
            return res.status(400).json({ success: false, skipped: true, error: 'Phone number is not registered on WhatsApp.' });
        }
        console.error(`[ERROR] Primary send failed to ${number}:`, err.message || err);
        if (err.message && (err.message.includes('detached Frame') || err.message.includes('Session closed') || err.message.includes('Target closed'))) {
            console.error('[WHATSAPP] Detected detached frame or closed session! Safely scheduling client recovery...');
            scheduleReconnect();
        }
        return res.status(500).json({ error: `WhatsApp gateway dispatch error: ${err.message || err}` });
    }
});

// --- REVIEW BOT MANAGEMENT & DISPATCH ENDPOINTS ---
app.get('/api/reviews/bot-status', (req, res) => {
    const sessions = loadReviewSessions();
    const sessionList = Object.values(sessions);
    const activeSessions = sessionList.filter(s => {
        const age = Date.now() - (s.updatedAt || s.createdAt || 0);
        return age < 48 * 60 * 60 * 1000;
    });
    const waitingRating = activeSessions.filter(s => s.step === 'waiting_rating');
    const waitingGrievance = activeSessions.filter(s => s.step === 'waiting_grievance_detail');
    const completed = activeSessions.filter(s => s.step === 'completed');

    res.json({
        success: true,
        botActive: isClientReady,
        googleReviewUrl: GOOGLE_REVIEW_LINK,
        totalSessions: activeSessions.length,
        waitingRatingCount: waitingRating.length,
        waitingGrievanceCount: waitingGrievance.length,
        completedCount: completed.length,
        recentSessions: activeSessions.slice(-25).reverse()
    });
});

app.post('/api/reviews/send-prompt', async (req, res) => {
    const { phone, customerName, billNo, delayMinutes = 0 } = req.body || {};
    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) {
        return res.status(400).json({ success: false, error: 'Valid 10-digit phone number is required.' });
    }

    const name = (customerName || 'Valued Customer').trim();
    const delay = Number(delayMinutes) || 0;

    if (delay > 0) {
        queueNpsSurvey(cleanPhone, name, billNo, delay);
        return res.json({ success: true, message: `Review prompt scheduled in ${delay} minutes for ${cleanPhone}` });
    }

    const promptMsg = getReviewPromptMessage(name, cleanPhone, billNo);
    setReviewSession(cleanPhone, {
        customerName: name,
        billNo: billNo || '',
        step: 'waiting_rating'
    });

    if (!isClientReady || !client) {
        queueNpsSurvey(cleanPhone, name, billNo, 0);
        return res.json({
            success: true,
            queued: true,
            message: 'WhatsApp client connecting. Review prompt queued for immediate dispatch once online.'
        });
    }

    try {
        const result = await dispatchReviewSurvey(cleanPhone, name, billNo);
        return res.json({
            success: true,
            message: `Review prompt & checkbox poll dispatched immediately to ${cleanPhone}`,
            result
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/reviews/remind-pending', async (req, res) => {
    try {
        const sessions = loadReviewSessions();
        const pending = Object.entries(sessions).filter(([_, s]) => s.step === 'waiting_rating');

        if (pending.length === 0) {
            return res.json({ success: true, count: 0, message: 'No pending review sessions found.' });
        }

        console.log(`[REVIEW REMIND] Re-dispatching upgraded prompt to ${pending.length} pending sessions...`);
        let dispatched = 0;

        for (const [phone, sess] of pending) {
            try {
                const name = sess.customerName || 'Valued Customer';
                await dispatchReviewSurvey(phone, name, sess.billNo || '');
                dispatched++;
                // 2-second pacing between messages
                await new Promise(r => setTimeout(r, 2000));
            } catch (err) {
                console.warn(`[REVIEW REMIND ERR] Failed for ${phone}:`, err.message);
            }
        }

        res.json({
            success: true,
            count: dispatched,
            total: pending.length,
            message: `Dispatched updated review prompt with 1-tap reply options to ${dispatched}/${pending.length} customers.`
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/reviews/reset-session', (req, res) => {
    const { phone } = req.body || {};
    if (phone) clearReviewSession(phone);
    res.json({ success: true, message: `Review session cleared for ${phone || 'all'}` });
});

// --- EXPERIMENTAL: OPTION 3 (WHATSAPP BUTTONS & LIST PICKERS) ---
app.post('/api/test-interactive', async (req, res) => {
    const { phone, type = 'buttons' } = req.body || {};
    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) {
        return res.status(400).json({ error: 'Valid 10-digit phone number is required.' });
    }
    if (!isClientReady || !client) {
        return res.status(503).json({ error: 'WhatsApp client is not ready.' });
    }
    const chatId = `91${cleanPhone}@c.us`;

    try {
        if (type === 'list') {
            const { List } = require('whatsapp-web.js');
            const sections = [{
                title: 'Rate Your Visit',
                rows: [
                    { id: 'rate_5', title: '⭐⭐⭐⭐⭐ 5 - Excellent', description: 'Everything was great' },
                    { id: 'rate_4', title: '⭐⭐⭐⭐ 4 - Good', description: 'Good experience' },
                    { id: 'rate_3', title: '⭐⭐⭐ 3 - Fair', description: 'Average visit' },
                    { id: 'rate_2', title: '⭐⭐ 2 - Poor', description: 'Needs improvement' },
                    { id: 'rate_1', title: '⭐ 1 - Very Bad', description: 'Unhappy with service' }
                ]
            }];
            const list = new List(
                'How was your shopping experience at Cobb Apparels (Pundri)?',
                'Choose Rating',
                sections,
                'Cobb Apparels (Pundri)',
                'Tap to open choices'
            );
            const sent = await client.sendMessage(chatId, list);
            return res.json({ success: true, type: 'list', messageId: sent.id?._serialized });
        } else {
            const { Buttons } = require('whatsapp-web.js');
            const buttons = new Buttons(
                'How was your shopping experience at Cobb Apparels (Pundri)?',
                [
                    { body: '⭐⭐⭐⭐⭐ 5 Stars' },
                    { body: '⭐⭐⭐⭐ 4 Stars' },
                    { body: '💬 1-3 Stars / Feedback' }
                ],
                'Cobb Apparels (Pundri)',
                'Tap a button below'
            );
            const sent = await client.sendMessage(chatId, buttons);
            return res.json({ success: true, type: 'buttons', messageId: sent.id?._serialized });
        }
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message,
            stack: err.stack,
            note: 'Meta WhatsApp Web server-side protocol restriction: Buttons and List menus are blocked on unofficial WhatsApp Web protocol by Meta. They require the Official Meta WhatsApp Cloud API.'
        });
    }
});

// --- NPS QUEUE INSPECTION & MANUAL TRIGGER ENDPOINTS ---
app.get('/nps-status', (req, res) => {
    const queue = loadNpsQueue();
    const pending = queue.filter(q => q.status === 'pending');
    const sent = queue.filter(q => q.status === 'sent');
    res.json({
        success: true,
        pendingCount: pending.length,
        sentCount: sent.length,
        queue: queue.slice(-25)
    });
});

app.post('/nps-schedule', (req, res) => {
    const { phone, customerName, billNo, delayMinutes } = req.body || {};
    queueNpsSurvey(phone, customerName, billNo, delayMinutes || 30);
    res.json({ success: true, message: 'NPS Survey scheduled' });
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
