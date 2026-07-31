@echo off
echo Starting Digital Card App...

start "Backend Server" cmd /k "cd /d "%~dp0server" && npm run dev"
timeout /t 3 /nobreak >nul
start "Frontend Server" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo Both servers are starting...
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
timeout /t 5 /nobreak >nul
start http://localhost:5173
