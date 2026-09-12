@echo off
title Cobb Store Intelligence System - Local Launcher
echo ========================================================
echo Starting Cobb Store Intelligence System (Local Setup)
echo ========================================================
echo.

:: 1. Clean stale Chromium locks if PC was rebooted abruptly
del /q /s "C:\CobbWhatsAppGateway\.wwebjs_auth\session-cobb-pos-session\*Singleton*" >nul 2>&1
del /q /s "C:\CobbWhatsAppGateway\.wwebjs_auth\session-cobb-pos-session\DevToolsActivePort" >nul 2>&1
del /q /s "C:\CobbWhatsAppGateway\.wwebjs_auth\session-cobb-pos-session\.parentlock" >nul 2>&1

:: 2. Start the Backend server in a new window
echo [1/3] Starting Backend Server...
start "Cobb Backend Server" cmd /c "cd CobbDashboard && node server.js"

:: Give the backend 2 seconds to bind to port 5000
timeout /t 2 /nobreak >nul

:: 2. Start the Frontend Vite dev server in a new window
echo [2/3] Starting Frontend Dev Server...
start "Cobb UI Frontend" cmd /c "cd cobb-ui && npm run dev"

:: Give the frontend 2 seconds to start up
timeout /t 2 /nobreak >nul

:: 3. Open the local browser (Vite default is http://localhost:5173)
echo [3/3] Opening dashboard in your browser...
start http://localhost:5173

echo.
echo ========================================================
echo All servers are running!
echo You can close this command prompt. 
echo To stop the servers, close the separate node/npm windows.
echo ========================================================
echo.
pause
