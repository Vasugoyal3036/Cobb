const sql = require('mssql/msnodesqlv8'); // <-- Using the native Windows driver

const config = {
    server: 'localhost',
    database: 'RPD_AVATAR01_NEW_ST_POS',
    requestTimeout: 120000,
    connectionTimeout: 60000,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        instanceName: 'SQLEXPRESS',
        trustedConnection: true,
        requestTimeout: 120000
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