Write-Host "Starting CRM for mobile access..." -ForegroundColor Green
Write-Host ""
Write-Host "Your computer IP: 10.1.10.170" -ForegroundColor Yellow
Write-Host ""
Write-Host "Backend will be available at: http://10.1.10.170:3000" -ForegroundColor Cyan
Write-Host "Frontend will be available at: http://10.1.10.170:3002" -ForegroundColor Cyan
Write-Host ""
Write-Host "Make sure your phone is on the same WiFi network!" -ForegroundColor Red
Write-Host ""

# Start backend
Write-Host "Starting backend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm start"

# Wait for backend to start
Start-Sleep -Seconds 3

# Start frontend with host binding
Write-Host "Starting frontend server..." -ForegroundColor Green
$env:HOST = "0.0.0.0"
$env:PORT = "3002"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start"

Write-Host ""
Write-Host "Both servers are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "To access from your phone:" -ForegroundColor Yellow
Write-Host "1. Make sure your phone is on the same WiFi network" -ForegroundColor White
Write-Host "2. Open browser on your phone" -ForegroundColor White
Write-Host "3. Go to: http://10.1.10.170:3002" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 