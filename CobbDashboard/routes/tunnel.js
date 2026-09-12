const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let tunnelProcess = null;
let tunnelUrl = null;

// Find cloudflared binary - check common locations
function findCloudflared() {
    const possiblePaths = [
        path.join(__dirname, '..', 'cloudflared.exe'),
        path.join(__dirname, 'cloudflared.exe'),
        'cloudflared' // system PATH
    ];
    for (const p of possiblePaths) {
        if (p === 'cloudflared' || fs.existsSync(p)) return p;
    }
    return null;
}

// POST /api/tunnel/start
router.post('/start', async (req, res) => {
    if (tunnelUrl && tunnelProcess) {
        return res.json({ url: tunnelUrl, message: 'Tunnel already running' });
    }

    const cloudflaredPath = findCloudflared();
    if (!cloudflaredPath) {
        return res.status(500).json({
            error: 'cloudflared not found. Place cloudflared.exe in the project root folder.'
        });
    }

    const port = process.env.PORT || 5000;

    try {
        tunnelProcess = spawn(cloudflaredPath, [
            'tunnel', '--url', `http://localhost:${port}`
        ], { shell: false });

        // Cloudflare outputs the tunnel URL to stderr
        const urlPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Tunnel startup timed out after 15 seconds'));
            }, 15000);

            tunnelProcess.stderr.on('data', (data) => {
                const output = data.toString();
                console.log(`[Tunnel] ${output.trim()}`);

                // Match the trycloudflare.com URL
                const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
                if (match) {
                    clearTimeout(timeout);
                    resolve(match[0]);
                }
            });

            tunnelProcess.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });

            tunnelProcess.on('close', (code) => {
                if (!tunnelUrl) {
                    clearTimeout(timeout);
                    reject(new Error(`Tunnel exited with code ${code}`));
                }
                tunnelProcess = null;
                tunnelUrl = null;
            });
        });

        tunnelUrl = await urlPromise;
        console.log(`[Tunnel] ✅ Phone link ready: ${tunnelUrl}`);
        res.json({ url: tunnelUrl });

    } catch (err) {
        if (tunnelProcess) {
            tunnelProcess.kill();
            tunnelProcess = null;
        }
        tunnelUrl = null;
        console.error('[Tunnel] ❌ Failed to start:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/tunnel/stop
router.post('/stop', (req, res) => {
    if (tunnelProcess) {
        tunnelProcess.kill();
        tunnelProcess = null;
        tunnelUrl = null;
        console.log('[Tunnel] Stopped');
        res.json({ success: true, message: 'Tunnel stopped' });
    } else {
        res.json({ success: true, message: 'No tunnel was running' });
    }
});

// GET /api/tunnel/status
router.get('/status', (req, res) => {
    res.json({
        isRunning: !!tunnelUrl,
        url: tunnelUrl || null
    });
});

// Clean up on process exit
process.on('exit', () => {
    if (tunnelProcess) tunnelProcess.kill();
});

module.exports = router;
