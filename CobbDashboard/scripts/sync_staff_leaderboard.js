const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const axios = require('axios');
const path = require('path');

const serviceAccount = require('../firebase-admin.json');
const app = initializeApp({
    credential: cert(serviceAccount)
}, 'staff_sync_' + Date.now());

const db = getFirestore(app);

async function run() {
    try {
        console.log('Fetching fresh leaderboard bundle from local backend...');
        const res = await axios.get('http://127.0.0.1:5000/api/staff/leaderboard?period=bundle');
        if (res.data) {
            console.log(`Writing to stores/DEMO_STORE_001/data/staff_leaderboard...`);
            console.log(`Available months:`, res.data.availableMonths?.map(m => m.label));
            console.log(`Monthly history:`, res.data.monthlyHistory?.map(m => `${m.label}: ${m.champion?.name} (₹${m.grossSales})`));

            await db.doc('stores/DEMO_STORE_001/data/staff_leaderboard').set(res.data);
            console.log('✅ Successfully synced staff_leaderboard to Firestore!');

            const dailyRes = await axios.get('http://127.0.0.1:5000/api/staff/daily');
            if (dailyRes.data) {
                await db.doc('stores/DEMO_STORE_001/data/staff_daily_history').set(dailyRes.data);
                console.log(`✅ Successfully synced staff_daily_history (${dailyRes.data.totalDays} days) to Firestore!`);
            }

            const cfgRes = await axios.get('http://127.0.0.1:5000/api/staff/config');
            if (cfgRes.data) {
                await db.doc('stores/DEMO_STORE_001/data/staff_config').set(cfgRes.data);
                console.log('✅ Successfully synced staff_config to Firestore!');
            }
        }
    } catch (e) {
        console.error('Sync failed:', e.message);
    } finally {
        process.exit(0);
    }
}

run();
