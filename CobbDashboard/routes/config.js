const express = require('express');
const router = express.Router();
const { scanLocalDatabases } = require('../scanner');
const { loadConfig, saveConfig, getSanitizedConfig, PRESETS, getDefaultConfig } = require('../config_manager');
const { testDatabaseConnection, connectDB, getDbStatus } = require('../db');

// GET /api/config/current - Retrieve active configuration, DB status, and available presets
router.get('/current', (req, res) => {
    try {
        const config = getSanitizedConfig();
        const status = getDbStatus();
        return res.json({
            success: true,
            configured: config.configured,
            config,
            status,
            presets: PRESETS
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/config/scan - Auto-scan localhost for running databases & SQL instances
router.post('/scan', async (req, res) => {
    try {
        const detected = await scanLocalDatabases();
        return res.json({
            success: true,
            detected,
            count: detected.length,
            message: detected.length > 0 
                ? `Found ${detected.length} running database engine(s) on your PC!` 
                : 'No active local database ports detected. You can configure manually.'
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/config/test - Test connection against arbitrary parameters
router.post('/test', async (req, res) => {
    try {
        const dbParams = req.body;
        if (!dbParams || !dbParams.server) {
            return res.status(400).json({ success: false, error: 'Database server host is required' });
        }

        // If password was masked, recover from saved config if testing current server
        if (dbParams.password === '********') {
            const saved = loadConfig();
            dbParams.password = saved.database?.password || '';
        }

        const testResult = await testDatabaseConnection(dbParams);
        return res.json(testResult);
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/config/save - Save settings and reconnect database
router.post('/save', async (req, res) => {
    try {
        const newSettings = req.body;
        if (!newSettings || typeof newSettings !== 'object') {
            return res.status(400).json({ success: false, error: 'Invalid configuration payload' });
        }

        const existing = loadConfig();

        // If database settings provided, handle masked password and live reconnect
        if (newSettings.database) {
            if (newSettings.database.password === '********') {
                newSettings.database.password = existing.database?.password || '';
            }
        }

        // Save to config.json
        const saveResult = saveConfig(newSettings);
        if (!saveResult.success) {
            return res.status(500).json(saveResult);
        }

        // Immediately flush global API cache so /api/financials/pnl and other endpoints recompute with new numbers
        if (req.app?.locals?.globalApiCache) {
            try {
                req.app.locals.globalApiCache.flushAll();
            } catch (cErr) {
                console.warn('[Config] Cache flush note:', cErr.message);
            }
        }

        // Trigger live reconnection only if database credentials/host changed
        let connectResult = { success: true };
        if (newSettings.database) {
            connectResult = await connectDB(newSettings.database);
        }

        return res.json({
            success: true,
            message: connectResult.success 
                ? 'Store configuration saved successfully!' 
                : `Configuration saved, but connection warning: ${connectResult.error}`,
            config: saveResult.config,
            status: getDbStatus()
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/config/reset-default - Reset to factory defaults
router.post('/reset-default', async (req, res) => {
    try {
        const def = getDefaultConfig();
        const saved = saveConfig(def);
        await connectDB(def.database);
        return res.json({
            success: true,
            message: 'Reset to factory defaults successfully',
            config: saved.config,
            status: getDbStatus()
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
