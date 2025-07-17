# Appointment CRM Startup Script
Write-Host "Starting Appointment CRM System..." -ForegroundColor Green

# Run migration first
Write-Host "Running database migration..." -ForegroundColor Yellow
cd backend
node migrate-appointments.js
cd ..

# Start backend in background
Write-Host "Starting backend on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm start" -WindowStyle Minimized

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend in background
Write-Host "Starting frontend on port 3002..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; `$env:PORT=3002; npm start" -WindowStyle Minimized

Write-Host "Services starting..." -ForegroundColor Green
Write-Host "Backend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3002" -ForegroundColor Cyan
Write-Host "Mobile access: http://YOUR_IP_ADDRESS:3002" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "Appointment Features:" -ForegroundColor Yellow
Write-Host "- Calendar view with appointments" -ForegroundColor White
Write-Host "- Schedule new appointments with voice input" -ForegroundColor White
Write-Host "- Link appointments to contacts" -ForegroundColor White
Write-Host "- View appointments by business" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 