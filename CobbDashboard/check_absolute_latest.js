const { sql, connectDB } = require('./db');

async function checkAbsoluteLatest() {
    await connectDB();
    try {
        const res = await sql.query(`
            SELECT TOP 5
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

        console.log("Absolute Latest 5 Bills in WizApp MSSQL Database:");
        res.recordset.forEach(b => {
            console.log(`Bill #${b.CM_NO.trim()} | ID: ${b.CM_ID.trim()} | Customer: ${b.CUSTOMER_FNAME} | Phone: '${b.CUSTOMER_CODE}' | Time: ${b.CM_TIME}`);
        });
    } catch (err) {
        console.error("DB Error:", err);
    }
}

checkAbsoluteLatest();
