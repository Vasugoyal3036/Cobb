# Cobb Dashboard & Sync Agent Setup Guide

This guide explains how to set up the complete Cobb CRM & Analytics Dashboard on a new Windows computer.

## Prerequisites
Before you begin, ensure the new system has the following installed:
1. **Node.js**: Download and install the latest LTS version from [nodejs.org](https://nodejs.org/).
2. **SQL Server / WizApp Database**: The computer must have access to the WizApp SQL Server database.

## 1. Transfer the Files
Copy the entire project folder (e.g., `d:\cobbbb`) to the friend's system. This includes both the backend (`CobbDashboard`) and the frontend (`cobb-ui`).

## 2. Configure the Database Connection
The backend needs to know how to connect to the SQL Server on the new computer.
1. Open `CobbDashboard\db.js` in a text editor (like VS Code or Notepad).
2. Update the `config` object to match the new system's SQL Server details:
   ```javascript
   const config = {
       server: 'localhost', // Change if the DB is on a different server
       database: 'RPD_AVATAR01_NEW_ST_POS', // Ensure this matches their actual database name
       options: {
           instanceName: 'SQLEXPRESS', // Change if their SQL instance name is different
           trustedConnection: true, // Keep true if using Windows Authentication
           requestTimeout: 120000
       }
   };
   ```

## 3. Install Dependencies
Open two separate Command Prompt or PowerShell windows.

**Terminal 1: Backend Setup**
1. Navigate to the backend folder: `cd path\to\cobbbb\CobbDashboard`
2. Run: `npm install`

**Terminal 2: Frontend Setup**
1. Navigate to the frontend folder: `cd path\to\cobbbb\cobb-ui`
2. Run: `npm install`

## 4. Run the Application
You need to run three separate processes for the entire system to work.

**Process 1: Start the Backend Server**
- In your backend terminal (`CobbDashboard`), run:
  ```bash
  node server.js
  ```
  *(You should see "Connected to WizApp SQL Database successfully!")*

**Process 2: Start the Cloud Sync Agent**
- Open a new terminal in the `CobbDashboard` folder and run:
  ```bash
  node cloud_sync.js
  ```
  *(This will start syncing the local SQL data to the Firebase cloud so the phone app works).*
  *Note: Make sure your `.env` file or Firebase service account key is copied over so it has permission to write to the cloud!*

**Process 3: Start the Frontend UI**
- In your frontend terminal (`cobb-ui`), run:
  ```bash
  npm run dev
  ```
- This will give you a local URL (like `http://localhost:5173/`). Open this in Chrome or Edge to view the dashboard!
