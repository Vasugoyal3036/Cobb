# Cobb Retail CRM

A robust, multi-tenant Fashion Retail CRM and Analytics Dashboard.

## Features
- **Multi-Tenant Ready**: Supports multiple stores and deployments with environment-level database and configuration isolation.
- **Role-Based Access Control**: Differentiates access for Store Owners, Managers, and Sales Representatives.
- **Offline-First Resilience**: Local database syncs seamlessly with Firebase for cloud access.
- **AI-Powered Insights**: Built-in AI forecasting for trends and smart wardrobe coordination.

## Prerequisites
- Node.js (v18 or higher)
- SQL Server (or SQL Express)

## Installation & Setup

1. **Clone or Extract the Repository**
2. **Environment Configuration**
   - In `CobbDashboard/`, copy `.env.example` to `.env` and fill in your SQL Server credentials and JWT secret.
   - In `cobb-ui/`, copy `.env.example` to `.env` and set your API URL (e.g. `http://localhost:5000`).

3. **Install Dependencies**
   ```bash
   cd CobbDashboard
   npm install
   
   cd ../cobb-ui
   npm install
   ```

4. **Running the Application**
   - **Backend API**: `cd CobbDashboard && npm start` (or `node server.js`)
   - **Frontend UI**: `cd cobb-ui && npm run dev`

5. **Initial Setup Wizard**
   Open the Frontend URL (usually `http://localhost:5173`) in your browser. If you are logging in for the first time without an active session, you can run through the Setup Wizard to initialize the store details.

## Production Deployment
- **Database**: Ensure your SQL instance accepts connections if deployed to a VM.
- **Backend (PM2)**: We recommend running the Node.js backend using PM2 (`pm2 start server.js --name "cobb-backend"`).
- **Frontend**: Build the React app (`npm run build`) and serve using Nginx, Firebase Hosting, or packaged Electron desktop (`npm run build:desktop`).

## Multi-Store Setup (Adding a New Cobb Store PC)

To monitor and sync a new branch (e.g. Karnal, Panipat, Ambala):

1. **On the New Store PC:**
   - Install **Node.js LTS** (v20+) and **Git**.
   - Clone this repository:
     ```bash
     git clone https://github.com/Vasugoyal3036/Cobb.git C:\Cobb
     cd C:\Cobb
     ```
2. **Install Dependencies:**
   ```bash
   cd CobbDashboard && npm install
   cd ../cobb-ui && npm install
   ```
3. **Configure New Store Identity:**
   - Set the unique `STORE_ID` in `CobbDashboard/.env`:
     ```env
     STORE_ID=STORE_02
     STORE_NAME="Cobb Apparels"
     STORE_BRANCH="Karnal"
     ```
   - (Or configure Store ID and operating expenses directly in the app's **Store Expenses** modal / Setup Screen).
4. **Start the Store Services:**
   - Run backend & cloud sync: `npm start` in `CobbDashboard` (or via PM2: `pm2 start ecosystem.config.js`).
   - Launch desktop app: `npm start` in `cobb-ui`.
5. **Real-Time Remote Visibility:**
   - Data from the new store automatically syncs to Firebase Firestore under `stores/STORE_02/data/...`.
   - On the **Phone Link** (`https://cobb-store.web.app`) and main desktop dashboard, switch between stores or view the combined HQ overview via the top store dropdown.

