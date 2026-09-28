const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const axios = require("axios");
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
    "/api/reports/eod-summary",
    "/api/system/health",
    "/api/crm/anniversaries-today",
    "/api/staff/leaderboard",
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

            // Format requested:
            // Title: '🧾 New Sale: ₹{Amount} | Bill #{BillNo}'
            // Body: 'Items: {Qty} • Pay: {UPI/Cash} • Staff: {Salesperson} • Cust: {Customer}'
            const title = `🧾 New Sale: ₹${amount.toLocaleString('en-IN')} | Bill #${billNo}`;
            const body = `Items: ${qty} • Pay: ${pay} • Staff: ${staff} • Cust: ${cust}`;
            const clickUrl = `/?tab=livebills&bill=${encodeURIComponent(billNo)}`;

            const notificationPayload = {
                billId: String(bill.BillId || billNo),
                billNumber: billNo,
                amount,
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
            console.log(`[SYNC AGENT] 📢 New Checkout Alert written to Firestore: ${title}`);

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
                            title: title,
                            body: body,
                            billNumber: billNo,
                            billId: String(bill.BillId || ''),
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
                                tag: `cobb-sale-${billNo}`
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

// Run the sync agent loop every 1 minute (60,000 ms)
const SYNC_INTERVAL = 60 * 1000;
// Check for new checkouts every 10 seconds for real-time notification
const CHECKOUT_INTERVAL = 10 * 1000;

console.log("[SYNC AGENT] Process started. Waiting to begin initial sync...");
// Start immediately, then loop
if (serviceAccount) {
    runSyncCycle();
    checkAndDispatchCheckoutAlerts();
    setInterval(runSyncCycle, SYNC_INTERVAL);
    setInterval(checkAndDispatchCheckoutAlerts, CHECKOUT_INTERVAL);
} else {
    console.log("[SYNC AGENT] Please update .env with FIREBASE_SERVICE_ACCOUNT and restart.");
}

