@echo off
title Cobb Retail CRM - Distribution Package Builder
echo ============================================================
echo   Cobb Retail CRM - Creating Shareable Distribution Package
echo ============================================================
echo.

:: Set the output folder name
set DIST_FOLDER=CobbRetailCRM_Package
set OUTPUT_PATH=%~dp0%DIST_FOLDER%

:: Clean previous build
if exist "%OUTPUT_PATH%" (
    echo Cleaning previous package...
    rmdir /S /Q "%OUTPUT_PATH%"
)
mkdir "%OUTPUT_PATH%"

echo [1/6] Copying Backend (CobbDashboard)...
xcopy "CobbDashboard\*.js" "%OUTPUT_PATH%\CobbDashboard\" /Y /Q >nul
xcopy "CobbDashboard\*.json" "%OUTPUT_PATH%\CobbDashboard\" /Y /Q >nul
xcopy "CobbDashboard\.env.example" "%OUTPUT_PATH%\CobbDashboard\" /Y /Q >nul
xcopy "CobbDashboard\routes\*.*" "%OUTPUT_PATH%\CobbDashboard\routes\" /Y /Q /I >nul
if exist "CobbDashboard\uploads" mkdir "%OUTPUT_PATH%\CobbDashboard\uploads"

echo [2/6] Copying Frontend (cobb-ui)...
xcopy "cobb-ui\src" "%OUTPUT_PATH%\cobb-ui\src\" /E /Y /Q >nul
xcopy "cobb-ui\public" "%OUTPUT_PATH%\cobb-ui\public\" /E /Y /Q >nul
xcopy "cobb-ui\electron" "%OUTPUT_PATH%\cobb-ui\electron\" /E /Y /Q >nul
copy "cobb-ui\package.json" "%OUTPUT_PATH%\cobb-ui\" /Y >nul
copy "cobb-ui\package-lock.json" "%OUTPUT_PATH%\cobb-ui\" /Y >nul
copy "cobb-ui\vite.config.js" "%OUTPUT_PATH%\cobb-ui\vite.config.js" /Y >nul
copy "cobb-ui\index.html" "%OUTPUT_PATH%\cobb-ui\index.html" /Y >nul
copy "cobb-ui\.env.example" "%OUTPUT_PATH%\cobb-ui\.env.example" /Y >nul
copy "cobb-ui\electron-builder.yml" "%OUTPUT_PATH%\cobb-ui\electron-builder.yml" /Y >nul
if exist "cobb-ui\.prettierrc" copy "cobb-ui\.prettierrc" "%OUTPUT_PATH%\cobb-ui\.prettierrc" /Y >nul
if exist "cobb-ui\eslint.config.js" copy "cobb-ui\eslint.config.js" "%OUTPUT_PATH%\cobb-ui\eslint.config.js" /Y >nul

echo [3/6] Copying WhatsApp Gateway...
if exist "whatsapp_gateway" (
    xcopy "whatsapp_gateway\*.js" "%OUTPUT_PATH%\whatsapp_gateway\" /Y /Q >nul
    xcopy "whatsapp_gateway\*.json" "%OUTPUT_PATH%\whatsapp_gateway\" /Y /Q >nul
)

echo [4/6] Copying Cloudflared...
if exist "cloudflared.exe" copy "cloudflared.exe" "%OUTPUT_PATH%\cloudflared.exe" /Y >nul

echo [5/6] Copying Launcher and Docs...
copy "start_local.bat" "%OUTPUT_PATH%\start_local.bat" /Y >nul
copy "README.md" "%OUTPUT_PATH%\README.md" /Y >nul
copy "architecture_breakdown.md" "%OUTPUT_PATH%\architecture_breakdown.md" /Y >nul

echo [6/6] Creating setup helper script...
(
echo @echo off
echo title Cobb Retail CRM - First Time Setup
echo echo ============================================================
echo echo   Cobb Retail CRM - First Time Setup
echo echo ============================================================
echo echo.
echo echo Step 1: Installing Backend dependencies...
echo cd CobbDashboard
echo call npm install
echo echo.
echo echo Step 2: Installing Frontend dependencies...
echo cd ..\cobb-ui
echo call npm install
echo echo.
echo echo ============================================================
echo echo   Setup Complete!
echo echo.
echo echo   NEXT STEPS:
echo echo   1. Open CobbDashboard\.env.example, save it as .env
echo echo      and fill in your SQL Server database details.
echo echo.
echo echo   2. Open cobb-ui\.env.example, save it as .env
echo echo      ^(Firebase fields are optional^).
echo echo.
echo echo   3. Double-click start_local.bat to launch the CRM!
echo echo ============================================================
echo pause
) > "%OUTPUT_PATH%\SETUP.bat"

echo.
echo ============================================================
echo   Package created successfully!
echo   Location: %OUTPUT_PATH%
echo.
echo   Share this folder with your buyer. They need to:
echo   1. Install Node.js from https://nodejs.org
echo   2. Have SQL Server Express installed
echo   3. Double-click SETUP.bat (one-time)
echo   4. Configure their .env files
echo   5. Double-click start_local.bat to run!
echo ============================================================
echo.
pause
