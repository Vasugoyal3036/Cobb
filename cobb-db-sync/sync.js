require('dotenv').config();
const sql = require('mssql');
const admin = require('firebase-admin');
const fs = require('fs');
const readline = require('readline');

// Setup readline for interactive prompts
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

// MS SQL Configuration using Windows Authentication (No Password Required!)
const sqlConfig = {
    database: process.env.DB_NAME || 'master',
    server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
    driver: 'msnodesqlv8',
    options: {
        trustedConnection: true, // This enables Windows Authentication
        encrypt: false
    }
};

async function runAutoSync() {
    console.log("=========================================");
    console.log("   COBB - AUTO MS-SQL DISCOVERY SCRIPT   ");
    console.log("=========================================\n");

    try {
        console.log("[1] Connecting to MS SQL Database...");
        let pool = await sql.connect(sqlConfig);
        console.log("    ✅ Connected!\n");

        console.log("[2] Searching for Inventory/Product tables...");
        const tableQuery = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
        `;
        const tableResult = await pool.request().query(tableQuery);
        
        let possibleTables = tableResult.recordset
            .map(row => row.TABLE_NAME)
            .filter(name => 
                name.toLowerCase().includes('item') || 
                name.toLowerCase().includes('product') || 
                name.toLowerCase().includes('inventory') ||
                name.toLowerCase().includes('stock') ||
                name.toLowerCase().includes('article')
            );

        if (possibleTables.length === 0) {
            console.log("    ❌ Could not automatically find tables named 'Item', 'Product', 'Inventory', etc.");
            const manualTable = await askQuestion("    Type the exact name of your items table: ");
            possibleTables.push(manualTable);
        }

        console.log(`    Found possible tables: ${possibleTables.join(', ')}`);
        
        let selectedTable = possibleTables[0];
        if (possibleTables.length > 1) {
            const answer = await askQuestion(`    Which table should we read from? [Default: ${selectedTable}]: `);
            if (answer.trim()) selectedTable = answer.trim();
        }

        console.log(`\n[3] Analyzing columns in [${selectedTable}]...`);
        const colQuery = `
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = '${selectedTable}'
        `;
        const colResult = await pool.request().query(colQuery);
        const cols = colResult.recordset.map(row => row.COLUMN_NAME);
        
        console.log(`    Columns found: ${cols.slice(0, 10).join(', ')}...`);

        // Auto-detect columns
        let barcodeCol = cols.find(c => c.toLowerCase().includes('barcode') || c.toLowerCase().includes('ean') || c.toLowerCase().includes('code')) || cols[0];
        let nameCol = cols.find(c => c.toLowerCase().includes('name') || c.toLowerCase().includes('desc')) || cols[1];
        let mrpCol = cols.find(c => c.toLowerCase().includes('mrp') || c.toLowerCase().includes('price')) || cols[2];
        let qtyCol = cols.find(c => c.toLowerCase().includes('qty') || c.toLowerCase().includes('stock') || c.toLowerCase().includes('bal')) || null;

        console.log(`\n    🤖 I have auto-mapped your columns as follows:`);
        console.log(`       - Barcode Field: ${barcodeCol}`);
        console.log(`       - Item Name Field: ${nameCol}`);
        console.log(`       - MRP Field: ${mrpCol}`);
        console.log(`       - Quantity Field: ${qtyCol || 'Not Found (Will set to 10)'}`);

        const confirm = await askQuestion("\n    Does this mapping look correct? (Y/N): ");
        if (confirm.toLowerCase() === 'n') {
            barcodeCol = await askQuestion("    Enter Exact Barcode Column Name: ");
            nameCol = await askQuestion("    Enter Exact Item Name Column Name: ");
            mrpCol = await askQuestion("    Enter Exact MRP Column Name: ");
            qtyCol = await askQuestion("    Enter Exact Quantity Column Name (leave blank if none): ");
        }

        console.log(`\n[4] Fetching Data from MS SQL...`);
        let qtySelect = qtyCol ? `[${qtyCol}]` : '10 AS Qty';
        const dataQuery = `SELECT TOP 500 [${barcodeCol}], [${nameCol}], [${mrpCol}], ${qtySelect} FROM [${selectedTable}]`;
        const dataResult = await pool.request().query(dataQuery);
        
        console.log(`    ✅ Fetched ${dataResult.recordset.length} items from MS SQL.\n`);

        // Transform Data
        const formattedItems = dataResult.recordset.map(row => ({
            Barcode: String(row[barcodeCol] || Math.random().toString()),
            ItemName: String(row[nameCol] || 'Unknown Item'),
            MRP: Number(row[mrpCol] || 0),
            Qty: qtyCol ? Number(row[qtyCol] || 0) : 10,
            Category: 'Uncategorized',
            Offer: null
        }));

        console.log("[5] Connecting to Firebase...");
        if (!fs.existsSync('./serviceAccountKey.json')) {
            console.log("\n    ❌ CRITICAL ERROR: serviceAccountKey.json not found!");
            console.log("       Please download it from Firebase Console -> Project Settings -> Service Accounts -> Generate New Private Key");
            console.log("       Place it in this folder as 'serviceAccountKey.json' and run this script again.");
            process.exit(1);
        }

        const serviceAccount = require('./serviceAccountKey.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        const db = admin.firestore();

        console.log("    ✅ Connected to Firebase!");
        console.log(`\n[6] Syncing ${formattedItems.length} items to Digital Catalog (DEMO_STORE_001)...`);
        
        await db.collection('stores').doc('DEMO_STORE_001').collection('data').doc('inventory').set({
            items: formattedItems,
            lastSynced: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log("\n🎉 SUCCESS! Your MS SQL Database has been mapped and synced to the Digital Catalog!");
        console.log("   Refresh the app on your phone to see the live prices.");

    } catch (err) {
        console.error("\n❌ ERROR OCCURRED: ", err.message);
    } finally {
        rl.close();
        process.exit();
    }
}

runAutoSync();
