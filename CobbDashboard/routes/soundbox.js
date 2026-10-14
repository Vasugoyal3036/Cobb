const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');

const CACHE_DIR = path.join(__dirname, '../uploads/tts_cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Map short voice IDs to Edge Neural voice names
const VOICE_MAP = {
  'madhur': 'hi-IN-MadhurNeural',
  'swara': 'hi-IN-SwaraNeural',
  'prabhat': 'en-IN-PrabhatNeural',
  'neerja': 'en-IN-NeerjaNeural',
  'amitabh': 'hi-IN-MadhurNeural', // Realistic Indian Baritone
  'srk': 'en-IN-PrabhatNeural',
  'salman': 'hi-IN-MadhurNeural',
  'sunny': 'hi-IN-MadhurNeural',
  'babu_bhaiya': 'hi-IN-MadhurNeural',
  'raju': 'hi-IN-MadhurNeural'
};

router.post('/neural-tts', async (req, res) => {
  try {
    const text = req.body?.text || req.query?.text;
    const requestedVoice = req.body?.voice || req.query?.voice || 'madhur';

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text parameter is required' });
    }

    const voice = VOICE_MAP[requestedVoice] || requestedVoice;
    const hash = crypto.createHash('md5').update(`${voice}_${text}`).digest('hex');
    const cachePath = path.join(CACHE_DIR, `${hash}.mp3`);

    // Return cached audio if already generated
    if (fs.existsSync(cachePath)) {
      res.set('Content-Type', 'audio/mpeg');
      res.set('X-TTS-Cache', 'HIT');
      return fs.createReadStream(cachePath).pipe(res);
    }

    // Generate with edge-tts CLI script
    const scriptPath = path.join(__dirname, '../scripts/neural_tts.py');
    const py = spawn('python', [scriptPath, text, voice, cachePath]);

    py.on('close', (code) => {
      if (code === 0 && fs.existsSync(cachePath)) {
        res.set('Content-Type', 'audio/mpeg');
        res.set('X-TTS-Cache', 'MISS');
        return fs.createReadStream(cachePath).pipe(res);
      } else {
        return res.status(500).json({ error: 'Failed to generate neural speech', exitCode: code });
      }
    });

    py.on('error', (err) => {
      return res.status(500).json({ error: 'Python TTS execution error', message: err.message });
    });

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

router.get('/neural-tts', async (req, res) => {
  req.body = req.query;
  router.handle(req, res);
});

module.exports = router;
