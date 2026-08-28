const ngrok = require('@ngrok/ngrok');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const UI_DIR = path.join(__dirname, '..', 'cobb-ui');
const ENV_FILE = path.join(UI_DIR, '.env.production');

const NGROK_TOKEN = '3IOUOV67ZurHz3dTWzTTTKBxYwE_2M2wf4ygPQSeqHDzLVjHF';
const NGROK_DOMAIN = 'freckles-comfy-proving.ngrok-free.dev';

async function startTunnel() {
    console.log('🚀 Starting Auto-Ngrok Manager...');
    try {
        const listener = await ngrok.forward({
            addr: 5000,
            authtoken: NGROK_TOKEN,
            domain: NGROK_DOMAIN
        });
        
        const NGROK_URL = listener.url();
        console.log(`\n🎉 Found Ngrok URL: ${NGROK_URL}\n`);
        
        console.log('📝 Updating frontend config...');
        fs.writeFileSync(ENV_FILE, `VITE_API_URL=${NGROK_URL}\n`);
        console.log('✅ Config updated.');
        

        
        console.log('Ngrok tunnel is active. Keeping process alive...');
        // Keep the Node process running infinitely
        setInterval(() => {}, 1000 * 60 * 60);
    } catch (e) {
        console.error('❌ Error during ngrok start:', e.message || e);
        process.exit(1);
    }
}

startTunnel();
