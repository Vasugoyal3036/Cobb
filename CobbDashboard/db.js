const sql = require('mssql/msnodesqlv8'); // <-- Using the native Windows driver

const config = {
    server: 'localhost',
    database: 'RPD_AVATAR01_NEW_ST_POS',
    options: {
        instanceName: 'SQLEXPRESS',
        trustedConnection: true // <-- Tells it to use Windows Authentication just like Python
    }
};

async function connectDB() {
    try {
        await sql.connect(config);
        console.log('Connected to WizApp SQL Database successfully!');
    } catch (err) {
        console.error('Database connection failed:', err);
    }
}

module.exports = { sql, connectDB };