const fs = require('fs');
const path = require('path');
const expensesManager = require('./expenses_manager');

const TEA_RECORDS_FILE = path.join(__dirname, 'daily_tea_records.json');
const STORE_CONFIG_FILE = path.join(__dirname, 'store_config.json');
const DEFAULT_RATE_PER_CUP = 10; // Rs 10 per cup

// --- Firestore Cloud Sync Initialization (for Phone Link) ---
let firestoreDb = null;
try {
    const serviceAccountPath = path.join(__dirname, 'firebase-admin.json');
    if (fs.existsSync(serviceAccountPath)) {
        const { initializeApp, getApps, cert } = require('firebase-admin/app');
        const { getFirestore } = require('firebase-admin/firestore');
        const serviceAccount = require(serviceAccountPath);
        const fbApp = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
        firestoreDb = getFirestore(fbApp);
    }
} catch (e) {
    console.warn('[TEA MANAGER] Firestore init warning:', e.message);
}

function getLocalTodayDate() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const local = new Date(now.getTime() - offset);
    return local.toISOString().split('T')[0];
}

function getActiveSalesmenList() {
    try {
        if (fs.existsSync(STORE_CONFIG_FILE)) {
            const raw = fs.readFileSync(STORE_CONFIG_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            const list = parsed?.operatingExpenses?.salesmanSalaries;
            if (Array.isArray(list) && list.length > 0) {
                return list.map(s => s.name || s.empCode).filter(Boolean);
            }
        }
    } catch (e) {
        console.warn('[TEA MANAGER] Could not load staff from store_config:', e.message);
    }
    return ['Vikas', 'Pawan', 'Simran', 'Akhil'];
}

function loadRecords() {
    try {
        if (!fs.existsSync(TEA_RECORDS_FILE)) {
            fs.writeFileSync(TEA_RECORDS_FILE, JSON.stringify({}, null, 2), 'utf8');
            return {};
        }
        const data = fs.readFileSync(TEA_RECORDS_FILE, 'utf8');
        return JSON.parse(data || '{}');
    } catch (err) {
        console.error('[TEA MANAGER] Error reading daily_tea_records.json:', err.message);
        return {};
    }
}

function syncToFirestore(record, storeId = 'DEMO_STORE_001') {
    if (!firestoreDb) return;
    try {
        const docRef = firestoreDb.collection('stores').doc(storeId).collection('data').doc('tea_expenses');
        docRef.set({
            ...record,
            lastSynced: new Date().toISOString()
        }, { merge: true }).catch(err => {
            console.warn('[TEA MANAGER] Firestore sync error:', err.message);
        });
    } catch (err) {
        console.warn('[TEA MANAGER] Error syncing to firestore:', err.message);
    }
}

function saveRecords(records, storeId = 'DEMO_STORE_001') {
    try {
        const tempPath = TEA_RECORDS_FILE + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(records, null, 2), 'utf8');
        fs.renameSync(tempPath, TEA_RECORDS_FILE);

        const today = getLocalTodayDate();
        if (records[today]) {
            syncToFirestore(records[today], storeId);
        }
        return true;
    } catch (err) {
        console.error('[TEA MANAGER] Error writing daily_tea_records.json:', err.message);
        return false;
    }
}

function getTodayRecord(targetDate, storeId = 'DEMO_STORE_001') {
    const dateStr = targetDate || getLocalTodayDate();
    const records = loadRecords();
    const defaultSalesmen = getActiveSalesmenList();

    if (!records[dateStr]) {
        const initialSalesmen = {};
        defaultSalesmen.forEach(name => {
            initialSalesmen[name] = {
                name,
                cups: 0,
                amount: 0,
                lastLogged: null
            };
        });

        records[dateStr] = {
            date: dateStr,
            ratePerCup: DEFAULT_RATE_PER_CUP,
            totalCups: 0,
            totalAmount: 0,
            salesmen: initialSalesmen,
            logs: [],
            lastUpdated: new Date().toISOString()
        };
        saveRecords(records, storeId);
    } else {
        // Ensure all active salesmen exist in salesmen map
        let modified = false;
        defaultSalesmen.forEach(name => {
            if (!records[dateStr].salesmen[name]) {
                records[dateStr].salesmen[name] = {
                    name,
                    cups: 0,
                    amount: 0,
                    lastLogged: null
                };
                modified = true;
            }
        });
        if (modified) {
            saveRecords(records, storeId);
        }
    }

    return records[dateStr];
}

function logTea({ salesman, cups = 1, ratePerCup = DEFAULT_RATE_PER_CUP, note = '', storeId = 'DEMO_STORE_001' }) {
    if (!salesman) {
        throw new Error('Salesman name is required');
    }
    const numCups = parseInt(cups, 10);
    if (isNaN(numCups) || numCups === 0) {
        throw new Error('Valid cup count is required');
    }

    const dateStr = getLocalTodayDate();
    const records = loadRecords();
    const dayRecord = getTodayRecord(dateStr, storeId);

    const actualRate = Number(ratePerCup) || Number(dayRecord.ratePerCup) || DEFAULT_RATE_PER_CUP;
    dayRecord.ratePerCup = actualRate;

    if (!dayRecord.salesmen[salesman]) {
        dayRecord.salesmen[salesman] = {
            name: salesman,
            cups: 0,
            amount: 0,
            lastLogged: null
        };
    }

    const sRecord = dayRecord.salesmen[salesman];
    const prevCups = sRecord.cups || 0;
    const newCups = Math.max(0, prevCups + numCups);
    const addedActual = newCups - prevCups;

    sRecord.cups = newCups;
    sRecord.amount = newCups * actualRate;
    sRecord.lastLogged = new Date().toISOString();

    // Recompute day totals
    let totalCups = 0;
    Object.values(dayRecord.salesmen).forEach(s => {
        totalCups += (s.cups || 0);
    });
    dayRecord.totalCups = totalCups;
    dayRecord.totalAmount = totalCups * actualRate;
    dayRecord.lastUpdated = new Date().toISOString();

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Append log entry
    dayRecord.logs.unshift({
        id: `tea_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        salesman,
        cupsAdded: numCups,
        totalCupsForDay: newCups,
        ratePerCup: actualRate,
        amount: numCups * actualRate,
        time: timeFormatted,
        timestamp: now.toISOString(),
        note: (note || '').trim() || (numCups > 0 ? 'Tea Break' : 'Correction')
    });

    records[dateStr] = dayRecord;
    saveRecords(records, storeId);

    // Also register in store general expenses ledger if added
    if (addedActual > 0) {
        try {
            expensesManager.addExpense({
                category: 'chai',
                amount: addedActual * actualRate,
                description: `Chai: ${salesman} (+${addedActual} cup${addedActual > 1 ? 's' : ''})`,
                loggedBy: salesman,
                storeId
            });
        } catch (expErr) {
            console.warn('[TEA MANAGER] Warning adding to general expenses:', expErr.message);
        }
    }

    return dayRecord;
}

function setTeaCount({ salesman, totalCups = 0, ratePerCup = DEFAULT_RATE_PER_CUP, note = '', storeId = 'DEMO_STORE_001' }) {
    if (!salesman) {
        throw new Error('Salesman name is required');
    }
    const targetCups = Math.max(0, parseInt(totalCups, 10) || 0);

    const dateStr = getLocalTodayDate();
    const records = loadRecords();
    const dayRecord = getTodayRecord(dateStr, storeId);

    const actualRate = Number(ratePerCup) || Number(dayRecord.ratePerCup) || DEFAULT_RATE_PER_CUP;
    dayRecord.ratePerCup = actualRate;

    if (!dayRecord.salesmen[salesman]) {
        dayRecord.salesmen[salesman] = {
            name: salesman,
            cups: 0,
            amount: 0,
            lastLogged: null
        };
    }

    const sRecord = dayRecord.salesmen[salesman];
    sRecord.cups = targetCups;
    sRecord.amount = targetCups * actualRate;
    sRecord.lastLogged = new Date().toISOString();

    // Recompute day totals
    let totalCupsSum = 0;
    Object.values(dayRecord.salesmen).forEach(s => {
        totalCupsSum += (s.cups || 0);
    });
    dayRecord.totalCups = totalCupsSum;
    dayRecord.totalAmount = totalCupsSum * actualRate;
    dayRecord.lastUpdated = new Date().toISOString();

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    dayRecord.logs.unshift({
        id: `tea_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        salesman,
        cupsAdded: 0,
        totalCupsForDay: targetCups,
        ratePerCup: actualRate,
        amount: targetCups * actualRate,
        time: timeFormatted,
        timestamp: now.toISOString(),
        note: (note || '').trim() || `Count set to ${targetCups} cups`
    });

    records[dateStr] = dayRecord;
    saveRecords(records, storeId);

    return dayRecord;
}

module.exports = {
    DEFAULT_RATE_PER_CUP,
    getLocalTodayDate,
    getActiveSalesmenList,
    loadRecords,
    getTodayRecord,
    logTea,
    setTeaCount,
    syncToFirestore
};
