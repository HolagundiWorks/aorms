#!/usr/bin/env bash
# ============================================================
#  AORMS — S8 reopen apex auth / portal demos
# ============================================================
# Sets VITE_MARKETING_ONLY=false and rebuilds the frontend.
# Does NOT flip signed installers (D6 — keep Coming soon until
# trusted URL + sha256 + VITE_PORTAL_USE_RELEASE_INSTALLERS).
#
# Usage (on the VPS, after honest portal tabs are ready):
#   CONFIRM=yes bash deploy/s8-reopen-demos.sh
#   CONFIRM=yes bash deploy/s8-reopen-demos.sh --dry-run
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY_RUN=1 ;;
    -h|--help)
      cat <<'EOF'
S8 reopen demos — set VITE_MARKETING_ONLY=false and rebuild.

  CONFIRM=yes bash deploy/s8-reopen-demos.sh
  CONFIRM=yes bash deploy/s8-reopen-demos.sh --dry-run

Honesty:
  - Installers stay Coming soon until D6 (do not set VITE_INSTALLERS_COMING_SOON=false
    here unless signed URL + sha256 are wired).
  - Staff ERP stays on desktop (AORMS Connect); apex reopens portal/demo login only.
EOF
      exit 0
      ;;
  esac
done

cd "$DEPLOY_DIR"
ENV_FILE="$DEPLOY_DIR/.env"

if [[ "${CONFIRM:-}" != "yes" ]]; then
  warn "Refusing without CONFIRM=yes (prevents accidental soft-launch flip)."
  warn "Example: CONFIRM=yes bash deploy/s8-reopen-demos.sh"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  error "Missing $ENV_FILE — run bootstrap/install first."
fi

section "S8 preflight"
set -a; load_dotenv "$ENV_FILE"; set +a

info "Current VITE_MARKETING_ONLY=${VITE_MARKETING_ONLY:-<unset>}"
info "VITE_INSTALLERS_COMING_SOON=${VITE_INSTALLERS_COMING_SOON:-<default true>}"
info "VITE_PORTAL_USE_RELEASE_INSTALLERS=${VITE_PORTAL_USE_RELEASE_INSTALLERS:-<empty>}"

if [[ "${VITE_PORTAL_USE_RELEASE_INSTALLERS:-}" =~ ^(1|true|yes|on)$ ]]; then
  warn "Release installers flag is on — ensure every available manifest has https URL + sha256 (D6)."
else
  info "Installers remain Coming soon / web_fallback (correct until D6)."
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  info "Dry-run: would set VITE_MARKETING_ONLY=false in $ENV_FILE and run deploy/update.sh"
  exit 0
fi

section "Apply VITE_MARKETING_ONLY=false"
if grep -qE '^VITE_MARKETING_ONLY=' "$ENV_FILE"; then
  # portable in-place edit
  tmp="$(mktemp)"
  sed -E 's/^VITE_MARKETING_ONLY=.*/VITE_MARKETING_ONLY=false/' "$ENV_FILE" >"$tmp"
  mv "$tmp" "$ENV_FILE"
else
  printf '\n# S8 — apex auth / portal demos reopened\nVITE_MARKETING_ONLY=false\n' >>"$ENV_FILE"
fi
chmod 600 "$ENV_FILE" || true
info "Wrote VITE_MARKETING_ONLY=false"

section "Rebuild frontend (deploy/update.sh)"
bash "$SCRIPT_DIR/update.sh"

section "Smoke"
if [[ -n "${DOMAIN:-}" ]]; then
  bash "$SCRIPT_DIR/verify-vps.sh" "https://${DOMAIN}" || true
else
  bash "$SCRIPT_DIR/verify-vps.sh" || true
fi

info "S8 flip complete. Expect /login to show Login (not Coming soon)."
info "Staff desktop login remains AORMS Connect. Installers still Coming soon until D6."
