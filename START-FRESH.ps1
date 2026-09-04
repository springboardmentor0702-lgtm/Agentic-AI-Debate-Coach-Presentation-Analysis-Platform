$ErrorActionPreference = 'Stop'
Write-Host "Stopping and deleting THIS project's containers, networks, and database volumes..." -ForegroundColor Yellow
docker compose down -v --remove-orphans
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
Write-Host "Starting fresh ARGUAI..." -ForegroundColor Cyan
docker compose up -d --build
Write-Host "Waiting for services..." -ForegroundColor Cyan
Start-Sleep -Seconds 8
docker compose ps
Write-Host "`nOpen http://localhost:3200" -ForegroundColor Green
