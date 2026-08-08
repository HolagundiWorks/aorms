#Requires -Version 5.1
<#
.SYNOPSIS
  Fill one suite update-manifest from measured HTTPS URL + sha256 (D6 prep).

.DESCRIPTION
  Honesty gate for /downloads:
  - url must be https://
  - sha256 must be 64 hex (measured — never invent)
  - refuses to write unless -ConfirmFlip (or -WhatIf for dry run)
  - does NOT set VITE_PORTAL_USE_RELEASE_INSTALLERS (operator rebuilds after)

  Use after SmartScreen-trusted sign + upload. See docs/esti/WEB-PORTAL.md.

.EXAMPLE
  powershell -File desktop/scripts/apply-installer-manifest.ps1 `
    -App aorms-connect -Version 1.0.0 `
    -Url https://github.com/HolagundiWorks/AORMS-Connect/releases/download/v1.0.0/AORMS-Connect.msix `
    -Sha256 0123... (64 hex) -WhatIf

.EXAMPLE
  powershell -File desktop/scripts/apply-installer-manifest.ps1 `
    -App astudio -Version 1.0.0 -Url https://… -Sha256 … -ConfirmFlip
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet(
    "aorms-connect", "astudio", "aconsulting",
    "aqc-estimation", "aqc-bbs", "aqc-pm", "aadt"
  )]
  [string] $App,

  [Parameter(Mandatory = $true)]
  [string] $Version,

  [Parameter(Mandatory = $true)]
  [string] $Url,

  [Parameter(Mandatory = $true)]
  [string] $Sha256,

  [int] $SizeBytes = 0,

  [string] $Notes = "",

  # Required to write status=available (portal Download CTA after release flag).
  [switch] $ConfirmFlip
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ManifestPath = Join-Path $RepoRoot ("frontend\public\update-manifests\{0}.json" -f $App)

if (-not (Test-Path -LiteralPath $ManifestPath)) {
  throw "Manifest missing: $ManifestPath"
}

$url = $Url.Trim()
if ($url -notmatch '^https://') {
  throw "Url must be https:// (got: $url). Never use file:// or unsigned local paths."
}

$sha = $Sha256.Trim().ToLowerInvariant()
if ($sha -notmatch '^[0-9a-f]{64}$') {
  throw "Sha256 must be 64 hex characters measured from the signed binary (Get-FileHash)."
}

$ver = $Version.Trim()
if ([string]::IsNullOrWhiteSpace($ver)) {
  throw "Version is required."
}

if (-not $ConfirmFlip -and -not $WhatIfPreference) {
  throw @"
Refusing to write status=available without -ConfirmFlip.
Dry-run: add -WhatIf. After a SmartScreen-trusted HTTPS asset is ready:
  … -ConfirmFlip
Then set VITE_PORTAL_USE_RELEASE_INSTALLERS=true and rebuild (deploy/update.sh).
Keep VITE_INSTALLERS_COMING_SOON=false only when Download CTAs should appear.
"@
}

$existing = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
$product = if ($existing.product) { [string]$existing.product } else { $App }

$payload = [ordered]@{
  app         = $App
  product     = $product
  channel     = if ($existing.channel) { [string]$existing.channel } else { "stable" }
  platform    = if ($existing.platform) { [string]$existing.platform } else { "windows-x86_64" }
  version     = $ver
  url         = $url
  sha256      = $sha
  sizeBytes   = $SizeBytes
  signature   = if ($existing.signature) { [string]$existing.signature } else { "" }
  publishedAt = (Get-Date).ToUniversalTime().ToString("o")
  status      = "available"
  notes       = if ($Notes) { $Notes } else { "Filled by apply-installer-manifest.ps1 (D6)." }
}

$json = ($payload | ConvertTo-Json -Depth 4) + "`n"

if ($PSCmdlet.ShouldProcess($ManifestPath, "Write available installer manifest")) {
  Set-Content -LiteralPath $ManifestPath -Value $json -Encoding UTF8
  Write-Host "Wrote $ManifestPath"
  Write-Host "Next: VITE_PORTAL_USE_RELEASE_INSTALLERS=true · VITE_INSTALLERS_COMING_SOON=false · rebuild frontend"
  Write-Host "Do not invent sha256. Do not flip without SmartScreen-trusted chain."
}
