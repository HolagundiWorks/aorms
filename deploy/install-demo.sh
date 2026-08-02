#!/usr/bin/env bash
# ============================================================
#  AORMS — Landing + Demo showcase install
#  ------------------------------------------------------------
#  A focused front door for a PUBLIC SHOWCASE box: the marketing
#  landing page + a fully seeded demo workspace, nothing else.
#  No real firm data, no licensing console (unless WITH_LICENSING=true),
#  no product API key. Everything sensible is auto-generated so the
#  only things you must supply are the domain and a TLS email.
#
#  Ubuntu 22.04 / 24.04, as root:
#    sudo bash deploy/install-demo.sh
#  Non-interactive:
#    DOMAIN=demo.aorms.in ADMIN_EMAIL=ops@aorms.in \
#      sudo -E bash deploy/install-demo.sh
#
#  This box is meant to be disposable — anyone can browse the landing
#  page and sign in to the demo with the printed credentials. Do NOT
#  put real client data on it. Holagundi's own site (landing + main app
#  + licensing) uses deploy/install.sh; customer self-hosts use
#  deploy/install-enterprise.sh. All three share the tested install
#  core in deploy/lib.sh.
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

[[ $EUID -ne 0 ]] && error "Run as root: sudo bash deploy/install-demo.sh"

clear
echo -e "${CYAN}${BOLD}"
echo "  █████╗  ██████╗ ██████╗ ███╗   ███╗███████╗"
echo " ██╔══██╗██╔═══██╗██╔══██╗████╗ ████║██╔════╝"
echo " ███████║██║   ██║██████╔╝██╔████╔██║███████╗"
echo " ██╔══██║██║   ██║██╔══██╗██║╚██╔╝██║╚════██║"
echo " ██║  ██║╚██████╔╝██║  ██║██║ ╚═╝ ██║███████║"
echo " ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝"
echo -e "  AORMS — Landing + Demo showcase${NC}"
echo "  ============================================"

# ── Profile (fixed) ───────────────────────────────────────────────────────────
# Always: public marketing landing + seeded demo workspace. Never a firm-core or
# enterprise install; SEED_DEMO is forced on. FIRM_PLAN=ENTERPRISE so the demo
# shows every module unlocked.
PROFILE="demo"; PUBLIC_SITE="true"; SEED_DEMO="true"; FIRM_PLAN="ENTERPRISE"

# Licensing console is OFF by default on a showcase box (keeps /platform-admin
# off the public internet). Opt in with WITH_LICENSING=true if you specifically
# want to demo the licensing & account flow too.
PLATFORM_ADMIN_EMAILS="${PLATFORM_ADMIN_EMAILS:-}"
PLATFORM_ENABLED=""
if [[ "${WITH_LICENSING:-false}" == "true" ]]; then
  PLATFORM_ENABLED="true"
  [[ -z "${ESTI_UNIFIED_ACCOUNTS:-}" ]] && ESTI_UNIFIED_ACCOUNTS="true"
fi
export PROFILE PUBLIC_SITE SEED_DEMO FIRM_PLAN PLATFORM_ADMIN_EMAILS PLATFORM_ENABLED ESTI_UNIFIED_ACCOUNTS

info "Profile: ${BOLD}landing + demo${NC}  (public site: true, demo: true, plan: ${FIRM_PLAN}, licensing: ${PLATFORM_ENABLED:-false})"

# ── Configuration (env vars skip the matching prompt) ────────────────────────
section "Configuration"
[[ -n "${DOMAIN:-}" ]] || ask "Domain for the showcase (e.g. demo.aorms.in):" DOMAIN
DOMAIN="$(normalize_domain "${DOMAIN:-}")"
validate_domain "$DOMAIN" || error "Enter a valid domain (hostname only)."

[[ -n "${ADMIN_EMAIL:-}" ]] || ask "Your email (for the TLS certificate):" ADMIN_EMAIL
[[ "$ADMIN_EMAIL" == *@*.* ]] || error "A valid email is required for the TLS certificate."

# Standalone licensing console origin — only when the overlay is enabled.
if [[ -z "${VITE_ADMIN_URL+x}" && "$PLATFORM_ENABLED" == "true" ]]; then
  VITE_ADMIN_URL="https://admin.${DOMAIN}"
fi
export VITE_ADMIN_URL

GIT_BRANCH="${GIT_BRANCH:-main}"

# Demo login password (shared by every seeded account). Default keeps the box
# one-command; override with DEMO_PASSWORD for a slightly less guessable showcase.
[[ -n "${DEMO_PASSWORD:-}" ]] || ask "Demo account password [demo1234]:" DEMO_PASSWORD
DEMO_PASSWORD="${DEMO_PASSWORD:-demo1234}"

# The showcase "owner" IS a demo account — no separate real admin to invent.
OWNER_EMAIL="${OWNER_EMAIL:-principal@demo.aorms.in}"
OWNER_PASSWORD="${OWNER_PASSWORD:-$DEMO_PASSWORD}"

# Everything else is auto-generated — a showcase box has no secrets worth typing.
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -hex 16)}"
SESSION_SECRET="${SESSION_SECRET:-$(openssl rand -hex 32)}"
MINIO_USER="${MINIO_USER:-esti-admin}"
MINIO_PASSWORD="${MINIO_PASSWORD:-$(openssl rand -hex 16)}"
[[ ${#MINIO_PASSWORD} -lt 8 ]] && MINIO_PASSWORD="$(openssl rand -hex 16)"
info "Secrets auto-generated (Postgres, session, MinIO)."

# Outbound email is off by default on a demo box — nothing here needs to send
# mail. Set SMTP_HOST in the environment to enable it.
SMTP_HOST="${SMTP_HOST:-}"
if [[ -n "$SMTP_HOST" ]]; then
  SMTP_PORT="${SMTP_PORT:-587}"
  SMTP_FROM="${SMTP_FROM:-AORMS <no-reply@${DOMAIN}>}"
  info "Email enabled via ${SMTP_HOST}:${SMTP_PORT}."
else
  warn "Email sending disabled (fine for a demo) — set SMTP_HOST in .env to enable."
fi
export SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS SMTP_FROM BETA_REQUEST_NOTIFY_TO

# Licensing overlay (only when WITH_LICENSING=true): showcase the /platform-admin
# console alongside the demo workspace.
if [[ "$PLATFORM_ENABLED" == "true" ]]; then
  [[ -n "${PLATFORM_ADMIN_EMAILS:-}" ]] || ask "Platform admin emails (comma-separated):" PLATFORM_ADMIN_EMAILS
  info "Licensing console on: register at /platform-admin with one of those emails."
fi

export DOMAIN POSTGRES_PASSWORD SESSION_SECRET MINIO_USER MINIO_PASSWORD
export OWNER_EMAIL OWNER_PASSWORD DEMO_PASSWORD PLATFORM_ADMIN_EMAILS

echo ""
warn "This is a PUBLIC showcase with demo data — do not store real client data here."
info "Configuration collected — installing the landing + demo showcase for ${DOMAIN}..."

# Reuse the one, shared, tested install flow (deploy/lib.sh): PUBLIC_SITE=true
# serves the marketing landing, SEED_DEMO=true seeds the demo workspace.
install_core "$ADMIN_EMAIL" "$GIT_BRANCH"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}============================================${NC}"
echo -e "${GREEN}${BOLD}  AORMS — landing + demo is live!${NC}"
echo -e "${GREEN}${BOLD}============================================${NC}"
echo -e "  Landing : ${BOLD}https://${DOMAIN}${NC}"
echo -e "  Demo    : sign in at ${BOLD}https://${DOMAIN}/login${NC}"
echo -e "            ${BOLD}${OWNER_EMAIL}${NC} / ${DEMO_PASSWORD}"
if [[ "$PLATFORM_ENABLED" == "true" ]]; then
  echo -e "  Admin   : ${BOLD}https://${DOMAIN}/platform-admin${NC} (register with a PLATFORM_ADMIN_EMAILS address)"
fi
echo ""
echo -e "  Re-seed : ${CYAN}docker compose -f ${DEPLOY_DIR}/compose.prod.yaml exec -T backend node backend/dist/scripts/seedDemo.js${NC}"
echo -e "  Update  : ${CYAN}bash ${DEPLOY_DIR}/deploy/update.sh${NC}"
echo ""
