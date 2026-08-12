#!/usr/bin/env bash
# ============================================================
#  AORMS — update marketing landing page on an existing VPS
# ============================================================
# Soft-launch day-2: pull + rebuild SPA + atomic dist swap.
# Default is frontend-only (fast). Use FULL=true to also rebuild
# backend/worker like deploy/update.sh.
#
#   cd /opt/esti
#   bash deploy/update-landing.sh
#   GIT_BRANCH=main bash deploy/update-landing.sh
#   FULL=true bash deploy/update-landing.sh          # backend + worker too
#   REFRESH_NGINX=true bash deploy/update-landing.sh # re-apply nginx vhost
#   SKIP_VERIFY=true bash deploy/update-landing.sh   # skip smoke checks
#
# Soft launch stays on: does NOT set VITE_MARKETING_ONLY=false
# (that is deploy/s8-reopen-demos.sh).
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

cd "$DEPLOY_DIR"
GIT_BRANCH="${GIT_BRANCH:-main}"
FULL="${FULL:-false}"
SKIP_VERIFY="${SKIP_VERIFY:-false}"

if [[ ! -f "$DEPLOY_DIR/.env" ]]; then
  error "No $DEPLOY_DIR/.env — run deploy/install-landing.sh (or bootstrap) first."
fi

set -a; load_dotenv "$DEPLOY_DIR/.env"; set +a
export FORCE_LANDING_UPDATE=true

section "AORMS landing update (${GIT_BRANCH})"
assert_landing_soft_launch_env

section "Pulling ${GIT_BRANCH}"
git fetch origin && git checkout "$GIT_BRANCH" && git pull origin "$GIT_BRANCH"

if [[ "$FULL" == "true" ]]; then
  section "Rebuilding backend + worker (FULL=true)"
  docker compose -f compose.prod.yaml build backend worker
  docker compose -f compose.prod.yaml up -d esti-mongo 2>/dev/null || true
  docker compose -f compose.prod.yaml up -d backend worker
  wait_for_backend_health 30 2 && info "Backend healthy." || warn "Backend /health failed — docker logs esti-backend"
  section "Seeds (idempotent)"
  docker compose -f compose.prod.yaml exec -T backend node backend/dist/scripts/seed.js || warn "base seed failed"
  if [[ "${SEED_DEMO:-false}" == "true" ]]; then
    docker compose -f compose.prod.yaml exec -T backend node backend/dist/scripts/seedDemo.js || warn "demo seed failed"
  else
    info "Demo seed skipped (SEED_DEMO=${SEED_DEMO:-false})"
  fi
else
  info "Frontend-only update (set FULL=true to rebuild backend/worker)"
  # Keep API warm for beta form / health — do not rebuild.
  docker compose -f compose.prod.yaml up -d backend 2>/dev/null || true
fi

section "Frontend (landing SPA · atomic dist swap)"
rebuild_frontend_dist

if [[ "${REFRESH_NGINX:-false}" == "true" ]]; then
  section "Refreshing nginx vhost"
  _dom="$(normalize_domain "${ALLOWED_ORIGINS:-${DOMAIN:-}}")"
  install_nginx_site "$_dom" "$DEPLOY_DIR" || warn "nginx refresh failed"
  if [[ "${SELF_SIGNED_CERT:-false}" == "true" ]]; then
    generate_self_signed "$_dom" 30 || warn "self-signed TLS re-assert failed"
  elif command -v certbot >/dev/null 2>&1 && [[ -n "$_dom" && -d "/etc/letsencrypt/live/$_dom" ]]; then
    certbot --nginx -d "$_dom" --redirect --non-interactive --keep-until-expiring \
      && nginx -t && systemctl reload nginx \
      || warn "certbot TLS re-assert failed — run: certbot --nginx -d $_dom --redirect"
  fi
fi

if [[ "$SKIP_VERIFY" != "true" ]]; then
  section "Smoke"
  bash "$SCRIPT_DIR/verify-vps.sh" || warn "verify-vps reported failures — check nginx / dist"
fi

info "Landing update complete."
echo "  Site : https://${DOMAIN:-aorms.in}/"
echo "  Dist : ${DEPLOY_DIR}/frontend/dist"
echo "  Soft launch gate: VITE_MARKETING_ONLY=${VITE_MARKETING_ONLY:-true}"
