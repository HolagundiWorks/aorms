#!/usr/bin/env bash
# ESTI AORMS — update an existing deployment in place.
# Pulls code, rebuilds backend/worker/frontend, swaps the static dist atomically,
# rolling-restarts, runs idempotent seeds. The profile is read from .env — not repeated.
#   bash deploy/update.sh
#   GIT_BRANCH=feat/x bash deploy/update.sh    # deploy a branch
#   REFRESH_NGINX=true bash deploy/update.sh    # also re-apply nginx vhost
#
# Marketing / soft-launch landing boxes can use the faster frontend path:
#   bash deploy/update-landing.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

cd "$DEPLOY_DIR"
GIT_BRANCH="${GIT_BRANCH:-main}"
set -a; load_dotenv "$DEPLOY_DIR/.env"; set +a

_profile="${DEPLOY_PROFILE:-}"
if [[ "$_profile" == "landing" ]]; then
  section "Profile=landing (soft launch marketing)"
  assert_landing_soft_launch_env
  info "Tip: for a faster SPA-only refresh use bash deploy/update-landing.sh"
fi

section "Pulling ${GIT_BRANCH}"
git fetch origin && git checkout "$GIT_BRANCH" && git pull origin "$GIT_BRANCH"

section "Rebuilding backend + worker"
docker compose -f compose.prod.yaml build backend worker
# Ensure suite ops Mongo is up (added 2026-08; no-op if already running).
docker compose -f compose.prod.yaml up -d esti-mongo 2>/dev/null || true
docker compose -f compose.prod.yaml up -d backend worker
wait_for_backend_health 30 2 && info "Backend healthy." || warn "Backend /health failed — docker logs esti-backend"

# ESE was retired from compose.prod.yaml (2026-07 estimation teardown). Skip when
# the service is absent even if legacy .env still has ESE_ENABLED=true.
if [[ "${ESE_ENABLED:-false}" == "true" ]]; then
  if docker compose -f compose.prod.yaml config --services 2>/dev/null | grep -qx ese; then
    section "Rebuilding ESE"
    docker compose -f compose.prod.yaml build ese
    docker compose -f compose.prod.yaml up -d ese
    info "ESE rebuilt (ese.<domain>)."
  else
    warn "ESE_ENABLED=true but compose.prod.yaml has no ese service — skipping (set ESE_ENABLED=false in .env)."
  fi
fi

section "Seeds (idempotent)"
docker compose -f compose.prod.yaml exec -T backend node backend/dist/scripts/seed.js || warn "base seed failed"
if [[ "${SEED_DEMO:-false}" == "true" ]]; then
  docker compose -f compose.prod.yaml exec -T backend node backend/dist/scripts/seedDemo.js || warn "demo seed failed"
elif [[ "$_profile" == "landing" ]]; then
  info "Demo seed skipped (landing profile)."
fi

section "Frontend (atomic dist swap)"
rebuild_frontend_dist

if [[ "${REFRESH_NGINX:-false}" == "true" ]]; then
  section "Refreshing nginx vhost"
  _dom="$(normalize_domain "${ALLOWED_ORIGINS:-}")"
  install_nginx_site "$_dom" "$DEPLOY_DIR" || warn "nginx refresh failed"
  # install_nginx_site re-copies the HTTP-only template, which drops the SSL
  # server block certbot had appended. Re-assert TLS so HTTPS survives a refresh.
  if [[ "${SELF_SIGNED_CERT:-false}" == "true" ]]; then
    # Re-generate / re-assert the self-signed block if requested.
    generate_self_signed "$_dom" 30 || warn "self-signed TLS re-assert failed"
  else
    if command -v certbot >/dev/null 2>&1 && [[ -n "$_dom" && -d "/etc/letsencrypt/live/$_dom" ]]; then
      certbot --nginx -d "$_dom" --redirect --non-interactive --keep-until-expiring \
        && nginx -t && systemctl reload nginx \
        || warn "certbot TLS re-assert failed — run: certbot --nginx -d $_dom --redirect"
    fi
  fi
fi
info "Update complete."
if [[ "$_profile" == "landing" ]]; then
  echo "  Landing : https://${DOMAIN:-}/  (soft launch VITE_MARKETING_ONLY=${VITE_MARKETING_ONLY:-true})"
fi
