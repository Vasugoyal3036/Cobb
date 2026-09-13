const fs = require('fs');
const path = require('path');
require('dotenv').config();

const CONFIG_FILE = path.join(__dirname, 'store_config.json');

const PRESETS = {
    cobb: {
        id: 'cobb',
        name: 'Cobb / WizApp Retail POS',
        engine: 'mssql',
        server: 'localhost',
        instanceName: 'SQLEXPRESS',
        database: 'RPD_AVATAR01_NEW_ST_POS',
        trustedConnection: true,
        user: '',
        password: '',
        port: 1433
    },
    busy: {
        id: 'busy',
        name: 'Busy Accounting',
        engine: 'mssql',
        server: 'localhost',
        instanceName: '',
        database: '',
        trustedConnection: true,
        user: 'sa',
        password: '',
        port: 1433
    },
    marg: {
        id: 'marg',
        name: 'Marg ERP 9+',
        engine: 'mssql',
        server: 'localhost',
        instanceName: '',
        database: '',
        trustedConnection: false,
        user: 'sa',
        password: '',
        port: 1433
    },
    custom_mssql: {
        id: 'custom_mssql',
        name: 'Custom Microsoft SQL Server',
        engine: 'mssql',
        server: 'localhost',
        instanceName: 'SQLEXPRESS',
        database: '',
        trustedConnection: true,
        user: 'sa',
        password: '',
        port: 1433
    },
    custom_mysql: {
        id: 'custom_mysql',
        name: 'Custom MySQL / MariaDB',
        engine: 'mysql',
        server: 'localhost',
        port: 3306,
        database: '',
        user: 'root',
        password: ''
    }
};

function getDefaultConfig() {
    return {
        configured: true,
        presetId: 'cobb',
        storeProfile: {
            storeName: process.env.STORE_NAME || 'Cobb Apparels',
            branch: process.env.STORE_BRANCH || 'Pundri',
            city: process.env.STORE_CITY || 'Pundri',
            ownerPhones: ['9138122820', '8708788707', '9034522000', '9466422821'],
            currency: '₹'
        },
        database: {
            engine: 'mssql',
            server: process.env.DB_SERVER || 'localhost',
            instanceName: process.env.DB_INSTANCE || 'SQLEXPRESS',
            database: process.env.DB_NAME || 'RPD_AVATAR01_NEW_ST_POS',
            trustedConnection: process.env.DB_USER ? false : true,
            user: process.env.DB_USER || '',
            password: process.env.DB_PASSWORD || '',
            port: 1433
        }
    };
}

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            return {
                ...getDefaultConfig(),
                ...parsed,
                storeProfile: {
                    ...getDefaultConfig().storeProfile,
                    ...(parsed.storeProfile || {})
                },
                database: {
                    ...getDefaultConfig().database,
                    ...(parsed.database || {})
                }
            };
        }
    } catch (err) {
        console.error('Error reading store_config.json, using defaults:', err.message);
    }
    return getDefaultConfig();
}

function saveConfig(newConfig) {
    try {
        const merged = {
            ...loadConfig(),
            ...newConfig,
            configured: true,
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
        return { success: true, config: getSanitizedConfig(merged) };
    } catch (err) {
        console.error('Error writing store_config.json:', err.message);
        return { success: false, error: err.message };
    }
}

function getSanitizedConfig(cfg = loadConfig()) {
    const safe = JSON.parse(JSON.stringify(cfg));
    if (safe.database && safe.database.password) {
        safe.database.hasPassword = true;
        safe.database.password = '********'; // Mask password for UI safety
    } else if (safe.database) {
        safe.database.hasPassword = false;
    }
    return safe;
}

module.exports = {
    PRESETS,
    loadConfig,
    saveConfig,
    getSanitizedConfig,
    getDefaultConfig
};
