#Requires -Version 5.1
<#
.SYNOPSIS
  Upload a signed WinUI shell to a GitHub Release (HTTPS host for /downloads).

.DESCRIPTION
  Reads desktop/artifacts/winui/handoff-<profile>.json from sign-winui.ps1.
  Creates (or updates) a GitHub release asset so the binary has a stable HTTPS URL.

  Honesty:
  - Default refuses upload when handoff.chainTrusted is false (ACO-dev).
  - Use -ForceDraftUntrusted only for private draft smoke - never flip portal.
  - Does not edit update-manifests unless -FillManifests AND chainTrusted AND upload succeeded.

.EXAMPLE
  powershell -File desktop/scripts/publish-winui-release.ps1 -Profile STUDIO -Tag winui-studio-1.0.0 -DryRun

.EXAMPLE
  powershell -File desktop/scripts/publish-winui-release.ps1 -Profile STUDIO -Tag winui-studio-1.0.0 -FillManifests
#>
[CmdletBinding()]
param(
  [ValidateSet("STUDIO", "CONSULTANCY")]
  [string] $Profile = "STUDIO",

  [Parameter(Mandatory = $true)]
  [string] $Tag,

  [string] $Repo = "HolagundiWorks/aorms",

  [string] $HandoffPath,

  [string] $Title,

  # Print gh commands only - no network write.
  [switch] $DryRun,

  # Allow draft upload of ACO-dev / untrusted chain (never fill manifests).
  [switch] $ForceDraftUntrusted,

  # After trusted upload, write url/sha256/version/status into update-manifests.
  [switch] $FillManifests
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$profileDir = if ($Profile -eq "CONSULTANCY") { "consultancy" } else { "studio" }
$OutDir = Join-Path $RepoRoot "desktop\artifacts\winui\$profileDir"

if (-not $HandoffPath) {
  $HandoffPath = Join-Path $OutDir ("handoff-{0}.json" -f $Profile.ToLowerInvariant())
  $legacyHandoff = Join-Path $RepoRoot ("desktop\artifacts\winui\handoff-{0}.json" -f $Profile.ToLowerInvariant())
  if (-not (Test-Path -LiteralPath $HandoffPath) -and (Test-Path -LiteralPath $legacyHandoff)) {
    $HandoffPath = $legacyHandoff
  }
}
if (-not (Test-Path -LiteralPath $HandoffPath)) {
  throw "Handoff not found: $HandoffPath - run sign-winui.ps1 first."
}

$handoff = Get-Content -LiteralPath $HandoffPath -Raw | ConvertFrom-Json
$exe = [string]$handoff.exePath
if (-not (Test-Path -LiteralPath $exe)) {
  throw "Exe from handoff missing: $exe"
}

$trusted = [bool]$handoff.chainTrusted
if (-not $trusted -and -not $ForceDraftUntrusted) {
  throw @"
Handoff chainTrusted=false (Authenticode=$($handoff.authenticodeStatus)).
Refusing public/draft upload of ACO-dev binary.
Install a CA cert, re-run sign-winui.ps1 -RequireTrustedChain, then publish.
(Or pass -ForceDraftUntrusted for a private draft smoke only - still no portal flip.)
"@
}

if ($FillManifests -and -not $trusted) {
  throw "-FillManifests requires chainTrusted=true. Portal honesty gate."
}

$product = [string]$handoff.product
if (-not $Title) {
  $Title = "$product WinUI $Tag"
}
$assetName = Split-Path -Leaf $exe
# Prefer versioned asset name on the release so URLs stay stable per tag.
$version = [string]$handoff.version
if (-not $version) { $version = "0.0.0-dev" }
$releaseAssetName = "{0}-WinUI-{1}.exe" -f $product, ($version -replace '[^\w\.\-]', '_')
$staged = Join-Path $OutDir $releaseAssetName
Copy-Item -LiteralPath $exe -Destination $staged -Force

$notes = @"
$product local-first desktop node (WinUI 3).

- sha256: $($handoff.sha256)
- version: $version
- signer: $($handoff.signerSubject)
- chainTrusted: $trusted

Do not wire /downloads until SmartScreen-trusted + this HTTPS URL is confirmed.
Legacy Estimate / Community / Manager installers stay retired.
"@

$notesFile = Join-Path $OutDir ("release-notes-{0}.md" -f $Profile.ToLowerInvariant())
Set-Content -LiteralPath $notesFile -Value $notes -Encoding UTF8

Write-Host "Repo: $Repo" -ForegroundColor Cyan
Write-Host "Tag:  $Tag"
Write-Host "Asset: $staged -> $releaseAssetName"
Write-Host "Trusted: $trusted"

$ghArgsCreate = @(
  "release", "create", $Tag,
  $staged,
  "--repo", $Repo,
  "--title", $Title,
  "--notes-file", $notesFile
)
if (-not $trusted -or $ForceDraftUntrusted) {
  $ghArgsCreate += "--draft"
}

if ($DryRun) {
  Write-Host "DryRun - would run:" -ForegroundColor Yellow
  Write-Host ("gh " + ($ghArgsCreate -join " "))
  $urlGuess = "https://github.com/$Repo/releases/download/$Tag/$releaseAssetName"
  Write-Host "Expected asset URL: $urlGuess"
  return
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "gh CLI not found. Install GitHub CLI to publish releases."
}

# Create or upload-to-existing
$existing = $null
try {
  $existing = gh release view $Tag --repo $Repo 2>$null
} catch {
  $existing = $null
}

if ($existing) {
  Write-Host "Release $Tag exists - uploading asset..."
  gh release upload $Tag $staged --repo $Repo --clobber
  if ($LASTEXITCODE -ne 0) { throw "gh release upload failed ($LASTEXITCODE)" }
} else {
  Write-Host "Creating release $Tag..."
  & gh @ghArgsCreate
  if ($LASTEXITCODE -ne 0) { throw "gh release create failed ($LASTEXITCODE)" }
}

$assetUrl = "https://github.com/$Repo/releases/download/$Tag/$releaseAssetName"
Write-Host "HTTPS URL: $assetUrl" -ForegroundColor Green

# Refresh handoff with published URL
$handoff | Add-Member -NotePropertyName publishedUrl -NotePropertyValue $assetUrl -Force
$handoff | Add-Member -NotePropertyName releaseTag -NotePropertyValue $Tag -Force
($handoff | ConvertTo-Json -Depth 8) | Set-Content -LiteralPath $HandoffPath -Encoding UTF8

if ($FillManifests) {
  $manifestRel = if ($Profile -eq "CONSULTANCY") {
    "frontend/public/update-manifests/aconsulting.json"
  } else {
    "frontend/public/update-manifests/astudio.json"
  }
  $manifestPath = Join-Path $RepoRoot $manifestRel
  $m = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  $m.url = $assetUrl
  $m.sha256 = [string]$handoff.sha256
  $m.version = $version
  $m.sizeBytes = [int64]$handoff.sizeBytes
  $m.publishedAt = [string]$handoff.signedAt
  $m.status = "available"
  $m.notes = "Filled by publish-winui-release.ps1 from trusted handoff ($Tag)."
  ($m | ConvertTo-Json -Depth 6) | Set-Content -LiteralPath $manifestPath -Encoding UTF8
  Write-Host "Manifest updated: $manifestRel (status=available)" -ForegroundColor Green
  Write-Host "Also set VITE_PORTAL_USE_RELEASE_INSTALLERS=true on the deploy host and rebuild frontend."
} else {
  Write-Host "Manifests untouched. After SmartScreen trust, re-run with -FillManifests or fill WEB-PORTAL.md by hand."
}
