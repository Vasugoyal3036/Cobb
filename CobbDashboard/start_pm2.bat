cd /d d:\cobbbb\CobbDashboard
pm2 start server.js --name "cobb-backend"
pm2 start cloud_sync.js --name "cobb-sync"
pm2 save
