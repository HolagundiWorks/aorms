#!/usr/bin/env bash
# ============================================================
#  AORMS — post-install VPS smoke check
# ============================================================
# Run on the VPS after install/update:
#   bash deploy/verify-vps.sh
#   bash deploy/verify-vps.sh https://aorms.in
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

cd "$DEPLOY_DIR"
BASE_URL="${1:-}"
if [[ -f "$DEPLOY_DIR/.env" ]]; then
  set -a; load_dotenv "$DEPLOY_DIR/.env"; set +a
fi
if [[ -z "$BASE_URL" ]]; then
  if [[ -n "${DOMAIN:-}" ]]; then
    BASE_URL="https://${DOMAIN}"
  fi
fi
BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
BACKEND_HEALTH="${BACKEND_HEALTH:-http://127.0.0.1:4000/health}"

fail=0
check() {
  local name="$1" url="$2"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 -L "$url" || echo 000)"
  if [[ "$code" =~ ^(200|301|302|308)$ ]]; then
    info "OK  ${name} → ${code}  (${url})"
  else
    warn "FAIL ${name} → ${code}  (${url})"
    fail=1
  fi
}

section "Containers"
docker compose -f compose.prod.yaml ps || true

section "Backend health"
if curl -fsS --max-time 10 "$BACKEND_HEALTH" >/dev/null; then
  info "OK  ${BACKEND_HEALTH}"
else
  warn "FAIL ${BACKEND_HEALTH}"
  fail=1
fi

section "Public surfaces (${BASE_URL})"
check "landing"   "${BASE_URL}/"
check "downloads" "${BASE_URL}/downloads"
check "login"     "${BASE_URL}/login"
check "blog"      "${BASE_URL}/blog"
check "wiki→home" "${BASE_URL}/wiki"
check "aproc→pmc" "${BASE_URL}/aproc"
check "login→soon" "${BASE_URL}/login"

section "Suite ops (Mongo)"
if docker compose -f compose.prod.yaml ps --status running 2>/dev/null | grep -q esti-mongo; then
  if docker exec esti-mongo mongosh --quiet --eval 'db.adminCommand({ ping: 1 }).ok' 2>/dev/null | grep -q 1; then
    info "OK  esti-mongo ping"
  else
    warn "FAIL esti-mongo ping"
    fail=1
  fi
else
  warn "esti-mongo not running — portal ops fall back to in-memory (set MONGODB_URL)"
fi

section "Static assets"
if [[ -f "$DEPLOY_DIR/frontend/dist/index.html" ]]; then
  info "OK  frontend/dist/index.html present"
else
  warn "FAIL frontend/dist missing — run deploy/update-landing.sh (or update.sh)"
  fail=1
fi
if [[ -f "$DEPLOY_DIR/frontend/dist/landing/hero/aorms-aec-poster.jpg" ]]; then
  info "OK  hero poster present"
  check "hero-poster" "${BASE_URL}/landing/hero/aorms-aec-poster.jpg"
else
  warn "Hero poster missing in dist — pull latest and run deploy/update-landing.sh"
fi

_mkt="${VITE_MARKETING_ONLY:-true}"
if [[ "$_mkt" == "true" ]]; then
  info "Soft launch: VITE_MARKETING_ONLY=true (apex login Coming soon)"
else
  warn "VITE_MARKETING_ONLY=${_mkt} — demos/auth may be open (S8)"
fi

if [[ "$fail" -eq 0 ]]; then
  echo ""
  info "VPS smoke passed."
  exit 0
fi
echo ""
warn "VPS smoke reported failures — see docker logs esti-backend / nginx -t"
exit 1
