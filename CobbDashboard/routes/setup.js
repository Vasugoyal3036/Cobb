const express = require('express');
const router = express.Router();
const { performAiSchemaMapping } = require('../ai_mapper');
const fs = require('fs');
const path = require('path');

router.post('/map-schema', async (req, res) => {
    try {
        const { engine, host, port, database, username, password } = req.body;
        
        if (!engine || !host || !database || !username) {
            return res.status(400).json({ error: "Missing required database credentials." });
        }

        console.log(`[Setup API] Initiating AI Schema Mapping for ${database} on ${host} (${engine})...`);
        
        const mappingResult = await performAiSchemaMapping({
            engine, host, port, database, username, password
        });

        // Save the mapping to a local config file so server.js can use it for dynamic queries later
        const mappingPath = path.join(__dirname, '..', 'schema_map.json');
        fs.writeFileSync(mappingPath, JSON.stringify(mappingResult, null, 2));

        res.json({
            success: true,
            message: "AI Schema Mapping Complete",
            mapping: mappingResult
        });

    } catch (err) {
        console.error("[Setup API] Mapping failed:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
