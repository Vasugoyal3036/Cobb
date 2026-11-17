# ==============================================================================
# COBB Retail Command Center — Windows Global Keyboard Shortcut Installer
# Sets up Windows Desktop & Start Menu shortcuts with Ctrl+Shift+X global hotkey
# ==============================================================================

$sh = New-Object -ComObject WScript.Shell

$exeCandidates = @(
  "C:\Users\hp\AppData\Local\Programs\cobb-ui\ORS.exe",
  "$env:LOCALAPPDATA\Programs\cobb-ui\ORS.exe",
  "$env:LOCALAPPDATA\Programs\cobb-ui\cobb-ui.exe"
)

$exePath = $exeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $exePath) {
  Write-Error "[Shortcut Setup] Could not find installed ORS.exe in LocalAppData\Programs\cobb-ui"
  exit 1
}

$workingDir = Split-Path -Path $exePath -Parent
$hotkey = "Ctrl+Shift+X"
$desc = "COBB Retail POS & Intelligence Command Center [Ctrl+Shift+X]"
$name = "COBB Retail Command Center.lnk"

# 1. Desktop Shortcut
$desktopPath = Join-Path ([Environment]::GetFolderPath('Desktop')) $name
$desktopLnk = $sh.CreateShortcut($desktopPath)
$desktopLnk.TargetPath = $exePath
$desktopLnk.WorkingDirectory = $workingDir
$desktopLnk.Hotkey = $hotkey
$desktopLnk.Description = $desc
$desktopLnk.IconLocation = "$exePath,0"
$desktopLnk.Save()
Write-Host "✅ Desktop shortcut created: $desktopPath [Hotkey: $hotkey]" -ForegroundColor Green

# 2. Start Menu Shortcut
$startMenuDir = Join-Path ([Environment]::GetFolderPath('StartMenu')) "Programs"
$startMenuPath = Join-Path $startMenuDir $name
$startMenuLnk = $sh.CreateShortcut($startMenuPath)
$startMenuLnk.TargetPath = $exePath
$startMenuLnk.WorkingDirectory = $workingDir
$startMenuLnk.Hotkey = $hotkey
$startMenuLnk.Description = $desc
$startMenuLnk.IconLocation = "$exePath,0"
$startMenuLnk.Save()
Write-Host "✅ Start Menu shortcut created: $startMenuPath [Hotkey: $hotkey]" -ForegroundColor Green

# 3. Notify Windows Explorer shell
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinShellNotify {
    [DllImport("shell32.dll")]
    public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);
}
"@ -ErrorAction SilentlyContinue

try {
  [WinShellNotify]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
  Write-Host "✅ Windows Explorer shell refreshed." -ForegroundColor Cyan
} catch {
  # Non-fatal
}
