#Requires -Version 5.1
<#
.SYNOPSIS
  Authenticode-sign a published WinUI shell and emit a portal handoff JSON.

.DESCRIPTION
  Signs AStudio.Shell.exe / AConsulting.Shell.exe with either:
    - $env:AORMS_CODESIGN_PFX + $env:AORMS_CODESIGN_PFX_PASSWORD  (preferred for CA certs)
    - -Thumbprint (certificate in CurrentUser\My or LocalMachine\My)
    - default: CN=Human Centric Works when present (ACO **dev** only)

  Always measures SHA-256 and writes desktop/artifacts/winui/handoff-<profile>.json.
  Does **not** edit frontend/public/update-manifests - portal flip stays manual after
  SmartScreen-trusted sign + HTTPS upload (see docs/esti/WEB-PORTAL.md).

.EXAMPLE
  powershell -File desktop/scripts/sign-winui.ps1 -Profile STUDIO

.EXAMPLE
  $env:AORMS_CODESIGN_PFX = "C:\certs\hcw-codesign.pfx"
  $env:AORMS_CODESIGN_PFX_PASSWORD = "..."
  powershell -File desktop/scripts/sign-winui.ps1 -Profile STUDIO -RequireTrustedChain
#>
[CmdletBinding()]
param(
  [ValidateSet("STUDIO", "CONSULTANCY")]
  [string] $Profile = "STUDIO",

  [string] $ExePath,

  [string] $Thumbprint,

  [string] $Version = "0.0.0-dev",

  # Fail if Authenticode chain is not trusted (blocks ACO-dev portal mistakes).
  [switch] $RequireTrustedChain,

  [switch] $SkipTimestamp
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$OutDir = Join-Path $RepoRoot "desktop\artifacts\winui"
$exeName = if ($Profile -eq "CONSULTANCY") { "AConsulting.Shell.exe" } else { "AStudio.Shell.exe" }

if (-not $ExePath) {
  $ExePath = Join-Path $OutDir $exeName
}
if (-not (Test-Path -LiteralPath $ExePath)) {
  throw "Exe not found: $ExePath - run desktop/scripts/build-winui.ps1 -Profile $Profile first."
}

function Find-SignTool {
  $candidates = @(
    "${env:ProgramFiles(x86)}\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe",
    "${env:ProgramFiles(x86)}\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe",
    "${env:ProgramFiles(x86)}\Windows Kits\10\bin\10.0.22000.0\x64\signtool.exe"
  )
  foreach ($c in $candidates) {
    if (Test-Path -LiteralPath $c) { return $c }
  }
  $found = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin" -Recurse -Filter signtool.exe -ErrorAction SilentlyContinue |
    Where-Object { $_.DirectoryName -match '\\x64$' } |
    Sort-Object FullName -Descending |
    Select-Object -First 1
  if ($found) { return $found.FullName }
  throw "signtool.exe not found. Install Windows SDK Signing Tools."
}

function Resolve-DefaultThumbprint {
  $certs = @(
    Get-ChildItem Cert:\CurrentUser\My -ErrorAction SilentlyContinue
    Get-ChildItem Cert:\LocalMachine\My -ErrorAction SilentlyContinue
  ) | Where-Object {
    $_.HasPrivateKey -and (
      $_.Subject -eq "CN=Human Centric Works" -or
      ($_.EnhancedKeyUsageList | Where-Object { $_.FriendlyName -eq "Code Signing" })
    )
  } | Sort-Object {
    # Prefer exact HCW subject; deprioritize the misspelled "Centic" test cert.
    if ($_.Subject -eq "CN=Human Centric Works") { 0 }
    elseif ($_.Subject -match "Centic") { 2 }
    else { 1 }
  }, NotAfter -Descending

  $pick = $certs | Select-Object -First 1
  if (-not $pick) {
    throw "No code-signing cert in store and AORMS_CODESIGN_PFX unset."
  }
  return $pick.Thumbprint
}

$signtool = Find-SignTool
Write-Host "signtool: $signtool" -ForegroundColor Cyan
Write-Host "Signing: $ExePath" -ForegroundColor Cyan

$signArgs = @("sign", "/fd", "SHA256", "/td", "SHA256")
if (-not $SkipTimestamp) {
  $signArgs += @("/tr", "http://timestamp.digicert.com")
}

$pfx = $env:AORMS_CODESIGN_PFX
if ($pfx) {
  if (-not (Test-Path -LiteralPath $pfx)) {
    throw "AORMS_CODESIGN_PFX not found: $pfx"
  }
  $pwd = $env:AORMS_CODESIGN_PFX_PASSWORD
  if (-not $pwd) {
    throw "Set AORMS_CODESIGN_PFX_PASSWORD for PFX signing (session env only - never commit)."
  }
  $signArgs += @("/f", $pfx, "/p", $pwd)
  Write-Host "Using PFX: $pfx"
} else {
  if (-not $Thumbprint) {
    $Thumbprint = Resolve-DefaultThumbprint
  }
  $signArgs += @("/sha1", $Thumbprint)
  Write-Host "Using store thumbprint: $Thumbprint"
}

$signArgs += $ExePath
& $signtool @signArgs
if ($LASTEXITCODE -ne 0) {
  throw "signtool sign failed ($LASTEXITCODE)"
}

# verify /pa - may fail on ACO-dev (untrusted root); capture for handoff
$verifyOk = $false
$verifyMsg = ""
try {
  $verifyOut = & $signtool verify /pa $ExePath 2>&1 | Out-String
  if ($LASTEXITCODE -eq 0) {
    $verifyOk = $true
    $verifyMsg = "pa_ok"
  } else {
    $verifyMsg = $verifyOut.Trim()
  }
} catch {
  $verifyMsg = $_.Exception.Message
}

$auth = Get-AuthenticodeSignature -FilePath $ExePath
$chainTrusted = ($auth.Status -eq "Valid")
$hash = (Get-FileHash -Algorithm SHA256 -Path $ExePath).Hash.ToLowerInvariant()
$size = (Get-Item -LiteralPath $ExePath).Length

if ($RequireTrustedChain -and -not $chainTrusted) {
  throw @"
Authenticode chain is not trusted (Status=$($auth.Status)).
ACO-dev / self-signed roots must not ship to /downloads.
Install a CA-issued code-signing cert (or Azure Trusted Signing), then re-run
with AORMS_CODESIGN_PFX or -Thumbprint. Details: $($auth.StatusMessage)
"@
}

$handoff = [ordered]@{
  profile             = $Profile
  product             = if ($Profile -eq "CONSULTANCY") { "AConsulting" } else { "AStudio" }
  exePath             = $ExePath
  version             = $Version
  sha256              = $hash
  sizeBytes           = $size
  signedAt            = (Get-Date).ToUniversalTime().ToString("o")
  signerSubject       = if ($auth.SignerCertificate) { $auth.SignerCertificate.Subject } else { $null }
  signerThumbprint    = if ($auth.SignerCertificate) { $auth.SignerCertificate.Thumbprint } else { $null }
  authenticodeStatus  = [string]$auth.Status
  chainTrusted        = $chainTrusted
  smartScreenReady    = $chainTrusted
  signtoolVerifyPa    = $verifyOk
  signtoolVerifyNote  = $verifyMsg
  portalHonesty       = "Keep update-manifests status=web_fallback until chainTrusted=true AND a public HTTPS url is set. Never invent URL/sha256."
  portalFill          = [ordered]@{
    manifestPath = if ($Profile -eq "CONSULTANCY") {
      "frontend/public/update-manifests/aconsulting.json"
    } else {
      "frontend/public/update-manifests/astudio.json"
    }
    url          = "<HTTPS URL after upload - do not invent>"
    sha256       = $hash
    version      = $Version
    status       = if ($chainTrusted) { "available (only after HTTPS upload)" } else { "web_fallback" }
    envUrl       = if ($Profile -eq "CONSULTANCY") {
      "VITE_ACONSULTING_INSTALLER_URL"
    } else {
      "VITE_ASTUDIO_INSTALLER_URL"
    }
    gateFlag     = "VITE_PORTAL_USE_RELEASE_INSTALLERS=true"
  }
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$handoffPath = Join-Path $OutDir ("handoff-{0}.json" -f $Profile.ToLowerInvariant())
($handoff | ConvertTo-Json -Depth 6) | Set-Content -LiteralPath $handoffPath -Encoding UTF8

Write-Host ""
Write-Host "SHA-256: $hash" -ForegroundColor Green
Write-Host "Authenticode: $($auth.Status)  chainTrusted=$chainTrusted" -ForegroundColor $(if ($chainTrusted) { "Green" } else { "Yellow" })
Write-Host "Handoff: $handoffPath"
if (-not $chainTrusted) {
  Write-Host "Portal flip blocked - ACO-dev / untrusted chain. Upload only after a CA cert." -ForegroundColor Yellow
} else {
  Write-Host "Chain trusted - upload exe to HTTPS, then fill manifest url + status=available (WEB-PORTAL.md)." -ForegroundColor Green
}
