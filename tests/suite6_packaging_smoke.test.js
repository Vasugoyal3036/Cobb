import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Suite 6: Packaging & Deployment Smoke Testing', () => {

    const ROOT_DIR = path.resolve('.');
    const UI_DIR = path.join(ROOT_DIR, 'cobb-ui');
    const DASHBOARD_DIR = path.join(ROOT_DIR, 'CobbDashboard');

    describe('1. Batch Launcher & Startup Script Integrity', () => {
        const requiredBatchFiles = [
            'start.bat',
            'start_pos_system.bat',
            'cobb_cloud_sync.bat',
            'build_package.bat',
            'install_autostart_on_boot.bat'
        ];

        requiredBatchFiles.forEach(file => {
            it(`should verify ${file} exists and is non-empty`, () => {
                const fullPath = path.join(ROOT_DIR, file);
                assert.ok(fs.existsSync(fullPath), `Launcher ${file} is missing!`);
                const stat = fs.statSync(fullPath);
                assert.ok(stat.size > 0, `${file} is empty!`);
            });
        });
    });

    describe('2. Firebase Hosting & Firestore Rules Configuration', () => {
        it('should have valid firebase.json configured to deploy from dist directory', () => {
            const firebaseJsonPath = path.join(UI_DIR, 'firebase.json');
            assert.ok(fs.existsSync(firebaseJsonPath), 'cobb-ui/firebase.json missing');

            const content = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
            assert.ok(content.hosting, 'hosting block missing in firebase.json');
            assert.equal(content.hosting.public, 'dist', 'Hosting public dir must point to dist');
        });

        it('should have firestore.rules defined for cloud database protection', () => {
            const rulesPath = path.join(UI_DIR, 'firestore.rules');
            assert.ok(fs.existsSync(rulesPath), 'firestore.rules missing');
            const rulesContent = fs.readFileSync(rulesPath, 'utf8');
            assert.ok(rulesContent.includes('rules_version'), 'firestore.rules must include rules_version');
            assert.ok(rulesContent.includes('stores'), 'firestore.rules must guard stores collection');
        });
    });

    describe('3. Production Build Artifact Validation', () => {
        it('should have production dist artifacts with index.html', () => {
            const distPath = path.join(UI_DIR, 'dist');
            assert.ok(fs.existsSync(distPath), 'cobb-ui/dist directory missing');
            
            const indexHtml = path.join(distPath, 'index.html');
            assert.ok(fs.existsSync(indexHtml), 'cobb-ui/dist/index.html missing');
            
            const htmlContent = fs.readFileSync(indexHtml, 'utf8');
            assert.ok(htmlContent.includes('<div id="root"></div>'), 'index.html must contain root container');
        });
    });

    describe('4. Environment Isolation & Template Compliance', () => {
        it('should have .env.example templates for onboarding new store environments', () => {
            const dashboardExample = path.join(DASHBOARD_DIR, '.env.example');
            assert.ok(fs.existsSync(dashboardExample), 'CobbDashboard/.env.example missing');

            const uiExample = path.join(UI_DIR, '.env.example');
            assert.ok(fs.existsSync(uiExample), 'cobb-ui/.env.example missing');
        });

        it('should ensure sensitive files are registered in .gitignore', () => {
            const rootGitignore = path.join(ROOT_DIR, '.gitignore');
            assert.ok(fs.existsSync(rootGitignore), 'Root .gitignore missing');
            
            const gitignoreContent = fs.readFileSync(rootGitignore, 'utf8');
            assert.ok(gitignoreContent.includes('node_modules'), 'node_modules must be in .gitignore');
        });
    });
});
