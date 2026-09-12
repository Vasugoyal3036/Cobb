const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
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

if (serviceAccount) {
    try {
        app = initializeApp({
            credential: cert(serviceAccount)
        });
        db = getFirestore(app);
        console.log("[SYNC AGENT] Firebase Admin initialized successfully.");
    } catch(err) {
        console.error("[SYNC AGENT] Firebase init error:", err);
    }
}
const STORE_ID = process.env.STORE_ID || "DEMO_STORE_001";
const LOCAL_API = process.env.LOCAL_API || `http://localhost:${process.env.PORT || 5000}`;

const endpointsToSync = [
    "/api/sales/overview",
    "/api/sales/live",
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
    { url: "/api/ai/demand-forecasts", method: "POST", data: { refresh: true } }
];

async function runSyncCycle() {
    if (!db) {
        console.log("[SYNC AGENT] Firebase not configured yet. Skipping sync cycle.");
        return;
    }

    console.log(`\n[SYNC AGENT] Starting sync cycle for Store ID: ${STORE_ID} at ${new Date().toISOString()}`);
    
    for (const item of endpointsToSync) {
        // Support both string URL and object config
        const url = typeof item === 'string' ? item : item.url;
        const method = typeof item === 'string' ? 'GET' : item.method;
        const dataConfig = typeof item === 'string' ? {} : (item.data || {});
        
        // Match the frontend SaaS Interceptor naming convention exactly!
        const docName = url.replace('/api/', '').replace(/\//g, '_');

        try {
            let response;
            const axiosConfig = { timeout: 60000 };
            if (method === "GET") {
                response = await axios.get(`${LOCAL_API}${url}`, axiosConfig);
            } else if (method === "POST") {
                response = await axios.post(`${LOCAL_API}${url}`, dataConfig, axiosConfig);
            }

            if (response && response.data) {
                // Ensure data is an object before pushing (if it's an array, wrap it)
                const payload = Array.isArray(response.data) ? { items: response.data } : response.data;
                payload.lastUpdated = FieldValue.serverTimestamp();

                await db.collection("stores").doc(STORE_ID).collection("data").doc(docName).set(payload, { merge: true });
                console.log(`[SYNC AGENT] ✅ Synced ${docName}`);
            }
        } catch (err) {
            console.error(`[SYNC AGENT] ❌ Failed to sync ${docName}: ${err.message}`);
        }
    }
    console.log(`[SYNC AGENT] Sync cycle completed.`);
}

// Run the sync agent loop every 1 minute (60,000 ms)
const SYNC_INTERVAL = 60 * 1000;

console.log("[SYNC AGENT] Process started. Waiting to begin initial sync...");
// Start immediately, then loop
if (serviceAccount) {
    runSyncCycle();
    setInterval(runSyncCycle, SYNC_INTERVAL);
} else {
    console.log("[SYNC AGENT] Please update .env with FIREBASE_SERVICE_ACCOUNT and restart.");
}
