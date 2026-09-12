const sql = require('mssql/msnodesqlv8'); // <-- Using the native Windows driver

require('dotenv').config();

const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'RPD_AVATAR01_NEW_ST_POS',
    requestTimeout: 60000,
    connectionTimeout: 60000,
    pool: {
        max: 20,   // Increased from 10 — prevents pool starvation when multiple tabs load at once
        min: 2,    // Keep 2 warm connections ready
        idleTimeoutMillis: 60000
    },
    options: {
        instanceName: process.env.DB_INSTANCE || 'SQLEXPRESS',
        trustedConnection: process.env.DB_USER ? false : true,
        requestTimeout: 60000
    }
};

if (process.env.DB_USER) {
    config.user = process.env.DB_USER;
    config.password = process.env.DB_PASSWORD;
}

async function connectDB() {
    try {
        await sql.connect(config);
        console.log('Connected to WizApp SQL Database successfully!');
        
        // Auto-create LocalUsers table for RBAC Google Auth
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LocalUsers' and xtype='U')
            CREATE TABLE LocalUsers (
                Id INT PRIMARY KEY IDENTITY(1,1),
                GoogleUid VARCHAR(255) UNIQUE NOT NULL,
                Email VARCHAR(255) UNIQUE NOT NULL,
                Name VARCHAR(255),
                Role VARCHAR(50) NOT NULL,
                StoreId VARCHAR(50) NOT NULL,
                CreatedAt DATETIME DEFAULT GETDATE()
            )
        `);
        console.log('LocalUsers table verified/created.');
    } catch (err) {
        console.error('Database connection failed:', err);
    }
}

module.exports = { sql, connectDB };