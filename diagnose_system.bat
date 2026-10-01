@echo off
title Cobb POS - System Health Diagnostics
color 0B
echo Running Cobb Retail POS Diagnostics...
echo.
node "%~dp0diagnose_system.js"
echo.
pause
