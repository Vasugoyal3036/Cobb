module.exports = {
  apps: [
    {
      name: "cobb-backend",
      script: "server.js",
      watch: false,
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
    }
  ]
};
