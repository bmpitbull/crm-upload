@echo off
echo Starting CRM for mobile access...
echo.
echo Your computer IP: 10.1.10.170
echo.
echo Backend will be available at: http://10.1.10.170:3000
echo Frontend will be available at: http://10.1.10.170:3002
echo.
echo Make sure your phone is on the same WiFi network!
echo.

REM Start backend
cd backend
start "Backend Server" cmd /k "npm start"

REM Wait a moment for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend with host binding
cd ..\frontend
start "Frontend Server" cmd /k "set HOST=0.0.0.0 && set PORT=3002 && npm start"

echo.
echo Both servers are starting...
echo.
echo To access from your phone:
echo 1. Make sure your phone is on the same WiFi network
echo 2. Open browser on your phone
echo 3. Go to: http://10.1.10.170:3002
echo.
pause 