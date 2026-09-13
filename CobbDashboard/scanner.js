const net = require('net');
const sql = require('mssql/msnodesqlv8');

/**
 * Checks if a TCP port is open on a host within a short timeout.
 */
function checkPort(port, host = '127.0.0.1', timeout = 1000) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let status = 'closed';

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            status = 'open';
            socket.destroy();
        });

        socket.on('timeout', () => {
            socket.destroy();
        });

        socket.on('error', () => {
            socket.destroy();
        });

        socket.on('close', () => {
            resolve({ port, host, isOpen: status === 'open' });
        });

        socket.connect(port, host);
    });
}

/**
 * Probes a local SQL Server instance using msnodesqlv8 with a hard timeout.
 */
function probeMssqlInstance(instanceName = '', timeoutMs = 2500) {
    return Promise.race([
        (async () => {
            const cfg = {
                server: 'localhost',
                database: 'master',
                connectionTimeout: timeoutMs,
                requestTimeout: timeoutMs,
                options: {
                    trustedConnection: true
                }
            };
            if (instanceName) {
                cfg.options.instanceName = instanceName;
            }

            let pool = null;
            try {
                pool = new sql.ConnectionPool(cfg);
                await pool.connect();
                const res = await pool.request().query('SELECT @@VERSION as ver');
                let databases = [];
                try {
                    const databasesRes = await pool.request().query(`
                        SELECT name FROM sys.databases 
                        WHERE database_id > 4 AND state_desc = 'ONLINE'
                    `);
                    databases = databasesRes.recordset.map(r => r.name);
                } catch (dbErr) {
                    /* ignore sys.databases error */
                }
                await pool.close();
                return {
                    available: true,
                    version: res.recordset[0]?.ver?.split('\n')[0].trim() || 'SQL Server',
                    databases
                };
            } catch (err) {
                if (pool) {
                    try { await pool.close(); } catch (e) { /* ignore */ }
                }
                return { available: false, error: err.message };
            }
        })(),
        new Promise((resolve) => 
            setTimeout(() => resolve({ available: false, error: 'Probe timeout' }), timeoutMs)
        )
    ]);
}

/**
 * Performs a comprehensive scan across common retail database ports & SQL instances.
 */
async function scanLocalDatabases() {
    const detected = [];

    // Run probes concurrently for high speed
    const [expressProbe, defaultMssqlProbe, port1433, port3306, port5432] = await Promise.all([
        probeMssqlInstance('SQLEXPRESS', 2500),
        probeMssqlInstance('', 2500),
        checkPort(1433, '127.0.0.1', 1000),
        checkPort(3306, '127.0.0.1', 1000),
        checkPort(5432, '127.0.0.1', 1000)
    ]);

    // 1. Check SQL Server Named Instance (SQLEXPRESS)
    if (expressProbe.available) {
        detected.push({
            id: 'mssql-express',
            name: 'Microsoft SQL Server Express (localhost\\SQLEXPRESS)',
            engine: 'mssql',
            server: 'localhost',
            instanceName: 'SQLEXPRESS',
            trustedConnection: true,
            version: expressProbe.version,
            databases: expressProbe.databases,
            recommendation: 'Used by Cobb Retail POS, Busy, Marg (MS-SQL edition)'
        });
    }

    // 2. Check Default SQL Server Instance (MSSQLSERVER)
    if (defaultMssqlProbe.available) {
        detected.push({
            id: 'mssql-default',
            name: 'Microsoft SQL Server Default (localhost)',
            engine: 'mssql',
            server: 'localhost',
            instanceName: '',
            trustedConnection: true,
            version: defaultMssqlProbe.version,
            databases: defaultMssqlProbe.databases,
            recommendation: 'Standard Enterprise SQL Server'
        });
    }

    // 3. Check TCP Port 1433 (Standard MSSQL Port)
    if (port1433.isOpen && !detected.find(d => d.engine === 'mssql')) {
        detected.push({
            id: 'mssql-tcp',
            name: 'SQL Server on Port 1433',
            engine: 'mssql',
            server: 'localhost',
            port: 1433,
            trustedConnection: false,
            recommendation: 'TCP/IP SQL Server'
        });
    }

    // 4. Check Port 3306 (MySQL / MariaDB)
    if (port3306.isOpen) {
        detected.push({
            id: 'mysql-3306',
            name: 'MySQL / MariaDB (Port 3306)',
            engine: 'mysql',
            server: 'localhost',
            port: 3306,
            recommendation: 'Common for Web POS and eCommerce integrations'
        });
    }

    // 5. Check Port 5432 (PostgreSQL)
    if (port5432.isOpen) {
        detected.push({
            id: 'postgres-5432',
            name: 'PostgreSQL Database (Port 5432)',
            engine: 'postgres',
            server: 'localhost',
            port: 5432,
            recommendation: 'Modern Cloud-Synchronized Retail ERP'
        });
    }

    return detected;
}

module.exports = {
    checkPort,
    probeMssqlInstance,
    scanLocalDatabases
};
