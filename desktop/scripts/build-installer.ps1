#Requires -Version 5.1
<#
.SYNOPSIS
  Build AORMS desktop installer — **canonical path is WinUI 3** (Fluent 2 shell).

.EXAMPLE
  powershell -File desktop/scripts/build-installer.ps1 -Profile STUDIO

.NOTES
  Delegates to desktop/scripts/build-winui.ps1. WinUI 3 is the only desktop shell
  (the legacy Tauri scaffold was removed).
#>
[CmdletBinding()]
param(
  [ValidateSet("STUDIO", "CONSULTANCY")]
  [string] $Profile = "STUDIO",
  [switch] $SkipFrontendBuild,
  [switch] $Run
)

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot

& (Join-Path $here "build-winui.ps1") -Profile $Profile -SkipFrontendBuild:$SkipFrontendBuild -Run:$Run
exit $LASTEXITCODE
