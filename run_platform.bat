@echo off
title Veritas AI - Agentic Debate Coach & Presentation Analysis Platform
echo =========================================================================
echo   Starting Veritas AI: Agentic Debate Coach & Presentation Analysis
echo =========================================================================
echo.

echo [1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "Veritas AI Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000"

timeout /t 3 >nul

echo [2/3] Starting Next.js Production Frontend on http://localhost:3000 ...
start "Veritas AI Frontend" cmd /k "cd /d %~dp0frontend && npm start"

timeout /t 3 >nul

echo [3/3] Opening Veritas AI in your default browser...
start http://localhost:3000/dashboard

echo.
echo =========================================================================
echo   Platform is LIVE!
echo   Main URL: http://localhost:3000/dashboard
echo   Local Network URL (for phones/tablets): http://192.168.183.1:3000/dashboard
echo   API Docs: http://127.0.0.1:8000/docs
echo =========================================================================
pause
