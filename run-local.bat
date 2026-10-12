@echo off
echo ==========================================================
echo   Starting Aegis Autonomous IT Support Agent Stack
echo ==========================================================

REM Start FastAPI Backend in background
echo [1/2] Starting FastAPI Backend on http://127.0.0.1:4000...
start "Aegis Backend" /B python -m uvicorn backend.app:app --host 127.0.0.1 --port 4000

REM Wait 2 seconds
timeout /t 2 /nobreak >nul

echo [2/2] Starting Vite Frontend on http://localhost:4173...
echo   Open your browser at: http://localhost:4173
echo ==========================================================
cd frontend
call npm run dev
