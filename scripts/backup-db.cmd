@echo off
rem Run by Windows Task Scheduler ("MrAnabolics DB backup", every 3 hours).
rem Exports every table to backups\<timestamp>\ and prunes automatic backups older than 7 days.
rem Output is appended to backups\backup.log.
cd /d "%~dp0.."
if not exist backups mkdir backups
echo ==== %date% %time% ==== >> backups\backup.log
"C:\Program Files\nodejs\node.exe" --env-file=.env scripts\backup-db.mjs >> backups\backup.log 2>&1
echo exit code %errorlevel% >> backups\backup.log
