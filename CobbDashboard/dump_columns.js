const { sql, connectDB } = require('./db');
connectDB().then(async () => {
    try {
        const res = await sql.query("SELECT top 1 * FROM VW_CASHMEMO_PRINT_MST WITH (NOLOCK)");
        console.log(Object.keys(res.recordset[0] || {}));
    } catch (e) { console.error(e); }
    process.exit(0);
});
