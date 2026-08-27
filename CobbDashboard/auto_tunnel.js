const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const UI_DIR = path.join(__dirname, '..', 'cobb-ui');
const ENV_FILE = path.join(UI_DIR, '.env.production');

console.log('🚀 Starting Auto-Tunnel Manager...');

// 1. Start LocalTunnel
const tunnel = spawn('npx', ['localtunnel', '--port', '5000'], { shell: true });

let urlFound = false;

tunnel.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[LocalTunnel] ${output.trim()}`);
    
    // LocalTunnel outputs the URL in stdout
    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.loca\.lt/);
    
    if (match && !urlFound) {
        urlFound = true;
        const url = match[0];
        console.log(`\n🎉 Found LocalTunnel URL: ${url}\n`);
        
        try {
            // 2. Update .env.production
            console.log('📝 Updating frontend config...');
            fs.writeFileSync(ENV_FILE, `VITE_API_URL=${url}\n`);
            console.log('✅ Config updated.');
            
            // 3. Deploy to Vercel with the new environment variable
            console.log('🚀 Deploying to Vercel (building on cloud)...');
            execSync(`npx -y vercel --prod -b VITE_API_URL=${url} -e VITE_API_URL=${url} -y`, { cwd: UI_DIR, stdio: 'inherit' });
            console.log('✅ Deployment successful! Your dashboard is now live.');
            
        } catch (err) {
            console.error('❌ Error during auto-deploy:', err.message);
        }
    }
});

tunnel.stdout.on('data', (data) => {
    console.log(`[Cloudflared] ${data.toString().trim()}`);
});

tunnel.on('close', (code) => {
    console.log(`❌ Tunnel process exited with code ${code}`);
    process.exit(code);
});

process.on('SIGINT', () => {
    tunnel.kill();
    process.exit();
});
