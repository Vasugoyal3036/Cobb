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
        if (!newSettings || !newSettings.database) {
            return res.status(400).json({ success: false, error: 'Invalid configuration payload' });
        }

        // If password is masked, preserve existing password
        if (newSettings.database.password === '********') {
            const existing = loadConfig();
            newSettings.database.password = existing.database?.password || '';
        }

        // Save to config.json
        const saveResult = saveConfig(newSettings);
        if (!saveResult.success) {
            return res.status(500).json(saveResult);
        }

        // Trigger live reconnection
        const connectResult = await connectDB(newSettings.database);

        return res.json({
            success: true,
            message: connectResult.success 
                ? 'Configuration saved and database connected successfully!' 
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
