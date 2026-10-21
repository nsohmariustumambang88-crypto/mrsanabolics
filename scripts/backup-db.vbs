' Starts backup-db.cmd with no console window, so the scheduled backup runs silently.
' Task Scheduler runs: wscript.exe "<project>\scripts\backup-db.vbs"
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
CreateObject("WScript.Shell").Run "cmd.exe /c """ & here & "\backup-db.cmd""", 0, True
