#!/usr/bin/env bash
# ============================================================
#  AORMS — migration preflight safety check
#  ------------------------------------------------------------
#  Clone the LIVE database into a throwaway scratch DB, apply the
#  pending Drizzle migrations to the CLONE (exactly what the backend
#  runs on boot), and report whether they apply cleanly — WITHOUT
#  ever touching the real database. Run this before deploy/update.sh
#  when a release adds migrations.
#
#    sudo bash deploy/preflight-migrations.sh        # prod (compose.prod.yaml)
#    KEEP=1 bash deploy/preflight-migrations.sh      # keep the scratch DB to inspect
#    COMPOSE_FILE=compose.yaml bash deploy/preflight-migrations.sh   # dev stack
#
#  Exit 0 = migrations applied cleanly on a copy of live data → safe to update.
#  Exit 1 = a migration failed → do NOT run update.sh; the scratch DB is left
#           in place for inspection so you can see where it broke.
#
#  Read-only on the live database (pg_dump only). Only the scratch DB is
#  created, migrated, and dropped.
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
ROOT="$(cd "$ROOT" && pwd)"
# shellcheck source=lib.sh
source "$ROOT/deploy/lib.sh"

COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/compose.prod.yaml}"
[[ -f "$COMPOSE_FILE" ]] || error "compose file not found: $COMPOSE_FILE"
COMPOSE=(docker compose -f "$COMPOSE_FILE")
DB_SERVICE="${DB_SERVICE:-esti-db}"
BACKEND_SERVICE="${BACKEND_SERVICE:-backend}"
JOURNAL="$ROOT/backend/drizzle/meta/_journal.json"

# Credentials come from .env (same source deploy/update.sh reads).
[[ -f "$ROOT/.env" ]] && { set -a; load_dotenv "$ROOT/.env"; set +a; }
DB_USER="${POSTGRES_USER:-esti}"
DB_PASS="${POSTGRES_PASSWORD:-}"
SRC_DB="${SRC_DB:-${POSTGRES_DB:-esti}}"
TGT_DB="${TGT_DB:-esti_migcheck}"

# ── Guardrails — never let the scratch target be a real database ──────────────
case "$TGT_DB" in
  "$SRC_DB"|esti|postgres|template0|template1)
    error "refusing to use '$TGT_DB' as the scratch target (would risk the live DB)." ;;
esac
[[ "$TGT_DB" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || error "scratch DB name '$TGT_DB' is not a safe identifier."
[[ -f "$JOURNAL" ]] || error "migration journal not found: $JOURNAL (is this a full checkout?)"

# psql as the admin (postgres db) and against a named db.
admin()      { "${COMPOSE[@]}" exec -T "$DB_SERVICE" psql -qtAX -v ON_ERROR_STOP=1 -U "$DB_USER" -d postgres -c "$1"; }
query_db()   { "${COMPOSE[@]}" exec -T "$DB_SERVICE" psql -qtAX -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$1" -c "$2"; }

# Count applied migrations recorded in drizzle's bookkeeping table (0 if absent).
applied_count() {
  query_db "$1" "SELECT CASE WHEN to_regclass('drizzle.__drizzle_migrations') IS NULL THEN 0 ELSE (SELECT count(*) FROM drizzle.__drizzle_migrations) END;" \
    | tr -d '[:space:]'
}

"${COMPOSE[@]}" ps "$DB_SERVICE" >/dev/null 2>&1 || error "database service '$DB_SERVICE' is not running for $COMPOSE_FILE."

journal_total="$(grep -c '"tag"' "$JOURNAL" | tr -d '[:space:]')"

section "Migration preflight"
info "Compose : $COMPOSE_FILE"
info "Source  : $SRC_DB (live — read-only)   Scratch: $TGT_DB"
info "Journal : $journal_total migrations on disk"

section "Cloning live DB → scratch (pg_dump | psql)"
admin "DROP DATABASE IF EXISTS $TGT_DB" >/dev/null
admin "CREATE DATABASE $TGT_DB" >/dev/null
"${COMPOSE[@]}" exec -T "$DB_SERVICE" sh -lc \
  "pg_dump -U '$DB_USER' '$SRC_DB' | psql -q -v ON_ERROR_STOP=1 -U '$DB_USER' -d '$TGT_DB'" >/dev/null
before="$(applied_count "$TGT_DB")"
info "Clone ready — ${before} migrations already applied on live; $(( journal_total - before )) pending."

section "Applying pending migrations to the scratch clone"
SCRATCH_URL="postgres://${DB_USER}:${DB_PASS}@${DB_SERVICE}:5432/${TGT_DB}"
# One-off backend container (image already built), CMD overridden to just run the
# same runMigrations() the app runs on boot, pointed at the scratch DB.
if "${COMPOSE[@]}" run --rm --no-deps -T -e DATABASE_URL="$SCRATCH_URL" "$BACKEND_SERVICE" \
  node -e "import('./backend/dist/db/migrate.js').then(m=>m.runMigrations()).then(()=>{console.log('migrations applied');process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})"; then
  after="$(applied_count "$TGT_DB")"
  echo ""
  info "PASS ✅  migrations applied cleanly on a copy of live data."
  info "        ${before} → ${after} applied (+$(( after - before ))); journal has ${journal_total}."
  if [[ "$after" != "$journal_total" ]]; then
    warn "Applied count (${after}) != journal total (${journal_total}) — investigate before deploying."
  fi
  if [[ "${KEEP:-0}" == "1" ]]; then
    warn "KEEP=1 — leaving scratch DB '$TGT_DB' in place."
  else
    admin "DROP DATABASE IF EXISTS $TGT_DB" >/dev/null
    info "        scratch DB dropped. Safe to run: bash deploy/update.sh"
  fi
  exit 0
else
  echo ""
  echo -e "${RED}[✘] FAIL${NC} — a migration failed on the clone (see error above)."
  echo -e "         The live database was NOT touched. Do NOT run deploy/update.sh yet."
  echo -e "         Scratch DB '$TGT_DB' left in place for inspection:"
  echo -e "         ${CYAN}${COMPOSE[*]} exec $DB_SERVICE psql -U $DB_USER -d $TGT_DB${NC}"
  echo -e "         Drop it when done: ${CYAN}${COMPOSE[*]} exec $DB_SERVICE psql -U $DB_USER -d postgres -c 'DROP DATABASE $TGT_DB'${NC}"
  exit 1
fi
