<#
Helper to start the Docker demo compose file (docker-compose.demo.yml)
Usage: .\scripts\run-docker-demo.ps1
#>
function Check-Command($name){
    $p = Get-Command $name -ErrorAction SilentlyContinue
    return $null -ne $p
}

if (-not (Check-Command docker)) {
    Write-Host "Docker not found. Install Docker Desktop and ensure 'docker' is available on PATH." -ForegroundColor Red
    exit 1
}

Write-Host "Starting Docker demo compose..."
docker compose -f docker-compose.demo.yml up --build
