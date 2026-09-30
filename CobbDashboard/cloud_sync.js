const fs = require('fs');
const path = require('path');
const net = require('net');
const os = require('os');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const axios = require("axios");
require('dotenv').config();

// Ensure only one instance of cloud_sync runs in the background
// Self-healing: if port is held by a ghost/zombie process, kill it and take over
const SYNC_LOCK_PORT = 51234;

function tryKillPortOwner(port) {
    try {
        // Use netstat to find and kill the PID holding our lock port
        const { execSync } = require('child_process');
        const out = execSync(
            `netstat -ano | findstr "127.0.0.1:${port} " 2>nul`,
            { encoding: 'utf8', timeout: 3000 }
        ).trim();
        const lines = out.split('\n').filter(l => l.includes('LISTENING'));
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== String(process.pid) && /^\d+$/.test(pid)) {
                console.log(`[SYNC AGENT] 🔧 Killing stale ghost process (PID ${pid}) holding lock port ${port}...`);
                execSync(`taskkill /PID ${pid} /F 2>nul`, { timeout: 3000 });
                return true;
            }
        }
    } catch (e) {
        // Ignore errors from netstat/taskkill
    }
    return false;
}

function acquireLockAndStart(attempt = 1) {
    const lockServer = net.createServer();
    lockServer.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            if (attempt === 1) {
                // First attempt: probe if the port owner is actually alive
                const probe = net.connect({ port: SYNC_LOCK_PORT, host: '127.0.0.1' });
                probe.setTimeout(800);
                const cleanup = () => {
                    try { probe.destroy(); } catch (e) {}
                };
                probe.on('connect', () => {
                    // Port is held by a genuinely live process — this is a real duplicate
                    cleanup();
                    console.log('[SYNC AGENT] Another instance of cloud_sync is already running in background. Exiting duplicate process.');
                    process.exit(0);
                });
                probe.on('timeout', () => {
                    // Port held but no one answered — ghost process
                    cleanup();
                    console.log('[SYNC AGENT] ⚠️  Stale lock port detected (no response). Clearing ghost process and retaking lock...');
                    tryKillPortOwner(SYNC_LOCK_PORT);
                    setTimeout(() => acquireLockAndStart(2), 800);
                });
                probe.on('error', () => {
                    // Connection refused / error — also a ghost
                    cleanup();
                    console.log('[SYNC AGENT] ⚠️  Stale lock port detected (connection refused). Clearing ghost process and retaking lock...');
                    tryKillPortOwner(SYNC_LOCK_PORT);
                    setTimeout(() => acquireLockAndStart(2), 800);
                });
            } else {
                // Second attempt still failed — give up
                console.log('[SYNC AGENT] Another instance of cloud_sync is already running in background. Exiting duplicate process.');
                process.exit(0);
            }
        }
    });
    lockServer.listen(SYNC_LOCK_PORT, '127.0.0.1', () => {
        startSyncAgent();
    });
}

acquireLockAndStart();

// The user will save their private key to firebase-admin.json locally for maximum security.
let serviceAccount;
try {
  serviceAccount = require('./firebase-admin.json');
} catch (e) {
  console.log("Waiting for firebase-admin.json configuration file...");
}

let app;
let db = null;
let messaging = null;

if (serviceAccount) {
    try {
        app = initializeApp({
            credential: cert(serviceAccount)
        });
        db = getFirestore(app);
        console.log("[SYNC AGENT] Firebase Admin initialized successfully.");
        try {
            messaging = getMessaging(app);
            console.log("[SYNC AGENT] 📲 Firebase Cloud Messaging (FCM) initialized.");
        } catch (msgErr) {
            console.warn("[SYNC AGENT] FCM Messaging initialization warning:", msgErr.message);
        }
    } catch(err) {
        console.error("[SYNC AGENT] Firebase init error:", err);
    }
}
const STORE_ID = process.env.STORE_ID || "DEMO_STORE_001";
const LOCAL_API = process.env.LOCAL_API || `http://localhost:${process.env.PORT || 5000}`;

// --- STORE OWNER WHATSAPP NOTIFICATION CONFIGURATION ---
const OWNER_WHATSAPP_NUMBERS = (process.env.OWNER_WHATSAPP_NUMBERS
    ? process.env.OWNER_WHATSAPP_NUMBERS.split(',').map(s => s.trim()).filter(Boolean)
    : ['9138122820', '8708788707', '9034522000', '9466422821']);
const WHATSAPP_GATEWAY_URL = process.env.WHATSAPP_GATEWAY_URL || 'http://localhost:3000/send';

async function sendWhatsAppToOwners(message, tag = 'ALERT', targetNumbers = null) {
    const recipients = targetNumbers || OWNER_WHATSAPP_NUMBERS;
    if (!recipients || recipients.length === 0) return;
    for (const phone of recipients) {
        try {
            await axios.post(WHATSAPP_GATEWAY_URL, {
                number: phone,
                message: message
            }, { timeout: 8000 });
            console.log(`[SYNC AGENT] 📲 WhatsApp [${tag}] dispatched to ${phone}`);
        } catch (err) {
            console.warn(`[SYNC AGENT] WhatsApp dispatch to ${phone} note:`, err.response?.data?.error || err.message);
        }
    }
}

// --- SMART TIERED SYNC ENDPOINTS ---
// Tier 1: Real-Time Operational Data (Every 2 minutes)
// Key daily numbers that need frequent updates for store owner visibility
const operationalEndpoints = [
    "/api/sales/overview",
    { url: "/api/sales/live?days=7", docName: "sales_live" },
    "/api/sales/daily-month",
    "/api/analytics/hourly",
    "/api/reconciliation/latest",
    "/api/gateway/status",
    "/api/system/health",
    { url: "/api/sales/cancelled?limit=15", docName: "sales_cancelled" },
    "/api/alterations",
    "/api/parcels/transit"
];

// Tier 2: Standard Daily Operations (Every 15 minutes)
// Data that shifts occasionally throughout the business day
const standardEndpoints = [
    { url: "/api/sales/history?days=30&limit=300", docName: "sales_history" },
    "/api/analytics/top-movers",
    "/api/sales/returns",
    "/api/automation/status",
    "/api/broadcast/status",
    "/api/crm/anniversaries-today",
    { url: "/api/staff/leaderboard?period=bundle", docName: "staff_leaderboard" },
    "/api/staff/config",
    { url: "/api/inventory/broken-sizes", docName: "inventory_broken-sizes" }
];

// Tier 3: Deep Analytics & Heavy Catalog (Every 60 minutes)
// Heavy tables that place high load on SQL/disk (inventory, taxes, profiles)
const deepAnalyticsEndpoints = [
    "/api/inventory",
    "/api/inventory/dead-stock",
    "/api/inventory/size-matrix",
    "/api/financials/gst-summary",
    "/api/financials/pnl",
    "/api/analytics/monthly-products",
    "/api/customers/vip",
    "/api/customers/dormant",
    "/api/analytics/retention-radar",
    "/api/analytics/wardrobe-profiles",
    "/api/broadcast/group",
    "/api/smart-bundles",
    { url: "/api/inventory/depreciation-clock", docName: "inventory_depreciation-clock" },
    { url: "/api/ai/demand-forecasts", method: "POST", data: { refresh: true } }
];

const lastPayloadHash = new Map();

async function syncEndpointList(items, tierName = 'Sync') {
    if (!db) {
        console.log(`[SYNC AGENT] Firebase not configured yet. Skipping ${tierName}.`);
        return;
    }

    console.log(`\n[SYNC AGENT] ⚡ Starting [${tierName}] for Store: ${STORE_ID} (${items.length} endpoints) at ${new Date().toLocaleTimeString()}`);
    
    for (const item of items) {
        // Support both string URL and object config
        const url = typeof item === 'string' ? item : item.url;
        const method = (typeof item === 'object' && item.method) ? item.method : 'GET';
        const dataConfig = typeof item === 'string' ? {} : (item.data || {});
        
        // Match the frontend SaaS Interceptor naming convention exactly!
        const docName = item.docName || url.split('?')[0].replace('/api/', '').replace(/\//g, '_');

        try {
            let response;
            const axiosConfig = { timeout: 45000 };
            if (method === "GET") {
                response = await axios.get(`${LOCAL_API}${url}`, axiosConfig);
            } else if (method === "POST") {
                response = await axios.post(`${LOCAL_API}${url}`, dataConfig, axiosConfig);
            }

            if (response && response.data) {
                // Deduplicate: Don't write to Firestore if the content is identical to last sync
                const jsonStr = JSON.stringify(response.data);
                if (lastPayloadHash.get(docName) === jsonStr) {
                    continue; // Skip write, saves Firestore quota & network!
                }

                // Ensure data is an object before pushing (if it's an array, wrap it)
                const payload = Array.isArray(response.data) ? { items: response.data } : response.data;
                payload.lastUpdated = FieldValue.serverTimestamp();

                await db.collection("stores").doc(STORE_ID).collection("data").doc(docName).set(payload, { merge: true });
                lastPayloadHash.set(docName, jsonStr);
                console.log(`[SYNC AGENT] ✅ [${tierName}] Synced ${docName}`);
            }
        } catch (err) {
            console.error(`[SYNC AGENT] ❌ [${tierName}] Failed to sync ${docName}: ${err.message}`);
        }
    }
}

// --- FAST REAL-TIME CHECKOUT PUSH ALERTS ---
const knownBillIds = new Set();
let isFirstLiveBillsRun = true;

async function checkAndDispatchCheckoutAlerts() {
    if (!db) return;
    try {
        const response = await axios.get(`${LOCAL_API}/api/sales/live?limit=15`, { timeout: 10000 });
        const bills = Array.isArray(response.data) ? response.data : [];

        if (isFirstLiveBillsRun) {
            isFirstLiveBillsRun = false;
            const now = Date.now();
            bills.forEach(b => {
                const id = String(b.BillId || b.BillNumber).trim();
                let billTimeMillis = 0;
                if (b.BillTime) billTimeMillis = new Date(b.BillTime).getTime();
                else if (b.BillDate) billTimeMillis = new Date(b.BillDate).getTime();

                // Only seed as historical if it is older than 5 minutes
                if (billTimeMillis && (now - billTimeMillis > 5 * 60 * 1000)) {
                    if (id) knownBillIds.add(id);
                }
            });
            console.log(`[SYNC AGENT] 🔔 Checkout alert engine armed with ${knownBillIds.size} historical baseline bills.`);
        }

        if (bills.length === 0) return;

        // Process newly detected bills in chronological order
        const newBills = [];
        for (let i = bills.length - 1; i >= 0; i--) {
            const b = bills[i];
            const id = String(b.BillId || b.BillNumber).trim();
            if (id && !knownBillIds.has(id)) {
                knownBillIds.add(id);
                newBills.push(b);
            }
        }

        if (newBills.length === 0) return;

        // Invalidate backend sales cache so overview stats refresh immediately
        try {
            await axios.post(`${LOCAL_API}/api/cache/invalidate-sales`, {}, { timeout: 3000 });
        } catch (cacheErr) {}

        // Fetch registered FCM device tokens for this store
        let fcmTokens = [];
        try {
            const tokenSnap = await db.collection("stores").doc(STORE_ID).collection("fcm_tokens").get();
            tokenSnap.forEach(docSnap => {
                const data = docSnap.data();
                const tok = data?.token || docSnap.id;
                if (tok && typeof tok === 'string' && tok.length > 20) {
                    fcmTokens.push({ id: docSnap.id, token: tok });
                }
            });
        } catch (tokErr) {
            console.warn("[SYNC AGENT] Could not read fcm_tokens:", tokErr.message);
        }

        for (const bill of newBills) {
            const amount = Math.round(Number(bill.Amount || bill.NET_AMOUNT || 0));
            const billNo = String(bill.BillNumber || bill.CM_NO || 'N/A').trim();
            const qty = Number(bill.TotalQty) || (Array.isArray(bill.Items) ? bill.Items.reduce((s, it) => s + (Number(it.Quantity) || 1), 0) : 1);

            // Payment Mode
            let pay = bill.PaymentMode || 'Cash';
            if (bill.UpiAmount > 0 && bill.CashAmount === 0 && bill.CardAmount === 0) pay = 'UPI';
            else if (bill.CardAmount > 0 && bill.CashAmount === 0 && bill.UpiAmount === 0) pay = 'Card';
            else if (bill.CashAmount > 0 && (bill.UpiAmount > 0 || bill.CardAmount > 0)) pay = 'Split';
            else if (bill.CashAmount > 0) pay = 'Cash';

            // Staff & Customer
            const staff = (bill.Salesperson && bill.Salesperson !== 'Staff')
                ? bill.Salesperson
                : (bill.Items && bill.Items[0]?.Salesperson && bill.Items[0]?.Salesperson !== 'Staff' ? bill.Items[0].Salesperson : 'Staff');
            const custName = (bill.CustomerName || bill.FirstName || '').trim();
            const custPhone = (bill.Phone || '').trim();
            let custDisplay = 'Walk-in';
            if (custName && custPhone) custDisplay = `${custName} (${custPhone})`;
            else if (custName) custDisplay = custName;
            else if (custPhone) custDisplay = `Cust (${custPhone})`;

            const discountAmt = Math.round(Number(bill.DiscountAmount || 0));
            const grossAmt = Math.round(Number(bill.GrossAmount || (amount + discountAmt)));
            const discountPct = Number(bill.DiscountPercent) || (grossAmt > 0 ? Math.round((discountAmt / grossAmt) * 100) : 0);

            // Item names summary
            let itemSummary = '';
            if (Array.isArray(bill.Items) && bill.Items.length > 0) {
                const rawNames = bill.Items.map(it => {
                    const name = String(it.ArticleName || it.Category || 'Item').trim();
                    return name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                });
                const uniqueNames = [...new Set(rawNames)];
                if (uniqueNames.length <= 3) {
                    itemSummary = uniqueNames.join(', ');
                } else {
                    itemSummary = `${uniqueNames.slice(0, 2).join(', ')} +${uniqueNames.length - 2} more`;
                }
            } else {
                itemSummary = `${qty} items`;
            }

            // Payment & Financial line
            let paySummary = `Pay: ${pay} | Gross: ₹${grossAmt.toLocaleString('en-IN')}`;
            if (discountAmt > 0) {
                paySummary += ` | Disc: ₹${discountAmt.toLocaleString('en-IN')} (${discountPct}% OFF)`;
            } else {
                paySummary += ` (No Disc)`;
            }

            // Categorize Alert:
            // 1. Heavy Discount Warning (Fraud / Revenue Leakage Prevention)
            // 2. VIP Mega Sale Alert (High Value Purchase)
            // 3. Regular New Sale
            let alertType = 'sale';
            let title = `🧾 New Sale: ₹${amount.toLocaleString('en-IN')} | Bill #${billNo}`;
            let body = `🛍️ ${qty} Items: ${itemSummary}\n💳 ${paySummary}\n👤 Customer: ${custDisplay} • Staff: ${staff}`;
            let tag = `cobb-sale-${billNo}`;

            if ((discountPct >= 35 && discountAmt >= 1000) || discountAmt >= 2500) {
                alertType = 'heavy_discount';
                title = `⚠️ HEAVY DISCOUNT (${discountPct}% OFF) | Bill #${billNo}`;
                body = `⚠️ Staff: ${staff} gave ₹${discountAmt.toLocaleString('en-IN')} (${discountPct}%) discount!\n🛍️ ${qty} Items: ${itemSummary}\n💳 ${paySummary}\n👤 Customer: ${custDisplay}`;
                tag = `cobb-discount-${billNo}`;
            } else if (amount >= 10000) {
                alertType = 'big_ticket_sale';
                title = `💎 VIP MEGA SALE: ₹${amount.toLocaleString('en-IN')} | Bill #${billNo}`;
                body = `🎉 VIP Purchase (${qty} Items: ${itemSummary})\n💳 ${paySummary}\n👤 Customer: ${custDisplay} • Staff: ${staff}`;
                tag = `cobb-vip-${billNo}`;
            }

            const clickUrl = `/?tab=livebills&bill=${encodeURIComponent(billNo)}`;

            const notificationPayload = {
                billId: String(bill.BillId || billNo),
                billNumber: billNo,
                type: alertType,
                amount,
                grossAmount: grossAmt,
                discountAmount: discountAmt,
                discountPercent: discountPct,
                qty,
                paymentMode: pay,
                salesperson: staff,
                customer: custDisplay,
                title,
                body,
                url: clickUrl,
                timestamp: FieldValue.serverTimestamp(),
                createdAt: Date.now()
            };

            // 1. Write to Firestore checkout_notifications (triggers real-time onSnapshot in cobb-ui)
            await db.collection("stores").doc(STORE_ID).collection("checkout_notifications").doc(String(bill.BillId || billNo)).set(notificationPayload);
            console.log(`[SYNC AGENT] 📢 New Checkout Alert written to Firestore [${alertType}]: ${title}`);

            // 2. Dispatch FCM Web Push to registered devices
            if (messaging && fcmTokens.length > 0) {
                const rawTokens = fcmTokens.map(t => t.token);
                try {
                    const pushRes = await messaging.sendEachForMulticast({
                        tokens: rawTokens,
                        notification: {
                            title: title,
                            body: body
                        },
                        data: {
                            type: alertType,
                            title: title,
                            body: body,
                            billNumber: billNo,
                            billId: String(bill.BillId || ''),
                            amount: String(amount),
                            discountAmount: String(discountAmt),
                            discountPercent: String(discountPct),
                            url: clickUrl
                        },
                        webpush: {
                            headers: {
                                Urgency: 'high'
                            },
                            fcmOptions: {
                                link: clickUrl
                            },
                            notification: {
                                title: title,
                                body: body,
                                icon: '/ors-logo.png',
                                badge: '/ors-logo.png',
                                tag: tag,
                                requireInteraction: 'true'
                            }
                        }
                    });

                    console.log(`[SYNC AGENT] 📲 FCM Push sent to ${rawTokens.length} devices (Success: ${pushRes.successCount}, Fail: ${pushRes.failureCount})`);

                    // Clean up unregistered tokens
                    if (pushRes.failureCount > 0) {
                        pushRes.responses.forEach(async (resp, idx) => {
                            if (!resp.success) {
                                const errCode = resp.error?.code;
                                if (errCode === 'messaging/registration-token-not-registered' || errCode === 'messaging/invalid-argument') {
                                    const staleId = fcmTokens[idx].id;
                                    try {
                                        await db.collection("stores").doc(STORE_ID).collection("fcm_tokens").doc(staleId).delete();
                                        console.log(`[SYNC AGENT] 🧹 Removed stale FCM token: ${staleId}`);
                                    } catch (e) {}
                                }
                            }
                        });
                    }
                } catch (pushErr) {
                    console.error("[SYNC AGENT] FCM multicast error:", pushErr.message);
                }
            }

            // 3. Dispatch real-time WhatsApp alert to all 4 store owners
            const waCheckoutText = 
                `🧾 *NEW SALE RECORDED* — *Cobb Pundri*\n` +
                `──────────────────────\n` +
                `🔢 *Bill No:* #${billNo}\n` +
                `💰 *Net Amount:* ₹${amount.toLocaleString('en-IN')} (${qty} item${qty > 1 ? 's' : ''})\n` +
                (discountAmt > 0 ? `🏷️ *Gross / Disc:* ₹${grossAmt.toLocaleString('en-IN')} (Saved ₹${discountAmt.toLocaleString('en-IN')} • ${discountPct}% off)\n` : '') +
                `👤 *Customer:* ${custDisplay}\n` +
                `👔 *Salesperson:* ${staff}\n` +
                `💳 *Payment:* ${pay}\n` +
                `🕒 *Time:* ${formatTimeAMPM(new Date())}\n` +
                `──────────────────────\n` +
                `👉 *Phone Link:* https://cobb-store.web.app${clickUrl}`;

            sendWhatsAppToOwners(waCheckoutText, `Checkout #${billNo}`).catch(() => {});
        }
    } catch (err) {
        // Silently skip if local server is busy or momentarily reloading
    }
}

// --- FAST REAL-TIME CANCELLED / VOID BILL ALERTS (FRAUD PREVENTION) ---
const knownCancelledBillIds = new Set();
let isFirstCancelledBillsRun = true;

async function checkAndDispatchCancelledBillAlerts() {
    if (!db) return;
    try {
        const response = await axios.get(`${LOCAL_API}/api/sales/cancelled?limit=10`, { timeout: 10000 });
        const cancelledBills = Array.isArray(response.data) ? response.data : [];
        if (isFirstCancelledBillsRun) {
            isFirstCancelledBillsRun = false;
            cancelledBills.forEach(b => {
                const id = String(b.BillId || b.BillNumber).trim();
                if (id) knownCancelledBillIds.add(id);
            });
        }

        if (cancelledBills.length === 0) return;

        const newlyCancelled = [];
        for (let i = cancelledBills.length - 1; i >= 0; i--) {
            const b = cancelledBills[i];
            const id = String(b.BillId || b.BillNumber).trim();
            if (id && !knownCancelledBillIds.has(id)) {
                knownCancelledBillIds.add(id);
                newlyCancelled.push(b);
            }
        }

        if (newlyCancelled.length === 0) return;

        let fcmTokens = [];
        try {
            const tokenSnap = await db.collection("stores").doc(STORE_ID).collection("fcm_tokens").get();
            tokenSnap.forEach(docSnap => {
                const tok = docSnap.data()?.token || docSnap.id;
                if (tok && typeof tok === 'string' && tok.length > 20) {
                    fcmTokens.push({ id: docSnap.id, token: tok });
                }
            });
        } catch (e) {}

        for (const bill of newlyCancelled) {
            const amount = Math.round(Number(bill.Amount || bill.NET_AMOUNT || 0));
            const billNo = String(bill.BillNumber || bill.CM_NO || 'N/A').trim();
            const staff = bill.Salesperson || 'Counter Staff';
            const cust = bill.CustomerName && bill.CustomerName.trim() ? bill.CustomerName.trim() : (bill.Phone ? `Cust (${bill.Phone})` : 'Walk-in');

            const title = `🚫 BILL CANCELLED / VOIDED: ₹${amount.toLocaleString('en-IN')} | Bill #${billNo}`;
            const body = `⚠️ Warning: Bill #${billNo} worth ₹${amount.toLocaleString('en-IN')} was cancelled at POS counter!`;
            const alertId = `cancelled_${bill.BillId || billNo}_${Date.now()}`;

            const payload = {
                billId: alertId,
                billNumber: billNo,
                type: 'cancelled_bill',
                amount,
                salesperson: staff,
                customer: cust,
                title,
                body,
                url: '/?tab=livebills',
                createdAt: Date.now(),
                timestamp: FieldValue.serverTimestamp()
            };

            await db.collection("stores").doc(STORE_ID).collection("checkout_notifications").doc(alertId).set(payload);
            console.log(`[SYNC AGENT] 📢 Cancelled Bill Alert written to Firestore: ${title}`);

            if (messaging && fcmTokens.length > 0) {
                const rawTokens = fcmTokens.map(t => t.token);
                await messaging.sendEachForMulticast({
                    tokens: rawTokens,
                    notification: { title, body },
                    data: {
                        type: 'cancelled_bill',
                        title,
                        body,
                        billNumber: billNo,
                        amount: String(amount),
                        url: '/?tab=livebills'
                    },
                    webpush: {
                        fcmOptions: { link: '/?tab=livebills' },
                        notification: {
                            title,
                            body,
                            icon: '/ors-logo.png',
                            badge: '/favicon.svg',
                            tag: `cobb-cancelled-${billNo}`
                        }
                    }
                }).catch(e => console.warn('[SYNC AGENT] Cancelled bill FCM push notice:', e.message));
            }

            // Dispatch WhatsApp cancelled bill alert to 4 store owners
            const waCancelledText = 
                `⚠️ *CANCELLED BILL ALERT* — *Cobb Pundri*\n` +
                `──────────────────────\n` +
                `🔢 *Bill No:* #${billNo}\n` +
                `💰 *Amount:* ₹${amount.toLocaleString('en-IN')}\n` +
                `👤 *Customer:* ${cust}\n` +
                `👔 *Salesperson:* ${staff}\n` +
                `🕒 *Time:* ${formatTimeAMPM(new Date())}\n` +
                `──────────────────────\n` +
                `_Alert: This bill was cancelled at the counter._`;

            sendWhatsAppToOwners(waCancelledText, `Cancelled #${billNo}`).catch(() => {});
        }
    } catch (err) {
        // Silently skip if endpoint momentarily busy
    }
}

// --- AUTOMATED EOD (END OF DAY) STORE DIGEST DISPATCHER ---
let lastDispatchedEodDate = '';

async function dispatchEodDigestAlert(isScheduled = false) {
    return; // Disabled per user request
    if (!db) return;
    const todayStr = new Date().toISOString().split('T')[0];
    if (isScheduled && lastDispatchedEodDate === todayStr) {
        return; // Don't send duplicate on same day
    }

    try {
        const response = await axios.get(`${LOCAL_API}/api/reports/eod-summary`, { timeout: 15000 });
        const report = response.data;
        if (!report || !report.summary) return;

        const { grossSales, billCount, cash, upi, card, netExpectedDrawerCash, topCategory } = report.summary;
        const now = new Date();
        const timeStr = formatTimeAMPM(now);
        const dateStr = formatDateString(now);

        const title = `📊 Daily Store Closing Digest: ₹${Number(grossSales || 0).toLocaleString('en-IN')}`;
        const body = `Total: ₹${Number(grossSales || 0).toLocaleString('en-IN')} (${billCount} Bills) • Cash: ₹${Number(cash || 0).toLocaleString('en-IN')} • Drawer: ₹${Number(netExpectedDrawerCash || 0).toLocaleString('en-IN')} • UPI: ₹${Number(upi || 0).toLocaleString('en-IN')} • Top: ${topCategory || 'Apparel'}`;
        const alertId = `eod_${todayStr}_${Date.now()}`;

        const payload = {
            billId: alertId,
            type: 'eod_summary',
            title,
            body,
            summary: report.summary,
            text: report.text,
            date: dateStr,
            time: timeStr,
            url: '/?tab=dashboard&view=eod',
            createdAt: Date.now(),
            timestamp: FieldValue.serverTimestamp()
        };

        // 1. Save detailed report doc
        await db.collection("stores").doc(STORE_ID).collection("data").doc("reports_eod-summary").set({
            ...report,
            lastDispatchedAt: FieldValue.serverTimestamp(),
            lastDispatchedDate: todayStr
        }, { merge: true });

        await db.collection("stores").doc(STORE_ID).collection("data").doc("eod_summary").set({
            ...report,
            lastDispatchedAt: FieldValue.serverTimestamp(),
            lastDispatchedDate: todayStr
        }, { merge: true });

        // 2. Add notification toast for connected phones
        await db.collection("stores").doc(STORE_ID).collection("checkout_notifications").doc(alertId).set(payload);
        console.log(`[SYNC AGENT] 📢 Automated EOD Digest written to Firestore: ${title}`);
        lastDispatchedEodDate = todayStr;

        // 3. Dispatch native FCM push notification to registered phones
        if (messaging) {
            const tokenSnap = await db.collection("stores").doc(STORE_ID).collection("fcm_tokens").get().catch(() => null);
            if (tokenSnap && !tokenSnap.empty) {
                const rawTokens = tokenSnap.docs.map(d => d.data().token).filter(Boolean);
                if (rawTokens.length > 0) {
                    await messaging.sendEachForMulticast({
                        tokens: rawTokens,
                        notification: { title, body },
                        data: {
                            type: 'eod_summary',
                            title,
                            body,
                            url: '/?tab=dashboard&view=eod'
                        },
                        webpush: {
                            fcmOptions: { link: '/?tab=dashboard&view=eod' },
                            notification: {
                                title,
                                body,
                                icon: '/ors-logo.png',
                                badge: '/favicon.svg',
                                tag: `cobb-eod-${todayStr}`
                            }
                        }
                    }).catch(e => console.warn('[SYNC AGENT] EOD FCM push notice:', e.message));
                }
            }
        }
    } catch (err) {
        console.error('[SYNC AGENT] Failed to dispatch automated EOD digest:', err.message);
    }
}

// Format 12-hour time for alerts (e.g. 10:15 AM)
function formatTimeAMPM(d = new Date()) {
    try {
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
        return d.toTimeString().slice(0, 5);
    }
}

function formatDateString(d = new Date()) {
    try {
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return d.toISOString().split('T')[0];
    }
}

// --- SYSTEM ON / OFF ALERT DISPATCHER ---
async function dispatchSystemStatusAlert(status, reason = '') {
    if (!db) return;
    const now = new Date();
    const timeStr = formatTimeAMPM(now);
    const dateStr = formatDateString(now);
    const isOnline = status === 'online';

    const title = isOnline 
        ? `🟢 Store System Online | ${timeStr}`
        : `🔴 Store System Turned OFF | ${timeStr}`;
    const body = isOnline
        ? `Cobb Pundri POS booted up on ${dateStr} at ${timeStr}. Store system is now active.`
        : `Cobb Pundri POS shut down on ${dateStr} at ${timeStr}${reason ? ` (${reason})` : ''}. Store system is now closed.`;

    const alertId = `sys_${status}_${Date.now()}`;
    const payload = {
        type: 'system_status',
        status,
        reason,
        title,
        body,
        url: '/?tab=dashboard',
        createdAt: Date.now(),
        timestamp: FieldValue.serverTimestamp()
    };

    try {
        // 1. Update system_status doc for live status & watchdog on Phone Link
        await db.collection("stores").doc(STORE_ID).collection("data").doc("system_status").set({
            status,
            isOnline,
            lastHeartbeat: FieldValue.serverTimestamp(),
            lastSeenMillis: Date.now(),
            [isOnline ? 'lastBootTime' : 'lastShutdownTime']: FieldValue.serverTimestamp(),
            [isOnline ? 'lastBootTimeFormatted' : 'lastShutdownTimeFormatted']: `${dateStr}, ${timeStr}`,
            machineName: os.hostname(),
            platform: os.platform(),
            lastStatusChange: FieldValue.serverTimestamp()
        }, { merge: true });

        // 2. Add to checkout_notifications so connected phones immediately receive chime & toast
        await db.collection("stores").doc(STORE_ID).collection("checkout_notifications").doc(alertId).set(payload);
        console.log(`[SYNC AGENT] 📢 System ${status.toUpperCase()} alert written to Firestore: ${title}`);

        // 3. Dispatch native FCM push notification to registered mobile devices
        if (messaging) {
            const tokenSnap = await db.collection("stores").doc(STORE_ID).collection("fcm_tokens").get().catch(() => null);
            if (tokenSnap && !tokenSnap.empty) {
                const rawTokens = tokenSnap.docs.map(d => d.data().token).filter(Boolean);
                if (rawTokens.length > 0) {
                    await messaging.sendEachForMulticast({
                        tokens: rawTokens,
                        notification: { title, body },
                        data: {
                            type: 'system_status',
                            status,
                            title,
                            body,
                            url: '/?tab=dashboard'
                        },
                        webpush: {
                            headers: {
                                Urgency: 'high'
                            },
                            fcmOptions: { link: '/?tab=dashboard' },
                            notification: {
                                title,
                                body,
                                icon: '/ors-logo.png',
                                badge: '/ors-logo.png',
                                tag: 'cobb-system-status',
                                requireInteraction: 'true'
                            }
                        }
                    }).catch(e => console.warn('[SYNC AGENT] System alert FCM push notice:', e.message));
                }
            }
        }

        // 4. Dispatch WhatsApp system status message to all 4 store owners
        const waStatusText = isOnline
            ? `🟢 *STORE POS IS ONLINE* — *Cobb Pundri*\n──────────────────────\n🖥️ POS Counter Computer powered ON at ${timeStr} (${dateStr}).\n⚡ Billing counter & sync agent are active and ready.`
            : `🔴 *STORE POS SHUT DOWN* — *Cobb Pundri*\n──────────────────────\n🕒 POS Counter Computer shut down at ${timeStr} (${dateStr})${reason ? ` [${reason}]` : ''}.\nStore system is now closed.`;

        sendWhatsAppToOwners(waStatusText, `System ${status.toUpperCase()}`).catch(() => {});

        // 5. If system is shutting down, trigger EOD Closing Digest automatically
        if (status === 'offline') {
            // EOD Digest disabled per user request
        }
    } catch (err) {
        console.error(`[SYNC AGENT] Error dispatching system ${status} alert:`, err.message);
    }
}

// Real-time listener for UI-triggered test alerts written to Firestore
function listenForTestAlertsAndDispatchFcm() {
    if (!db || !messaging) return;

    let isSeeded = false;
    const seenTestIds = new Set();

    console.log("[SYNC AGENT] 👂 Listening for UI test alerts to dispatch phone push notifications...");

    db.collection("stores").doc(STORE_ID).collection("checkout_notifications")
        .orderBy("createdAt", "desc")
        .limit(10)
        .onSnapshot((snapshot) => {
            if (!isSeeded) {
                // Seed existing records so previous tests are not re-sent on process restart
                snapshot.forEach(docSnap => seenTestIds.add(docSnap.id));
                isSeeded = true;
                return;
            }

            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const docSnap = change.doc;
                    const testId = docSnap.id;
                    if (seenTestIds.has(testId)) return;
                    seenTestIds.add(testId);

                    const data = docSnap.data();
                    if (!data || !data.isTest || data.fcmDispatched) return;

                    console.log(`[SYNC AGENT] 🧪 Remote UI Test Alert detected (${testId}): "${data.title}". Dispatching alerts...`);

                    try {
                        const tokenSnap = await db.collection("stores").doc(STORE_ID).collection("fcm_tokens").get();
                        const rawTokens = tokenSnap.empty ? [] : tokenSnap.docs.map(d => d.data()?.token).filter(Boolean);

                        const title = data.title || '🧾 Test Sale Alert';
                        const body = data.body || 'A new test sale has been recorded.';
                        const url = data.url || '/?tab=livebills';

                        if (rawTokens.length > 0) {
                            const pushRes = await messaging.sendEachForMulticast({
                                tokens: rawTokens,
                                notification: {
                                    title,
                                    body
                                },
                                data: {
                                    type: data.type || 'sale',
                                    title,
                                    body,
                                    url,
                                    billNumber: String(data.billNumber || testId)
                                },
                                webpush: {
                                    headers: {
                                        Urgency: 'high'
                                    },
                                    fcmOptions: { link: url },
                                    notification: {
                                        title,
                                        body,
                                        icon: '/ors-logo.png',
                                        badge: '/ors-logo.png',
                                        tag: `cobb-test-${testId}`,
                                        requireInteraction: 'true'
                                    }
                                }
                            });
                            console.log(`[SYNC AGENT] 📲 FCM Test Alert dispatched: ${pushRes.successCount} succeeded, ${pushRes.failureCount} failed.`);
                        }

                        // Also dispatch test to WhatsApp if requested (or to test number)
                        const testPhone = data.testPhone || '8708788707';
                        const waTestMsg = `🔔 *Cobb Pundri POS Alert Test*\n──────────────────────\n📌 *Title:* ${title}\n💬 *Details:* ${body}\n🔗 *Link:* https://cobb-store.web.app${url}\n🕒 *Time:* ${formatTimeAMPM(new Date())}`;
                        sendWhatsAppToOwners(waTestMsg, 'TEST', [testPhone]).catch(() => {});

                        await docSnap.ref.update({ fcmDispatched: true }).catch(() => {});
                    } catch (err) {
                        console.error('[SYNC AGENT] Error dispatching test alert FCM:', err.message);
                    }
                }
            });
        }, (err) => {
            console.warn('[SYNC AGENT] Test alerts listener notice:', err.message);
        });
}

// Periodic heartbeat pulse so Phone Link Watchdog can detect power cuts / crashes within 2 minutes
async function updateHeartbeat() {
    if (!db) return;
    try {
        await db.collection("stores").doc(STORE_ID).collection("data").doc("system_status").set({
            status: 'online',
            isOnline: true,
            lastHeartbeat: FieldValue.serverTimestamp(),
            lastSeenMillis: Date.now(),
            machineName: os.hostname()
        }, { merge: true });
    } catch (e) {
        // Silently skip if network blip
    }
}

// Graceful termination & shutdown handlers
const SHUTDOWN_SENTINEL_PATH = path.join(__dirname, '.shutdown_pending.json');
let isShuttingDown = false;

async function handleGracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[SYNC AGENT] Clean shutdown signal (${signal}) received. Dispatching System OFF alert...`);

    // STEP 1: Write sentinel file SYNCHRONOUSLY (0ms, survives even if process is killed 1ms later)
    // On next boot, checkAndDispatchPcBootAlert will read this and send the missed shutdown alert.
    try {
        const now = new Date();
        fs.writeFileSync(SHUTDOWN_SENTINEL_PATH, JSON.stringify({
            signal,
            shutdownAt: now.toISOString(),
            shutdownAtMs: Date.now(),
            timeStr: formatTimeAMPM(now),
            dateStr: formatDateString(now)
        }));
        console.log('[SYNC AGENT] ✅ Shutdown sentinel written (guaranteed delivery on next boot).');
    } catch (e) {
        console.warn('[SYNC AGENT] Could not write shutdown sentinel:', e.message);
    }

    // STEP 2: Attempt async Firestore/FCM write in parallel (best-effort — may be killed by OS)
    // Skip EOD digest on shutdown to save time for the critical status write
    try {
        const now = new Date();
        const timeStr = formatTimeAMPM(now);
        const dateStr = formatDateString(now);
        const isOnline = false;
        const title = `🔴 Store System Turned OFF | ${timeStr}`;
        const body = `Cobb Pundri POS shut down on ${dateStr} at ${timeStr} (${signal}). Store system is now closed.`;
        const alertId = `sys_offline_${Date.now()}`;
        const payload = {
            type: 'system_status', status: 'offline', reason: signal,
            title, body, url: '/?tab=dashboard',
            createdAt: Date.now(), timestamp: FieldValue.serverTimestamp()
        };

        // Race: complete as much as possible within 4 seconds before process.exit
        await Promise.race([
            (async () => {
                if (db) {
                    await db.collection('stores').doc(STORE_ID).collection('data').doc('system_status').set({
                        status: 'offline', isOnline: false,
                        lastHeartbeat: FieldValue.serverTimestamp(),
                        lastSeenMillis: Date.now(),
                        lastShutdownTime: FieldValue.serverTimestamp(),
                        lastShutdownTimeFormatted: `${dateStr}, ${timeStr}`,
                        machineName: os.hostname(), platform: os.platform(),
                        lastStatusChange: FieldValue.serverTimestamp()
                    }, { merge: true });
                    await db.collection('stores').doc(STORE_ID).collection('checkout_notifications').doc(alertId).set(payload);
                    console.log('[SYNC AGENT] ✅ Shutdown alert written to Firestore.');

                    // Dispatch FCM Push to phones before exiting
                    if (messaging) {
                        try {
                            const tokenSnap = await db.collection("stores").doc(STORE_ID).collection("fcm_tokens").get();
                            const rawTokens = tokenSnap.empty ? [] : tokenSnap.docs.map(d => d.data()?.token).filter(Boolean);
                            if (rawTokens.length > 0) {
                                await messaging.sendEachForMulticast({
                                    tokens: rawTokens,
                                    notification: { title, body },
                                    data: {
                                        type: 'system_status',
                                        status: 'offline',
                                        title,
                                        body,
                                        url: '/?tab=dashboard'
                                    },
                                    webpush: {
                                        headers: { Urgency: 'high' },
                                        fcmOptions: { link: '/?tab=dashboard' },
                                        notification: {
                                            title,
                                            body,
                                            icon: '/ors-logo.png',
                                            badge: '/ors-logo.png',
                                            tag: 'cobb-system-status',
                                            requireInteraction: 'true'
                                        }
                                    }
                                });
                                console.log('[SYNC AGENT] 📲 Shutdown FCM push sent to phones.');
                            }
                        } catch (fcmErr) {
                            console.warn('[SYNC AGENT] Shutdown FCM note:', fcmErr.message);
                        }
                    }

                    // Dispatch WhatsApp Shutdown Alert to all 4 store owners
                    const waShutdownText = 
                        `🔴 *STORE POS SHUT DOWN* — *Cobb Pundri*\n` +
                        `──────────────────────\n` +
                        `🕒 POS Counter Computer shut down on ${dateStr} at ${timeStr} (${signal}).\n` +
                        `Store system is now closed.`;
                    await sendWhatsAppToOwners(waShutdownText, 'Shutdown');
                }
            })(),
            new Promise(resolve => setTimeout(resolve, 4000))
        ]);
    } catch (e) {
        console.warn('[SYNC AGENT] Shutdown Firestore write note (sentinel is the backup):', e.message);
    }

    process.exit(0);
}

['SIGINT', 'SIGTERM', 'SIGBREAK'].forEach(sig => {
    process.on(sig, () => handleGracefulShutdown(sig));
});
process.on('message', (msg) => {
    if (msg === 'shutdown') handleGracefulShutdown('pm2:shutdown');
});

// Smart Tiered Sync Intervals:
const OPERATIONAL_INTERVAL = 2 * 60 * 1000;      // 2 minutes (Sales, Live, Hourly, Status)
const STANDARD_INTERVAL = 15 * 60 * 1000;        // 15 minutes (Staff, Returns, Top Movers)
const DEEP_ANALYTICS_INTERVAL = 60 * 60 * 1000;  // 60 minutes (Heavy Inventory, GST, PnL)

// Check for new checkouts every 10 seconds for real-time notification
const CHECKOUT_INTERVAL = 10 * 1000;
// Check for cancelled bills every 20 seconds
const CANCELLED_INTERVAL = 20 * 1000;
// Heartbeat pulse every 20 seconds for watchdog power cut detection
const HEARTBEAT_INTERVAL = 20 * 1000;

// Detect if the PC physically booted up recently (within 6 minutes) and send alert once per boot session
async function checkAndDispatchPcBootAlert() {
    const uptimeSec = os.uptime();
    // A PC boot is considered recent if Windows started within the last 6 minutes (360 seconds)
    const BOOT_UPTIME_THRESHOLD_SEC = 360;

    // Calculate approximate epoch (ms) when this PC booted
    const bootEpochMs = Date.now() - Math.round(uptimeSec * 1000);
    const bootRecordPath = path.join(__dirname, '.last_boot_alert.json');

    // --- STEP 0: Check for a missed shutdown sentinel from the previous session ---
    // If the process was killed by Windows before the async write completed, we deliver it now.
    try {
        if (fs.existsSync(SHUTDOWN_SENTINEL_PATH)) {
            const sentinel = JSON.parse(fs.readFileSync(SHUTDOWN_SENTINEL_PATH, 'utf8'));
            console.log(`[SYNC AGENT] 📋 Found missed shutdown sentinel from ${sentinel.shutdownAt}. Dispatching retroactive shutdown alert...`);

            // Only send if it's recent (within 48 hours) to avoid stale alerts
            const ageMs = Date.now() - (sentinel.shutdownAtMs || 0);
            if (ageMs < 48 * 60 * 60 * 1000) {
                const title = `🔴 Store System Turned OFF | ${sentinel.timeStr}`;
                const body = `Cobb Pundri POS shut down on ${sentinel.dateStr} at ${sentinel.timeStr} (${sentinel.signal || 'Clean Shutdown'}). Store system is now closed.`;
                const alertId = `sys_offline_${sentinel.shutdownAtMs || Date.now()}`;
                const payload = {
                    type: 'system_status', status: 'offline',
                    reason: sentinel.signal || 'Clean Shutdown',
                    title, body, url: '/?tab=dashboard',
                    createdAt: sentinel.shutdownAtMs || Date.now(),
                    retroactive: true,
                    timestamp: FieldValue.serverTimestamp()
                };
                if (db) {
                    await db.collection('stores').doc(STORE_ID).collection('data').doc('system_status').set({
                        lastShutdownTimeFormatted: `${sentinel.dateStr}, ${sentinel.timeStr}`,
                        lastShutdownTime: FieldValue.serverTimestamp()
                    }, { merge: true });
                    await db.collection('stores').doc(STORE_ID).collection('checkout_notifications').doc(alertId).set(payload).catch(() => {});
                    console.log(`[SYNC AGENT] ✅ Retroactive shutdown alert dispatched to phone: ${title}`);

                    const waRetroText = 
                        `🔴 *STORE POS PREVIOUS SHUTDOWN REPORT* — *Cobb Pundri*\n` +
                        `──────────────────────\n` +
                        `🕒 POS Counter Computer shut down on ${sentinel.dateStr} at ${sentinel.timeStr}.\n` +
                        `_Delivered upon reboot._`;
                    sendWhatsAppToOwners(waRetroText, 'Retro Shutdown').catch(() => {});
                }
            } else {
                console.log('[SYNC AGENT] Shutdown sentinel is too old (>48h). Skipping retroactive alert.');
            }

            // Clear sentinel — it has been processed
            fs.unlinkSync(SHUTDOWN_SENTINEL_PATH);
        }
    } catch (e) {
        console.warn('[SYNC AGENT] Error processing shutdown sentinel:', e.message);
        try { fs.unlinkSync(SHUTDOWN_SENTINEL_PATH); } catch (_) {}
    }

    let alreadyAlerted = false;
    try {
        if (fs.existsSync(bootRecordPath)) {
            const data = JSON.parse(fs.readFileSync(bootRecordPath, 'utf8'));
            if (data.bootEpochMs && Math.abs(data.bootEpochMs - bootEpochMs) < 10 * 60 * 1000) {
                alreadyAlerted = true;
            }
        }
    } catch (e) {
        // Continue if reading failed
    }

    if (uptimeSec < BOOT_UPTIME_THRESHOLD_SEC && !alreadyAlerted) {
        console.log(`[SYNC AGENT] 🖥️ Genuine PC Boot detected (System Uptime: ${Math.round(uptimeSec)}s). Dispatching Boot Alert to phone...`);
        try {
            await dispatchSystemStatusAlert('online', 'Store PC Booted');
            fs.writeFileSync(bootRecordPath, JSON.stringify({
                bootEpochMs,
                notifiedAt: new Date().toISOString(),
                uptimeSec: Math.round(uptimeSec)
            }, null, 2));
        } catch (alertErr) {
            console.warn('[SYNC AGENT] Failed to dispatch PC boot alert:', alertErr.message);
        }
    } else {
        if (uptimeSec >= BOOT_UPTIME_THRESHOLD_SEC) {
            console.log(`[SYNC AGENT] System uptime is ${Math.round(uptimeSec / 60)} minutes (PC was not recently booted). Starting sync silently without boot notification.`);
        } else {
            console.log('[SYNC AGENT] PC Boot alert already dispatched for this boot session. Skipping duplicate notification.');
        }
    }

    // Always keep heartbeat updated silently
    await updateHeartbeat();
}

function startSyncAgent() {
    console.log("[SYNC AGENT] Process started. Waiting to begin initial sync...");
    // Start immediately, then loop
    if (serviceAccount) {
        // 1. Check if the PC physically booted up recently before dispatching alert
        checkAndDispatchPcBootAlert();

        // 2. Initial baseline sync across all tiers (sequenced to protect POS CPU)
        (async () => {
            try {
                await syncEndpointList(operationalEndpoints, 'Operational Tier');
                await syncEndpointList(standardEndpoints, 'Standard Tier');
                await syncEndpointList(deepAnalyticsEndpoints, 'Deep Analytics Tier');
            } catch (initialSyncErr) {
                console.warn('[SYNC AGENT] Initial sync notice:', initialSyncErr.message);
            }
        })();

        // 3. Start tiered intervals & remote test listeners
        checkAndDispatchCheckoutAlerts();
        checkAndDispatchCancelledBillAlerts();
        listenForTestAlertsAndDispatchFcm();
        setInterval(() => syncEndpointList(operationalEndpoints, 'Operational Tier'), OPERATIONAL_INTERVAL);
        setInterval(() => syncEndpointList(standardEndpoints, 'Standard Tier'), STANDARD_INTERVAL);
        setInterval(() => syncEndpointList(deepAnalyticsEndpoints, 'Deep Analytics Tier'), DEEP_ANALYTICS_INTERVAL);
        setInterval(checkAndDispatchCheckoutAlerts, CHECKOUT_INTERVAL);
        setInterval(checkAndDispatchCancelledBillAlerts, CANCELLED_INTERVAL);
        setInterval(updateHeartbeat, HEARTBEAT_INTERVAL);

        // 3. Nightly closing digest scheduled trigger (between 9:45 PM and 9:55 PM)
        setInterval(() => {
            const now = new Date();
            if (now.getHours() === 21 && now.getMinutes() >= 45 && now.getMinutes() <= 55) {
                // dispatchEodDigestAlert (DISABLED)(true);
            }
        }, 60 * 1000);
    } else {
        console.log("[SYNC AGENT] Please update .env with FIREBASE_SERVICE_ACCOUNT and restart.");
    }
}


