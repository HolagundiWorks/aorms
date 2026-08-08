#Requires -Version 5.1
<#
.SYNOPSIS
  Local S8 - reopen apex auth / portal demos on the docker compose stack.

.DESCRIPTION
  Sets VITE_MARKETING_ONLY=false for the esti-frontend service (compose default)
  and recreates the container so Vite picks up the env. Does NOT touch VPS or
  signed installers (D6).

.EXAMPLE
  powershell -File deploy/s8-local.ps1
  powershell -File deploy/s8-local.ps1 -SeedDemo
#>
[CmdletBinding()]
param(
  [switch] $SeedDemo
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
  [System.Environment]::GetEnvironmentVariable("Path", "User")

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "docker not on PATH - start Docker Desktop and retry."
}

Write-Host "==> Recreate esti-frontend with VITE_MARKETING_ONLY=false (compose default)"
$env:VITE_MARKETING_ONLY = "false"
$env:VITE_PUBLIC_SITE = "true"
docker compose up -d --force-recreate --no-deps frontend
if ($LASTEXITCODE -ne 0) { throw "docker compose recreate failed" }

# Backend image may predate the mongodb dependency (src is bind-mounted; package.json is not).
$hasMongo = docker exec esti-backend sh -lc 'test -d /app/esti/node_modules/.pnpm/mongodb@* 2>/dev/null || grep -q mongodb /app/esti/backend/package.json'
if ($LASTEXITCODE -ne 0) {
  Write-Host "==> Rebuild esti-backend (mongodb missing from image)"
  docker compose build backend
  if ($LASTEXITCODE -ne 0) { throw "backend build failed" }
  docker compose up -d --force-recreate --no-deps backend
  if ($LASTEXITCODE -ne 0) { throw "backend recreate failed" }
  Start-Sleep -Seconds 8
}

if ($SeedDemo) {
  Write-Host "==> Seed demo accounts"
  docker exec esti-backend sh -lc 'cd /app/esti/backend && pnpm seed:demo'
  if ($LASTEXITCODE -ne 0) { throw "seed:demo failed" }
}

Write-Host "==> Wait for Vite"
$ok = $false
for ($i = 0; $i -lt 40; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) { $ok = $true; break }
  } catch {
    Start-Sleep -Seconds 1
  }
}
if (-not $ok) { throw "Frontend did not become ready on :5173" }

Write-Host "==> Env inside container"
docker exec esti-frontend sh -lc 'printenv VITE_MARKETING_ONLY; printenv VITE_PUBLIC_SITE; printenv VITE_RUNTIME_HOST'

Write-Host ""
Write-Host "Local S8 ready:"
Write-Host "  Landing     http://localhost:5173/"
Write-Host "  Login       http://localhost:5173/login"
Write-Host "  Portals     http://localhost:5173/login?tab=portals"
Write-Host ""
Write-Host "Demo (after -SeedDemo):"
Write-Host "  principal@demo.aorms.in / demo1234"
Write-Host "  client@demo.aorms.in · contractor@demo.aorms.in · collab@demo.aorms.in"
Write-Host ""
Write-Host "Installers stay Coming soon until D6."
