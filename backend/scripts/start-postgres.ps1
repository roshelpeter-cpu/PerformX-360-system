# Starts the portable local PostgreSQL used by PerformX 360.
# Binary: %LOCALAPPDATA%\performx-pgsql
# Data:   %LOCALAPPDATA%\performx-pgdata
# Port:   5432
# User:   performx
# DB:     performx360

$ErrorActionPreference = "Stop"

$pgBin = Join-Path $env:LOCALAPPDATA "performx-pgsql\bin"
$pgData = Join-Path $env:LOCALAPPDATA "performx-pgdata"
$pgCtl = Join-Path $pgBin "pg_ctl.exe"
$logFile = Join-Path $pgData "postgres.log"

if (-not (Test-Path $pgCtl)) {
  Write-Error "PostgreSQL is not installed at $pgBin"
}

& $pgCtl -D $pgData status | Out-Null
if ($LASTEXITCODE -eq 0) {
  Write-Host "PostgreSQL is already running on port 5432."
  exit 0
}

New-Item -ItemType Directory -Force -Path $pgData | Out-Null
& $pgCtl -D $pgData -l $logFile start
if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to start PostgreSQL. Check $logFile"
}

Write-Host "PostgreSQL started on port 5432."
