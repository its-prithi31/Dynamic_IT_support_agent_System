<#
Installs prerequisites on Windows using `winget` when available.

Usage:
  # Interactive (recommended)
  .\scripts\install-prereqs.ps1

  # Non-interactive (attempt all installs, assume consent)
  .\scripts\install-prereqs.ps1 -AutoConfirm

Notes:
  - Requires Administrator privileges for some installations.
  - If `winget` is not available, the script prints manual install steps.
  - After installing, restart your PowerShell session.
#>

param(
    [switch]$AutoConfirm
)

function Has-Command($name){
    return (Get-Command $name -ErrorAction SilentlyContinue) -ne $null
}

function Try-Install($id, $friendly){
    Write-Host "Attempting to install $friendly via winget..."
    $args = @('install','--id',$id,'-e','--source','winget')
    if ($AutoConfirm) { $args += '--silent' }
    $proc = Start-Process -FilePath winget -ArgumentList $args -NoNewWindow -Wait -PassThru -ErrorAction SilentlyContinue
    if ($proc -and $proc.ExitCode -eq 0) { Write-Host "$friendly installed." -ForegroundColor Green; return $true }
    Write-Host "winget failed to install $friendly (exit $($proc.ExitCode))." -ForegroundColor Yellow
    return $false
}

Write-Host "Checking for required tools..." -ForegroundColor Cyan

$checks = @{
    'python' = @{ cmd='python'; name='Python 3.10+' }
    'docker' = @{ cmd='docker'; name='Docker Desktop' }
    'node'   = @{ cmd='node'; name='Node.js (LTS)' }
    'npm'    = @{ cmd='npm';  name='npm' }
}

$missing = @()
foreach ($k in $checks.Keys){
    if (-not (Has-Command $checks[$k].cmd)){
        $missing += $checks[$k].name
        Write-Host "Missing: $($checks[$k].name)" -ForegroundColor Yellow
    } else {
        Write-Host "Found: $($checks[$k].name)" -ForegroundColor Green
    }
}

if ($missing.Count -eq 0){
    Write-Host "All prerequisites detected; nothing to install." -ForegroundColor Green
    exit 0
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)){
    Write-Host "winget not found. Please install the App Installer from Microsoft or use manual installers:" -ForegroundColor Red
    Write-Host " - Python: https://www.python.org/downloads/" -ForegroundColor Cyan
    Write-Host " - Docker Desktop: https://www.docker.com/get-started" -ForegroundColor Cyan
    Write-Host " - Node.js: https://nodejs.org/" -ForegroundColor Cyan
    exit 2
}

Write-Host "winget found. Preparing to install missing components." -ForegroundColor Cyan

if ($missing -contains 'Python 3.10+'){
    $ok = $false
    if ($AutoConfirm -or (Read-Host 'Install Python 3.10+ via winget? (Y/n)') -in @('','Y','y')){ $ok = Try-Install 'Python.Python.3' 'Python 3' }
}

if ($missing -contains 'Docker Desktop'){
    $ok = $false
    if ($AutoConfirm -or (Read-Host 'Install Docker Desktop via winget? (Y/n)') -in @('','Y','y')){ $ok = Try-Install 'Docker.DockerDesktop' 'Docker Desktop' }
}

if ($missing -contains 'Node.js (LTS)'){
    $ok = $false
    if ($AutoConfirm -or (Read-Host 'Install Node.js LTS via winget? (Y/n)') -in @('','Y','y')){ $ok = Try-Install 'OpenJS.NodeJS.LTS' 'Node.js LTS' }
}

Write-Host "Install attempts complete. Please restart your PowerShell session and re-run the quick checks:" -ForegroundColor Cyan
Write-Host "  python --version`n  docker --version`n  node --version`n  npm --version" -ForegroundColor Gray
