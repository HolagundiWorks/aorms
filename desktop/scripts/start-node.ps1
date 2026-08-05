# Start the local-first desktop node stack (Docker Compose + desktop env flags).
$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Root
$env:ESTI_DESKTOP = "true"
if (-not $env:STORAGE_DRIVER) { $env:STORAGE_DRIVER = "fs" }
if (-not $env:INSTALL_ID) { $env:INSTALL_ID = [guid]::NewGuid().ToString() }
Write-Host "Starting AORMS desktop node (INSTALL_ID=$($env:INSTALL_ID))…"
docker compose up -d --build
Write-Host "SPA → http://127.0.0.1:5173  API → http://127.0.0.1:4000"
