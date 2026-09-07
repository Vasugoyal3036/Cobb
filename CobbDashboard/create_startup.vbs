Set WshShell = CreateObject("WScript.Shell")
startupFolder = WshShell.SpecialFolders("Startup")
Set oShellLink = WshShell.CreateShortcut(startupFolder & "\CobbServers.lnk")
oShellLink.TargetPath = "d:\cobbbb\CobbDashboard\start_pm2.bat"
oShellLink.WindowStyle = 7 ' Minimized
oShellLink.Save
