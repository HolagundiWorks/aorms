#Requires -Version 5.1
<#
.SYNOPSIS
  Build AORMS WinUI 3 desktop shell (LF4 canonical - Fluent 2 chrome + WebView2 SPA).

.EXAMPLE
  powershell -File desktop/scripts/build-winui.ps1 -Profile STUDIO

.NOTES
  Requires: .NET 8 SDK, Windows App SDK workloads, WebView2 runtime.
  Tauri under desktop/src-tauri is non-canonical (legacy scaffold).
#>
[CmdletBinding()]
param(
  [ValidateSet("STUDIO", "CONSULTANCY")]
  [string] $Profile = "STUDIO",
  [switch] $SkipFrontendBuild,
  [switch] $Run
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ShellDir = Join-Path $RepoRoot "desktop\AStudio.Shell"
$Frontend = Join-Path $RepoRoot "frontend"
$OutDir = Join-Path $RepoRoot "desktop\artifacts\winui"

Write-Host "=== AORMS WinUI 3 shell ($Profile) ===" -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot"

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
  throw "dotnet SDK not found. Install .NET 8+ SDK."
}

$env:AORMS_DESKTOP_PROFILE = $Profile
$env:ESTI_DESKTOP = "true"
$env:VITE_RUNTIME_HOST = "desktop"

if (-not $SkipFrontendBuild) {
  Write-Host "Building frontend dist (VITE_RUNTIME_HOST=desktop)..."
  $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
  $dockerCmd = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
  if ($pnpm) {
    Push-Location $Frontend
    try { pnpm exec vite build } finally { Pop-Location }
  } elseif (Test-Path $dockerCmd) {
    & $dockerCmd exec -e VITE_RUNTIME_HOST=desktop esti-frontend sh -lc "cd /app/esti/frontend && pnpm exec vite build"
    if ($LASTEXITCODE -ne 0) { throw "Docker frontend build failed" }
    $hostDist = Join-Path $Frontend "dist"
    if (Test-Path $hostDist) { Remove-Item $hostDist -Recurse -Force }
    & $dockerCmd cp "esti-frontend:/app/esti/frontend/dist" $hostDist
  } else {
    Write-Warning "Skipping frontend build - neither pnpm nor docker available."
  }
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# Use forward slash so a trailing backslash does not escape the closing quote.
$publishDir = ($OutDir.TrimEnd("\") + "/").Replace("\", "/")
$msbuildProps = @(
  "-p:AormsDesktopProfile=$Profile",
  "-p:Configuration=Release",
  "-p:Platform=x64",
  "-p:PublishDir=$publishDir",
  "-p:SelfContained=true",
  "-p:RuntimeIdentifier=win-x64",
  "-p:WindowsAppSDKSelfContained=true"
)

Write-Host "dotnet publish AStudio.Shell..."
Push-Location $ShellDir
try {
  & dotnet restore
  & dotnet publish @msbuildProps
  if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed ($LASTEXITCODE)" }
} finally {
  Pop-Location
}

$exeName = if ($Profile -eq "CONSULTANCY") { "AConsulting.Shell.exe" } else { "AStudio.Shell.exe" }
$exe = Join-Path $OutDir $exeName
Write-Host "Output: $OutDir" -ForegroundColor Green
if (Test-Path $exe) {
  Write-Host "Exe: $exe"
} else {
  Get-ChildItem $OutDir -Filter *.exe -Recurse | Select-Object -First 5 FullName
}

Write-Host "Sign the published exe/MSIX, then set VITE_ASTUDIO_INSTALLER_URL (Aakash handoff)."
Write-Host "Dev run: set AORMS_SPA_URL=http://127.0.0.1:5173 and launch the exe (stack via start-node.ps1)."

if ($Run -and (Test-Path $exe)) {
  $env:AORMS_SPA_URL = "http://127.0.0.1:5173"
  $env:AORMS_REPO_ROOT = $RepoRoot
  Start-Process -FilePath $exe
}
