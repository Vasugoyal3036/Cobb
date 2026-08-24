const { sql, connectDB } = require('./db');
const fs = require('fs');
const path = require('path');

async function checkLatestBills() {
    await connectDB();
    try {
        const result = await sql.query(`
            SELECT TOP 10
                CM_ID,
                CM_NO,
                CUSTOMER_CODE,
                CUSTOMER_FNAME,
                NET_AMOUNT,
                CM_TIME,
                CANCELLED
            FROM VW_CASHMEMO_PRINT_MST
            ORDER BY CM_TIME DESC
        `);

        console.log("Top 10 Latest Bills in MSSQL Database:");
        console.log(result.recordset);

        // Read sent_bills.txt
        const sentFile = path.join(__dirname, 'sent_bills.txt');
        let sentIds = new Set();
        if (fs.existsSync(sentFile)) {
            const lines = fs.readFileSync(sentFile, 'utf8').split('\n');
            lines.forEach(l => {
                if (l.trim()) sentIds.add(l.trim());
            });
        }
        console.log(`\nLoaded ${sentIds.size} sent IDs from sent_bills.txt`);

        console.log("\n--- Checking status of latest bills ---");
        result.recordset.forEach(b => {
            const idStr = String(b.CM_ID).trim();
            const isSent = sentIds.has(idStr);
            console.log(`Bill #${b.CM_NO} | ID: ${idStr} | Time: ${b.CM_TIME} | Phone: '${b.CUSTOMER_CODE}' | Sent in history: ${isSent}`);
        });

    } catch (err) {
        console.error("DB Check Error:", err);
    }
}

checkLatestBills();
