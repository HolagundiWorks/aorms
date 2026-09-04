#Requires -Version 5.1
<#
.SYNOPSIS
  LEGACY Tauri installer build — non-canonical. Prefer build-winui.ps1.
#>
[CmdletBinding()]
param(
  [ValidateSet("STUDIO", "CONSULTANCY")]
  [string] $Profile = "STUDIO",
  [switch] $SkipFrontendBuild
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$DesktopDir = Join-Path $RepoRoot "desktop"
$SrcTauri = Join-Path $DesktopDir "src-tauri"
$Frontend = Join-Path $RepoRoot "frontend"

Write-Warning "Building LEGACY Tauri shell — WinUI 3 is canonical (build-winui.ps1)."
Write-Host "=== AORMS desktop installer Tauri ($Profile) ===" -ForegroundColor Yellow

if (-not $SkipFrontendBuild) {
  $env:VITE_RUNTIME_HOST = "desktop"
  $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
  if ($pnpm) {
    Push-Location $Frontend
    try { pnpm exec vite build } finally { Pop-Location }
  } elseif (Get-Command docker -ErrorAction SilentlyContinue) {
    docker exec -e VITE_RUNTIME_HOST=desktop esti-frontend sh -lc "cd /app/esti/frontend && pnpm exec vite build"
    $hostDist = Join-Path $Frontend "dist"
    if (Test-Path $hostDist) { Remove-Item $hostDist -Recurse -Force }
    docker cp "esti-frontend:/app/esti/frontend/dist" $hostDist
  } else {
    throw "Neither pnpm nor docker available."
  }
}

$config = if ($Profile -eq "CONSULTANCY") {
  Join-Path $DesktopDir "tauri.conf.consultancy.json"
} else {
  Join-Path $DesktopDir "tauri.conf.json"
}
Copy-Item -LiteralPath $config -Destination (Join-Path $SrcTauri "tauri.conf.json") -Force
$env:AORMS_DESKTOP_PROFILE = $Profile
$env:ESTI_DESKTOP = "true"
$env:VITE_RUNTIME_HOST = "desktop"

Push-Location $SrcTauri
try {
  if (Get-Command cargo-tauri -ErrorAction SilentlyContinue) {
    cargo tauri build
  } elseif (Get-Command tauri -ErrorAction SilentlyContinue) {
    tauri build
  } else {
    Write-Warning "Tauri CLI not found. Skipping native build."
    exit 0
  }
} finally {
  Pop-Location
}
