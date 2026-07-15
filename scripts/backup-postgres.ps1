param(
  [string]$Container = "dynamic_it_support_agent-postgres-1",
  [string]$Database = "aegis",
  [string]$User = "aegis",
  [string]$BackupDirectory = ".\\backups"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $BackupDirectory | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $BackupDirectory "aegis-$stamp.sql"
docker exec $Container pg_dump -U $User -d $Database | Set-Content -Path $target -Encoding utf8
Write-Output "Backup created: $target"
