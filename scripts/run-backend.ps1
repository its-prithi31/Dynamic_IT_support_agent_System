<#
Helper PowerShell script to create venv, install dependencies, and run the FastAPI backend.
Usage: from repo root run: .\scripts\run-backend.ps1
#>
param(
    [switch]$RecreateVenv
)

function Check-Command($name){
    $p = Get-Command $name -ErrorAction SilentlyContinue
    return $null -ne $p
}

if (-not (Check-Command python)) {
    Write-Host "Python not found on PATH. Please install Python 3.10+ and re-run." -ForegroundColor Red
    exit 1
}

$venv = Join-Path -Path "$PSScriptRoot\.." -ChildPath ".venv"
if ($RecreateVenv -or -not (Test-Path $venv)) {
    Write-Host "Creating virtual environment..."
    python -m venv $venv
}

# Allow script execution for this process (temporary)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

Write-Host "Activating venv..."
. "$venv\Scripts\Activate.ps1"

Write-Host "Installing Python requirements..."
python -m pip install --upgrade pip
python -m pip install -r "$PSScriptRoot\..\backend\requirements.txt"

Write-Host "Starting backend (uvicorn)..."
python -m uvicorn backend.app:app --reload --host 0.0.0.0 --port 4000
