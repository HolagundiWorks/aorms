#!/usr/bin/env bash
# Linux/cloud smoke for LF4 WinUI packaging path (structure + docs only).
# Cannot run `dotnet publish` for WinUI / Windows App SDK on non-Windows hosts.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SHELL_DIR="$ROOT/desktop/AStudio.Shell"
FAIL=0

ok() { printf 'OK  %s\n' "$1"; }
bad() { printf 'FAIL %s\n' "$1"; FAIL=1; }

need_file() {
  if [[ -f "$1" ]]; then ok "$2"; else bad "missing: $2 ($1)"; fi
}

echo "=== LF4 WinUI shell validate (Linux-capable) ==="
echo "Repo: $ROOT"

need_file "$SHELL_DIR/AStudio.Shell.csproj" "AStudio.Shell.csproj"
need_file "$SHELL_DIR/MainWindow.xaml" "MainWindow.xaml"
need_file "$SHELL_DIR/MainWindow.xaml.cs" "MainWindow.xaml.cs"
need_file "$SHELL_DIR/Services/SpaHostService.cs" "SpaHostService.cs"
need_file "$SHELL_DIR/Services/NodeStackService.cs" "NodeStackService.cs"
need_file "$ROOT/desktop/scripts/build-winui.ps1" "build-winui.ps1"
need_file "$ROOT/desktop/scripts/build-installer.ps1" "build-installer.ps1"
need_file "$ROOT/frontend/src/lib/desktopNativeBridge.ts" "desktopNativeBridge.ts"
need_file "$ROOT/frontend/src/components/DesktopLicenceBind.tsx" "DesktopLicenceBind.tsx"

if grep -q 'build-winui.ps1' "$ROOT/desktop/scripts/build-installer.ps1"; then
  ok "build-installer.ps1 delegates to WinUI"
else
  bad "build-installer.ps1 does not delegate to build-winui.ps1"
fi

if grep -q 'LegacyTauri' "$ROOT/desktop/scripts/build-installer.ps1"; then
  bad "LegacyTauri escape hatch still present — WinUI 3 is the only shell"
else
  ok "build-installer.ps1 has no LegacyTauri hatch (WinUI-only)"
fi

if [[ -e "$ROOT/desktop/src-tauri" ]]; then
  bad "legacy desktop/src-tauri scaffold still present"
else
  ok "legacy Tauri scaffold removed (no desktop/src-tauri)"
fi

if grep -q 'TargetFramework>net8.0-windows' "$SHELL_DIR/AStudio.Shell.csproj"; then
  ok "csproj targets net8.0-windows"
else
  bad "csproj missing net8.0-windows TFM"
fi

if grep -q '__AORMS_NATIVE_SHELL__' "$SHELL_DIR/Services/SpaHostService.cs"; then
  ok "SpaHost injects __AORMS_NATIVE_SHELL__"
else
  bad "SpaHost missing native shell boot script"
fi

if grep -q 'isNativeDesktopShell' "$ROOT/frontend/src/components/DesktopLicenceBind.tsx"; then
  ok "DesktopLicenceBind honors WinUI native host"
else
  bad "DesktopLicenceBind does not check isNativeDesktopShell()"
fi

if command -v dotnet >/dev/null 2>&1; then
  echo "NOTE: dotnet present ($(dotnet --version 2>/dev/null || echo '?')) — WinUI publish still requires Windows + Windows App SDK"
else
  echo "NOTE: dotnet SDK not installed on this host (expected on Linux cloud)"
fi

echo
echo "Windows-only (operator / bhoomi VM):"
echo "  1. Install .NET 8 SDK + Windows App SDK + WebView2"
echo "  2. powershell -File desktop/scripts/build-winui.ps1 -Profile STUDIO"
echo "  3. Code-sign desktop/artifacts/winui/AStudio.Shell.exe (or MSIX)"
echo "  4. Physical bind per docs/esti/MORNING-TEST-LF4.md → hasSyncToken"
echo "  5. Hand HTTPS URL + sha256 to Aakash — do not flip unsigned portal URLs"

if [[ "$FAIL" -ne 0 ]]; then
  echo
  echo "Validation FAILED"
  exit 1
fi
echo
echo "Validation OK (structure). Physical WinUI build/sign remains Windows-only."
exit 0
