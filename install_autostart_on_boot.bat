@echo off
title Install Cobb POS Auto-Start on Windows Boot
color 0B

echo ========================================================
echo   COBB STORE INTELLIGENCE - WINDOWS AUTO-BOOT SETUP
echo   This will make Cobb POS start automatically when the
echo   store computer is switched on or restarts after power.
echo ========================================================
echo.

set "TARGET_BAT=%~dp0start_pos_system.bat"
set "SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\CobbPOS_AutoStart.lnk"

echo Creating Windows Startup Shortcut...
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%~dp0'; $s.WindowStyle = 7; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo.
    echo ========================================================
    echo   [SUCCESS] Cobb POS is now set to AUTO-START on Windows boot!
    echo   Whenever this PC powers on, Backend and Cloud Sync will
    echo   start automatically in the background.
    echo ========================================================
) else (
    echo [ERROR] Failed to create startup shortcut. You can manually copy start_pos_system.bat to shell:startup.
)

echo.
pause
