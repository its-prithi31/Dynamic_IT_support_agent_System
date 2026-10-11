<#
.SYNOPSIS
  Starts both the Aegis Backend (FastAPI on port 4000) and Frontend (Vite on port 4173).
.EXAMPLE
  .\scripts\run-all.ps1
#>

$root = Split-Path -Parent $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting Aegis Autonomous IT Support Agent Stack" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Check Python
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "[ERROR] Python was not found on PATH. Please install Python 3.10+." -ForegroundColor Red
    exit 1
}

# Start Backend in background or separate job
Write-Host "[1/2] Starting Backend (FastAPI on http://127.0.0.1:4000)..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    param($repoRoot)
    Set-Location $repoRoot
    python -m uvicorn backend.app:app --host 127.0.0.1 --port 4000
} -ArgumentList $root

Start-Sleep -Seconds 2

# Verify Backend
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:4000/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "      Backend is healthy! Status: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "      Backend starting up..." -ForegroundColor Yellow
}

# Start Frontend
Write-Host "[2/2] Starting Frontend (Vite on http://localhost:4173)..." -ForegroundColor Green
Write-Host ""
Write-Host "  >> Open your browser at: http://localhost:4173 <<" -ForegroundColor Magenta
Write-Host "  Press Ctrl+C to stop both frontend and backend." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

try {
    Set-Location (Join-Path $root "frontend")
    npm run dev
} finally {
    Write-Host "`nStopping backend process..." -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Get-Process -Name "uvicorn" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "Services stopped." -ForegroundColor Green
}
