@echo off
echo =====================================================================
echo Starting Agentic AI Debate Coach & Presentation Analysis Platform
echo =====================================================================

REM Start Backend
start "Debate Coach Backend (FastAPI)" cmd /k "cd backend && python run_backend.py"

REM Start Frontend
start "Debate Coach Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo Backend running on: http://localhost:8000
echo Frontend running on: http://localhost:5173
echo API Documentation:   http://localhost:8000/docs
echo =====================================================================
