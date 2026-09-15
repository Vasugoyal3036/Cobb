# Phone Link Definition & Firebase Architecture

## Crucial Terminology Rule
When the user refers to the **"phone link"**, they are ALWAYS referring to the **Firebase Hosted App / Firebase Link**:
- **Hosting URL**: `https://cobb-store.web.app` or `https://cobb-store.firebaseapp.com`
- **Firebase Project ID**: `cobb-store`
- **Cloud Database**: Cloud Firestore (project `cobb-store`)

**NEVER** confuse the "phone link" with Vercel (`cobb-ui.vercel.app`) or local ngrok links.

## Deployment & Updates
- When changes are made to the frontend UI or dashboard tiles, build in `d:\cobbbb\cobb-ui` (`npm run build`) and deploy to Firebase Hosting (`npx -y firebase-tools deploy --only hosting`).
- When cloud state needs updating for the phone link, ensure Firestore documents under `stores/DEMO_STORE_001/` (e.g. `data/automation_status`) are synced.
