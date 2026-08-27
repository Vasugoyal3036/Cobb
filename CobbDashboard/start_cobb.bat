@echo off
echo ========================================================
echo Cobb Store Intelligence System
echo ========================================================
echo.
echo Starting your servers safely in the background...
call npx pm2 start ecosystem.config.js
timeout /t 3 /nobreak >nul
echo.
echo Checking server status...
call npx pm2 list
echo.
echo Opening your live dashboard in the browser...
start https://cobb-ui.vercel.app
echo.
echo You can safely close this window.
pause
