const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { sql, connectDB } = require('../db');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const RETENTION_DAYS = 14;

async function runBackup() {
    console.log('[BACKUP] Starting automated database & configuration backup snapshot...');
    
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `ors_backup_${timestamp}.json.gz`;
    const targetFilePath = path.join(BACKUP_DIR, backupFileName);

    const snapshot = {
        meta: {
            appName: 'ORS Retail CRM',
            version: '2.5.0',
            timestamp: new Date().toISOString(),
            storeId: process.env.STORE_ID || 'DEMO_STORE_001',
            database: process.env.DB_NAME || 'RPD_AVATAR01_NEW_ST_POS'
        },
        data: {
            expenses: [],
            holds: [],
            storesNetwork: {},
            customerCount: 0,
            recentSalesCount: 0,
            recentBills: []
        }
    };

    // 1. Back up local JSON state files
    try {
        const expPath = path.join(__dirname, '..', 'expenses.json');
        if (fs.existsSync(expPath)) {
            snapshot.data.expenses = JSON.parse(fs.readFileSync(expPath, 'utf8'));
        }
    } catch (e) {}

    try {
        const holdsPath = path.join(__dirname, '..', 'holds.json');
        if (fs.existsSync(holdsPath)) {
            snapshot.data.holds = JSON.parse(fs.readFileSync(holdsPath, 'utf8'));
        }
    } catch (e) {}

    try {
        const netPath = path.join(__dirname, '..', 'stores_network.json');
        if (fs.existsSync(netPath)) {
            snapshot.data.storesNetwork = JSON.parse(fs.readFileSync(netPath, 'utf8'));
        }
    } catch (e) {}

    // 2. Back up SQL Server critical tables snapshot
    try {
        await connectDB();
        
        // Count total customers
        const custCountRes = await sql.query('SELECT COUNT(*) AS total FROM CUSTDYM WITH (NOLOCK)');
        snapshot.data.customerCount = custCountRes.recordset[0]?.total || 0;

        // Snapshot latest 200 bills
        const billsRes = await sql.query(`
            SELECT TOP 200 
                CM_ID, CM_TIME, NET_AMOUNT, CUSTOMER_CODE, CANCELLED
            FROM CMM01106 WITH (NOLOCK)
            ORDER BY CM_TIME DESC
        `);
        snapshot.data.recentBills = billsRes.recordset || [];
        snapshot.data.recentSalesCount = snapshot.data.recentBills.length;
        console.log(`[BACKUP] Captured ${snapshot.data.recentBills.length} recent bills and metadata for ${snapshot.data.customerCount} customers.`);
    } catch (dbErr) {
        console.warn('[BACKUP] SQL Server snapshot warning (proceeding with local config backup):', dbErr.message);
        snapshot.meta.dbWarning = dbErr.message;
    }

    // 3. Compress snapshot with GZIP
    const jsonString = JSON.stringify(snapshot, null, 2);
    const compressed = zlib.gzipSync(Buffer.from(jsonString, 'utf8'));
    fs.writeFileSync(targetFilePath, compressed);

    const stats = fs.statSync(targetFilePath);
    console.log(`[BACKUP] Snapshot written successfully: ${backupFileName} (${(stats.size / 1024).toFixed(1)} KB)`);

    // 4. Enforce 14-day retention policy
    try {
        const now = Date.now();
        const maxAgeMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
        const files = fs.readdirSync(BACKUP_DIR);
        let pruned = 0;

        for (const file of files) {
            if (file.startsWith('ors_backup_') && file.endsWith('.json.gz')) {
                const filePath = path.join(BACKUP_DIR, file);
                const fileStat = fs.statSync(filePath);
                if (now - fileStat.mtimeMs > maxAgeMs) {
                    fs.unlinkSync(filePath);
                    pruned++;
                }
            }
        }
        if (pruned > 0) {
            console.log(`[BACKUP] Pruned ${pruned} stale backup file(s) older than ${RETENTION_DAYS} days.`);
        }
    } catch (pruneErr) {
        console.warn('[BACKUP] Retention prune error:', pruneErr.message);
    }

    console.log('[BACKUP] Completed successfully.');
}

if (require.main === module) {
    runBackup()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('[BACKUP FATAL]:', err);
            process.exit(1);
        });
}

module.exports = { runBackup };
