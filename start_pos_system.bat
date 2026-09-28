@echo off
title Cobb POS System - Unified Auto-Start & Watchdog
color 0A

echo ========================================================
echo   COBB STORE INTELLIGENCE - PRODUCTION POS LAUNCHER
echo   Auto-starting Backend, Cloud Sync, and POS Interface...
echo ========================================================
echo.

:: 1. Clear any stale lockfiles
del /q "%~dp0whatsapp_gateway\.wwebjs_auth\session-cobb-pos-session\*Singleton*" >nul 2>&1
del /q "%~dp0whatsapp_gateway\.wwebjs_auth\session-cobb-pos-session\DevToolsActivePort" >nul 2>&1
del /q "%~dp0whatsapp_gateway\.wwebjs_auth\session-cobb-pos-session\.parentlock" >nul 2>&1

:: 2. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in PATH! Please install Node.js.
    pause
    exit /b 1
)

:: 3. Launch Backend Server in background with Auto-Restart Watchdog
echo [1/3] Launching Backend API Server (Port 5000)...
start "Cobb Backend Watchdog" /min cmd /c "title Cobb Backend Watchdog && :loop && cd /d "%~dp0CobbDashboard" && node server.js && echo Backend exited, restarting in 3s... && timeout /t 3 /nobreak >nul && goto loop"

:: Wait 2 seconds for server to bind port
timeout /t 2 /nobreak >nul

:: 4. Launch Cloud Sync Agent in background with Auto-Restart Watchdog
echo [2/3] Launching Cloud Sync Agent & Instant Checkout Alerts...
start "Cobb Sync Agent Watchdog" /min cmd /c "title Cobb Sync Watchdog && :loop && cd /d "%~dp0CobbDashboard" && node cloud_sync.js && echo Sync agent exited, restarting in 5s... && timeout /t 5 /nobreak >nul && goto loop"

:: 5. Launch the POS Frontend
echo [3/3] Launching POS Interface...
if exist "%~dp0cobb-ui\dist-electron\main.js" (
    start "Cobb POS App" cmd /c "cd /d "%~dp0cobb-ui" && npm start"
) else (
    start "" "http://localhost:5000"
)

echo.
echo ========================================================
echo   ALL SERVICES ARE ACTIVE AND RUNNING WITH WATCHDOGS!
echo   - Local API Server:   http://localhost:5000
echo   - Phone Link Live:    https://cobb-store.web.app
echo   - Cloud Sync Agent:   Active (Auto-Syncing to Phone Link)
echo ========================================================
echo.
echo This launcher window will now close. Background services remain running.
timeout /t 3 >nul
exit
