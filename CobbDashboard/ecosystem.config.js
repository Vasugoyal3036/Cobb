module.exports = {
  apps: [
    {
      name: "cobb-backend",
      script: "server.js",
      kill_timeout: 10000,
      watch: ["server.js"],
      ignore_watch: [
        "node_modules",
        "*.log",
        "*.txt",
        "*.json",
        ".wwebjs_auth",
        "sent_bills.txt",
        "sent_eod_date.txt",
        "automation_dispatches.json",
        "automation_engine.log",
        "customer_numbers.txt"
      ],
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "cobb-ngrok",
      script: "auto_ngrok.js",
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "cobb-sync",
      script: "cloud_sync.js",
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
