# Project Knowledge & Guidelines

## Core Terminology: "Phone Link"
- **"Phone Link"** specifically means the **Firebase link**:
  - URL: `https://cobb-store.web.app` or `https://cobb-store.firebaseapp.com`
  - Firebase Project: `cobb-store`
  - Cloud Database: Firebase Firestore (`stores/DEMO_STORE_001/data/...`)
- Do NOT confuse "phone link" with Vercel or Ngrok.
- Whenever updating UI or cloud data for the "phone link", ensure:
  1. Frontend is built and deployed to Firebase Hosting (`npm run build` && `npx -y firebase-tools deploy --only hosting` in `cobb-ui/`).
  2. Cloud sync updates Firestore properly (under `stores/DEMO_STORE_001/data/automation_status`, etc.).
