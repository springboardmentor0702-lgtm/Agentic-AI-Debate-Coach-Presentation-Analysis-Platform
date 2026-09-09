@echo off
cd /d "%~dp0frontend"
if not exist "node_modules" (
 echo Run SETUP_WINDOWS.bat first.
 pause
 exit /b 1
)
echo Starting frontend: http://localhost:3000
npm run dev
pause
