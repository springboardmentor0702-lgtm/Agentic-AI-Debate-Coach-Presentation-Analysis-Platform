@echo off
setlocal
cd /d "%~dp0backend"
echo ============================================
echo LOGOS.AI FIRST-TIME SETUP
 echo ============================================
if not exist ".venv\Scripts\python.exe" (
  echo Creating Python 3.12 virtual environment...
  py -3.12 -m venv .venv
  if errorlevel 1 python -m venv .venv
)
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 goto :error
cd /d "%~dp0frontend"
echo Installing frontend packages...
npm install
if errorlevel 1 goto :error
cd /d "%~dp0"
echo.
echo SETUP COMPLETE. Use START_BACKEND.bat and START_FRONTEND.bat.
pause
exit /b 0
:error
echo.
echo SETUP FAILED. Read the error above.
pause
exit /b 1
