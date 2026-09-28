const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const axios = require("axios");
const os = require('os');
require('dotenv').config();

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

const endpointsToSync = [
    "/api/sales/overview",
    { url: "/api/sales/live?days=7", docName: "sales_live" },
    { url: "/api/sales/history?days=14", docName: "sales_history" },
    "/api/sales/daily-month",
    "/api/analytics/hourly",
    "/api/analytics/monthly-products",
    "/api/inventory",
    "/api/inventory/dead-stock",
    "/api/customers/vip",
    "/api/customers/dormant",
    "/api/automation/status",
    "/api/gateway/status",
    "/api/broadcast/status",
    "/api/reconciliation/latest",
    "/api/analytics/retention-radar",
    "/api/financials/pnl",
    "/api/analytics/wardrobe-profiles",
    "/api/financials/gst-summary",
    "/api/inventory/size-matrix",
    "/api/analytics/top-movers",
    "/api/sales/returns",
    "/api/broadcast/group",
    "/api/smart-bundles",
    { url: "/api/reports/eod-summary", docName: "reports_eod-summary" },
    { url: "/api/reports/eod-summary", docName: "eod_summary" },
    { url: "/api/sales/cancelled?limit=15", docName: "sales_cancelled" },
    "/api/system/health",
    "/api/crm/anniversaries-today",
    { url: "/api/staff/leaderboard?period=bundle", docName: "staff_leaderboard" },
    "/api/staff/config",
    { url: "/api/ai/demand-forecasts", method: "POST", data: { refresh: true } }
];

const lastPayloadHash = new Map();

async function runSyncCycle() {
    if (!db) {
        console.log("[SYNC AGENT] Firebase not configured yet. Skipping sync cycle.");
        return;
    }

    console.log(`\n[SYNC AGENT] Starting sync cycle for Store ID: ${STORE_ID} at ${new Date().toISOString()}`);
    
    for (const item of endpointsToSync) {
        // Support both string URL and object config
        const url = typeof item === 'string' ? item : item.url;
        const method = (typeof item === 'object' && item.method) ? item.method : 'GET';
        const dataConfig = typeof item === 'string' ? {} : (item.data || {});
        
        // Match the frontend SaaS Interceptor naming convention exactly!
        const docName = item.docName || url.split('?')[0].replace('/api/', '').replace(/\//g, '_');

        try {
            let response;
            const axiosConfig = { timeout: 60000 };
            if (method === "GET") {
                response = await axios.get(`${LOCAL_API}${url}`, axiosConfig);
            } else if (method === "POST") {
                response = await axios.post(`${LOCAL_API}${url}`, dataConfig, axiosConfig);
            }

            if (response && response.data) {
                // Deduplicate: Don't write to Firestore if the content is identical to last sync
                const jsonStr = JSON.stringify(response.data);
                if (lastPayloadHash.get(docName) === jsonStr) {
                    continue; // Skip write, saves Firestore quota!
                }

                // Ensure data is an object before pushing (if it's an array, wrap it)
                const payload = Array.isArray(response.data) ? { items: response.data } : response.data;
                payload.lastUpdated = FieldValue.serverTimestamp();

                await db.collection("stores").doc(STORE_ID).collection("data").doc(docName).set(payload, { merge: true });
                lastPayloadHash.set(docName, jsonStr);
                console.log(`[SYNC AGENT] ✅ Synced ${docName}`);
            }
        } catch (err) {
            console.error(`[SYNC AGENT] ❌ Failed to sync ${docName}: ${err.message}`);
        }
    }
    console.log(`[SYNC AGENT] Sync cycle completed.`);
}

// --- FAST REAL-TIME CHECKOUT PUSH ALERTS ---
const knownBillIds = new Set();
let isFirstLiveBillsRun = true;

async function checkAndDispatchCheckoutAlerts() {
    if (!db) return;
    try {
        const response = await axios.get(`${LOCAL_API}/api/sales/live?limit=15`, { timeout: 10000 });
        const bills = Array.isArray(response.data) ? response.data : [];
        if (bills.length === 0) return;

        if (isFirstLiveBillsRun) {
            // Seed known bills so we don't alert on historical bills on startup
            bills.forEach(b => {
                const id = String(b.BillId || b.BillNumber).trim();
                if (id) knownBillIds.add(id);
            });
            isFirstLiveBillsRun = false;
            console.log(`[SYNC AGENT] 🔔 Checkout alert engine armed with ${knownBillIds.size} baseline bills.`);
            return;
        }

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
            const cust = bill.CustomerName && bill.CustomerName.trim()
                ? bill.CustomerName.trim()
                : (bill.Phone ? `Cust (${bill.Phone})` : 'Walk-in');

            const discountAmt = Math.round(Number(bill.DiscountAmount || 0));
            const grossAmt = Math.round(Number(bill.GrossAmount || (amount + discountAmt)));
            const discountPct = Number(bill.DiscountPercent) || (grossAmt > 0 ? Math.round((discountAmt / grossAmt) * 100) : 0);

            // Categorize Alert:
            // 1. Heavy Discount Warning (Fraud / Revenue Leakage Prevention)
            // 2. VIP Mega Sale Alert (High Value Purchase)
            // 3. Regular New Sale
            let alertType = 'sale';
            let title = `🧾 New Sale: ₹${amount.toLocaleString('en-IN')} | Bill #${billNo}`;
            let body = `Items: ${qty} • Pay: ${pay} • Staff: ${staff} • Cust: ${cust}`;
            let tag = `cobb-sale-${billNo}`;

            if ((discountPct >= 35 && discountAmt >= 1000) || discountAmt >= 2500) {
                alertType = 'heavy_discount';
                title = `⚠️ HEAVY DISCOUNT (${discountPct}% OFF) | Bill #${billNo}`;
                body = `⚠️ Staff: ${staff} gave ₹${discountAmt.toLocaleString('en-IN')} (${discountPct}%) discount on ₹${grossAmt.toLocaleString('en-IN')} bill for ${cust}! Net: ₹${amount.toLocaleString('en-IN')}`;
                tag = `cobb-discount-${billNo}`;
            } else if (amount >= 10000) {
                alertType = 'big_ticket_sale';
                title = `💎 VIP MEGA SALE: ₹${amount.toLocaleString('en-IN')} | Bill #${billNo}`;
                body = `🎉 Staff: ${staff} closed a massive ₹${amount.toLocaleString('en-IN')} ticket (${qty} items) for ${cust}! Pay: ${pay}`;
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
                customer: cust,
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
                            fcmOptions: {
                                link: clickUrl
                            },
                            notification: {
                                title: title,
                                body: body,
                                icon: '/ors-logo.png',
                                badge: '/favicon.svg',
                                tag: tag
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
        if (cancelledBills.length === 0) return;

        if (isFirstCancelledBillsRun) {
            cancelledBills.forEach(b => {
                const id = String(b.BillId || b.BillNumber).trim();
                if (id) knownCancelledBillIds.add(id);
            });
            isFirstCancelledBillsRun = false;
            return;
        }

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
        }
    } catch (err) {
        // Silently skip if endpoint momentarily busy
    }
}

// --- AUTOMATED EOD (END OF DAY) STORE DIGEST DISPATCHER ---
let lastDispatchedEodDate = '';

async function dispatchEodDigestAlert(isScheduled = false) {
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
                            fcmOptions: { link: '/?tab=dashboard' },
                            notification: {
                                title,
                                body,
                                icon: '/ors-logo.png',
                                badge: '/favicon.svg',
                                tag: 'cobb-system-status'
                            }
                        }
                    }).catch(e => console.warn('[SYNC AGENT] System alert FCM push notice:', e.message));
                }
            }
        }

        // 4. If system is shutting down, trigger EOD Closing Digest automatically
        if (status === 'offline') {
            console.log('[SYNC AGENT] 🌙 Store is shutting down. Dispatching closing EOD Digest...');
            await dispatchEodDigestAlert(false);
        }
    } catch (err) {
        console.error(`[SYNC AGENT] Error dispatching system ${status} alert:`, err.message);
    }
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
let isShuttingDown = false;
async function handleGracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[SYNC AGENT] Clean shutdown signal (${signal}) received. Dispatching System OFF alert...`);
    try {
        await dispatchSystemStatusAlert('offline', `Clean Shutdown: ${signal}`);
    } catch (e) {}
    process.exit(0);
}

['SIGINT', 'SIGTERM', 'SIGBREAK'].forEach(sig => {
    process.on(sig, () => handleGracefulShutdown(sig));
});
process.on('message', (msg) => {
    if (msg === 'shutdown') handleGracefulShutdown('pm2:shutdown');
});

// Run the sync agent loop every 1 minute (60,000 ms)
const SYNC_INTERVAL = 60 * 1000;
// Check for new checkouts every 10 seconds for real-time notification
const CHECKOUT_INTERVAL = 10 * 1000;
// Check for cancelled bills every 20 seconds
const CANCELLED_INTERVAL = 20 * 1000;
// Heartbeat pulse every 20 seconds for watchdog power cut detection
const HEARTBEAT_INTERVAL = 20 * 1000;

console.log("[SYNC AGENT] Process started. Waiting to begin initial sync...");
// Start immediately, then loop
if (serviceAccount) {
    // 1. Immediately send System ON alert & pulse
    dispatchSystemStatusAlert('online', 'Store PC Booted / Services Started');
    updateHeartbeat();

    // 2. Start intervals
    runSyncCycle();
    checkAndDispatchCheckoutAlerts();
    checkAndDispatchCancelledBillAlerts();
    setInterval(runSyncCycle, SYNC_INTERVAL);
    setInterval(checkAndDispatchCheckoutAlerts, CHECKOUT_INTERVAL);
    setInterval(checkAndDispatchCancelledBillAlerts, CANCELLED_INTERVAL);
    setInterval(updateHeartbeat, HEARTBEAT_INTERVAL);

    // 3. Nightly closing digest scheduled trigger (between 9:45 PM and 9:55 PM)
    setInterval(() => {
        const now = new Date();
        if (now.getHours() === 21 && now.getMinutes() >= 45 && now.getMinutes() <= 55) {
            dispatchEodDigestAlert(true);
        }
    }, 60 * 1000);
} else {
    console.log("[SYNC AGENT] Please update .env with FIREBASE_SERVICE_ACCOUNT and restart.");
}


