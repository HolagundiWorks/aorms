#Requires -Version 5.1
<#
.SYNOPSIS
  Build AORMS desktop installer — **canonical path is WinUI 3** (Fluent 2 shell).

.EXAMPLE
  powershell -File desktop/scripts/build-installer.ps1 -Profile STUDIO

.NOTES
  Delegates to desktop/scripts/build-winui.ps1.
  Legacy Tauri under desktop/src-tauri is non-canonical; use -LegacyTauri only for
  emergency comparison builds.
#>
[CmdletBinding()]
param(
  [ValidateSet("STUDIO", "CONSULTANCY")]
  [string] $Profile = "STUDIO",
  [switch] $SkipFrontendBuild,
  [switch] $LegacyTauri,
  [switch] $Run
)

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot

if ($LegacyTauri) {
  Write-Warning "Legacy Tauri build — non-canonical. Prefer WinUI 3 (build-winui.ps1)."
  & (Join-Path $here "build-installer-tauri.ps1") -Profile $Profile -SkipFrontendBuild:$SkipFrontendBuild
  exit $LASTEXITCODE
}

& (Join-Path $here "build-winui.ps1") -Profile $Profile -SkipFrontendBuild:$SkipFrontendBuild -Run:$Run
exit $LASTEXITCODE
