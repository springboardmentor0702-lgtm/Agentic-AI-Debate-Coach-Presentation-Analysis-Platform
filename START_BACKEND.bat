@echo off
cd /d "%~dp0backend"
if not exist ".venv\Scripts\python.exe" (
 echo Run SETUP_WINDOWS.bat first.
 pause
 exit /b 1
)
echo Starting backend: http://127.0.0.1:8000
.venv\Scripts\python.exe -m uvicorn main:app --reload
pause
