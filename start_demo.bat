@echo off
setlocal
echo ========================================================
echo   OmniAgent AI - Universal Website AI Agent Platform
echo ========================================================

netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul
if errorlevel 1 (
    echo Starting Backend Server on http://localhost:8000 ...
    start "Backend - FastAPI" /D "%~dp0backend" cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
) else (
    echo Backend is already running on port 8000.
)

netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul
if errorlevel 1 (
    echo Starting Frontend Server on http://localhost:3000 ...
    start "Frontend - Next.js" /D "%~dp0frontend" cmd /k "npm run dev"
) else (
    echo Frontend is already running on port 3000.
)

echo.
echo Application servers are available:
echo Frontend: http://localhost:3000
echo Backend API Docs: http://localhost:8000/docs
echo ========================================================
