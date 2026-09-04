#Requires -Version 5.1
<#
.SYNOPSIS
  Build AORMS desktop installer (LF4 scaffold) — Studio or Consultancy profile.

.EXAMPLE
  powershell -File desktop/scripts/build-installer.ps1 -Profile STUDIO

.NOTES
  Requires: Rust toolchain, Tauri CLI (`cargo-tauri` in PATH — prebuilt zip from
  GitHub releases or `cargo install tauri-cli --version "^2"`), Node/pnpm or
  Docker `esti-frontend` for SPA dist, WebView2. Prefer MSVC
  (`stable-x86_64-pc-windows-msvc` + VS Build Tools C++). Fallback without UAC:
  WinLibs MinGW on PATH + `$env:RUSTUP_TOOLCHAIN = "stable-x86_64-pc-windows-gnu"`.
  Signing certificates are operator-supplied. Until a full local stack is bundled,
  the shell loads the SPA against loopback (see desktop/README.md). Set
  VITE_ASTUDIO_INSTALLER_URL after publishing Setup.exe.
#>
[CmdletBinding()]
param(
  [ValidateSet("STUDIO", "CONSULTANCY")]
  [string] $Profile = "STUDIO",
  [switch] $SkipFrontendBuild
)

$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $Root "frontend"))) {
  $Root = Split-Path $PSScriptRoot -Parent
  $Root = Split-Path $Root -Parent
}
# desktop/scripts → desktop → repo root
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$DesktopDir = Join-Path $RepoRoot "desktop"
$SrcTauri = Join-Path $DesktopDir "src-tauri"
$Frontend = Join-Path $RepoRoot "frontend"

Write-Host "=== AORMS desktop installer ($Profile) ===" -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot"

if (-not $SkipFrontendBuild) {
  Write-Host "Building frontend dist (VITE_RUNTIME_HOST=desktop)..."
  $env:VITE_RUNTIME_HOST = "desktop"
  $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
  if ($pnpm) {
    Push-Location $Frontend
    try {
      pnpm exec vite build
    } finally {
      Pop-Location
    }
  } elseif (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Host pnpm missing — building via esti-frontend container..."
    docker exec -e VITE_RUNTIME_HOST=desktop esti-frontend sh -lc "cd /app/esti/frontend && pnpm exec vite build"
    if ($LASTEXITCODE -ne 0) { throw "Docker frontend build failed (exit $LASTEXITCODE)" }
    $hostDist = Join-Path $Frontend "dist"
    Write-Host "Copying frontend/dist from container to host for Tauri..."
    if (Test-Path $hostDist) { Remove-Item $hostDist -Recurse -Force }
    docker cp "esti-frontend:/app/esti/frontend/dist" $hostDist
    if (-not (Test-Path (Join-Path $hostDist "index.html"))) {
      throw "frontend/dist/index.html missing after docker cp"
    }
  } else {
    throw "Neither pnpm nor docker is available to build frontend/dist. Pass -SkipFrontendBuild if dist is already built."
  }
}

$config = if ($Profile -eq "CONSULTANCY") {
  Join-Path $DesktopDir "tauri.conf.consultancy.json"
} else {
  Join-Path $DesktopDir "tauri.conf.json"
}

# Copy profile config into src-tauri for tauri-build context
Copy-Item -LiteralPath $config -Destination (Join-Path $SrcTauri "tauri.conf.json") -Force

$env:AORMS_DESKTOP_PROFILE = $Profile
$env:ESTI_DESKTOP = "true"
$env:VITE_RUNTIME_HOST = "desktop"

Write-Host "VITE_RUNTIME_HOST=desktop (SPA first-run licence bind enabled)"

Push-Location $SrcTauri
try {
  if (-not (Test-Path (Join-Path $SrcTauri "icons\32x32.png"))) {
    Write-Warning "desktop/src-tauri/icons missing — run desktop/scripts/gen-icons.ps1 or copy brand PNGs before a signed release."
  }
  if (Get-Command cargo-tauri -ErrorAction SilentlyContinue) {
    cargo tauri build
  } elseif (Get-Command tauri -ErrorAction SilentlyContinue) {
    tauri build
  } else {
    Write-Warning "Tauri CLI not found. Install: cargo install tauri-cli --version `"^2`""
    Write-Warning "Scaffold is ready under desktop/src-tauri. Skipping native build."
    exit 0
  }
} finally {
  Pop-Location
}

$bundle = Join-Path $SrcTauri "target\release\bundle"
Write-Host "Bundles (if built): $bundle" -ForegroundColor Green
Write-Host "Publish Setup.exe then set VITE_ASTUDIO_INSTALLER_URL or VITE_ACONSULTING_INSTALLER_URL for the portal."
