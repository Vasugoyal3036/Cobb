const sql = require('mssql/msnodesqlv8'); // <-- Using the native Windows driver
require('dotenv').config();
const { loadConfig } = require('./config_manager');

let currentPool = null;
let reconnectPromise = null;
const rawQuery = sql.query.bind(sql);
let dbStatus = {
    connected: false,
    lastError: null,
    server: '',
    database: '',
    engine: 'mssql',
    lastChecked: null
};

function buildSqlConfig(dbCfg = null) {
    const configData = dbCfg || loadConfig().database;
    const isTrusted = configData.trustedConnection !== undefined 
        ? Boolean(configData.trustedConnection) 
        : (configData.user ? false : true);

    const cfg = {
        server: configData.server || 'localhost',
        database: configData.database || 'RPD_AVATAR01_NEW_ST_POS',
        requestTimeout: 60000,
        connectionTimeout: 15000,
        pool: {
            max: 20,
            min: 2,
            idleTimeoutMillis: 60000
        },
        options: {
            trustedConnection: isTrusted,
            requestTimeout: 60000
        }
    };

    if (configData.instanceName && configData.instanceName.trim() !== '') {
        cfg.options.instanceName = configData.instanceName.trim();
    }
    if (configData.port && Number(configData.port)) {
        cfg.port = Number(configData.port);
    }
    if (!isTrusted && configData.user) {
        cfg.user = configData.user;
        cfg.password = configData.password || '';
    }

    return cfg;
}

async function connectDB(customDbConfig = null) {
    const sqlConfig = buildSqlConfig(customDbConfig);
    dbStatus.server = sqlConfig.server + (sqlConfig.options.instanceName ? `\\${sqlConfig.options.instanceName}` : '');
    dbStatus.database = sqlConfig.database;

    try {
        if (currentPool) {
            try { await currentPool.close(); } catch (e) { /* ignore */ }
        }

        currentPool = await sql.connect(sqlConfig);
        dbStatus.connected = true;
        dbStatus.lastError = null;
        dbStatus.lastChecked = new Date().toISOString();
        console.log(`Connected to SQL Database [${dbStatus.database}] at [${dbStatus.server}] successfully!`);
        
        // Auto-create LocalUsers table for RBAC Google Auth
        try {
            await rawQuery(`
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
        } catch (tableErr) {
            console.warn('Note: LocalUsers table check returned:', tableErr.message);
        }

        return { success: true };
    } catch (err) {
        dbStatus.connected = false;
        dbStatus.lastError = err.message;
        dbStatus.lastChecked = new Date().toISOString();
        console.error('Database connection failed:', err.message);
        return { success: false, error: err.message };
    }
}

function isConnectionLossError(err) {
    const message = String(err?.message || err || '').toLowerCase();
    return message.includes('no connection is specified') ||
        message.includes('connection is not open') ||
        message.includes('connection is closed') ||
        message.includes('econnreset') ||
        message.includes('esocket') ||
        message.includes('socket hang up') ||
        message.includes('timeout');
}

async function reconnectOnce() {
    if (!reconnectPromise) {
        reconnectPromise = connectDB().finally(() => {
            reconnectPromise = null;
        });
    }
    return reconnectPromise;
}

async function queryWithReconnect(...args) {
    try {
        return await rawQuery(...args);
    } catch (err) {
        if (!isConnectionLossError(err)) throw err;
        console.warn('[DB] Connection lost. Reconnecting before retrying query...');
        const reconnectResult = await reconnectOnce();
        if (!reconnectResult.success) throw err;
        return rawQuery(...args);
    }
}

sql.query = queryWithReconnect;

/**
 * Tests connection with arbitrary database settings without disturbing the active pool.
 * If successful, retrieves the SQL Server version and database list.
 */
async function testDatabaseConnection(testDbParams) {
    const testSqlConfig = buildSqlConfig(testDbParams);
    // Use smaller timeout for testing so UI responds quickly
    testSqlConfig.connectionTimeout = 8000;
    testSqlConfig.requestTimeout = 8000;

    let testPool = null;
    try {
        testPool = new sql.ConnectionPool(testSqlConfig);
        await testPool.connect();

        // Check SQL server version
        const verResult = await testPool.request().query('SELECT @@VERSION as version');
        const rawVersion = verResult.recordset[0]?.version || 'Microsoft SQL Server';
        const cleanVersion = rawVersion.split('\n')[0].trim();

        // Discover databases on this instance
        let databases = [];
        try {
            const dbListResult = await testPool.request().query(`
                SELECT name FROM sys.databases 
                WHERE database_id > 4 AND state_desc = 'ONLINE'
                ORDER BY name
            `);
            databases = dbListResult.recordset.map(r => r.name);
        } catch (dbListErr) {
            console.warn('Could not query sys.databases (permissions):', dbListErr.message);
        }

        await testPool.close();
        return {
            success: true,
            version: cleanVersion,
            databases,
            message: `Successfully connected to ${cleanVersion}`
        };
    } catch (err) {
        if (testPool) {
            try { await testPool.close(); } catch (e) { /* ignore */ }
        }
        return {
            success: false,
            error: err.message || 'Failed to connect to database'
        };
    }
}

function getDbStatus() {
    return { ...dbStatus };
}

module.exports = {
    sql,
    connectDB,
    testDatabaseConnection,
    getDbStatus
};