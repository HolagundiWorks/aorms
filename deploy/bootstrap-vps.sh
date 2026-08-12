#!/usr/bin/env bash
# ============================================================
#  AORMS — one-shot VPS bootstrap (blank Ubuntu → live site)
# ============================================================
# Run as root on Ubuntu 22.04 / 24.04 AFTER DNS A/AAAA points here.
#
# Interactive:
#   curl -fsSL https://raw.githubusercontent.com/HolagundiWorks/aorms/main/deploy/bootstrap-vps.sh \
#     | sudo bash
#
# Non-interactive (recommended for automation):
#   DOMAIN=aorms.in ADMIN_EMAIL=ops@aorms.in \
#     OWNER_EMAIL=owner@firm.in OWNER_PASSWORD='…' \
#     sudo -E bash deploy/bootstrap-vps.sh
#
# Marketing-only (landing + downloads, no demo seed):
#   PROFILE=landing DOMAIN=aorms.in … sudo -E bash deploy/bootstrap-vps.sh
#
# Temporary self-signed TLS (no Let's Encrypt yet):
#   SELF_SIGNED_CERT=true DOMAIN=… … sudo -E bash deploy/bootstrap-vps.sh
#
# Then day-2 landing refresh:  bash /opt/esti/deploy/update-landing.sh
# Full stack update:          bash /opt/esti/deploy/update.sh
# Docs: docs/esti/VPS-INSTALL.md · deploy/README.md
# ============================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/HolagundiWorks/aorms.git}"
# Legacy clone URL still redirects here:
REPO_URL_LEGACY="${REPO_URL_LEGACY:-https://github.com/HolagundiWorks/esti.git}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/esti}"
GIT_BRANCH="${GIT_BRANCH:-main}"
PROFILE="${PROFILE:-aorms}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo -E bash deploy/bootstrap-vps.sh" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl ca-certificates

clone_repo() {
  local url="$1"
  git clone --branch "$GIT_BRANCH" "$url" "$DEPLOY_DIR"
}

if [[ -d "$DEPLOY_DIR/.git" ]]; then
  echo "==> Updating existing clone at ${DEPLOY_DIR}"
  git -C "$DEPLOY_DIR" fetch origin
  git -C "$DEPLOY_DIR" checkout "$GIT_BRANCH"
  git -C "$DEPLOY_DIR" pull --ff-only origin "$GIT_BRANCH" || \
    git -C "$DEPLOY_DIR" pull origin "$GIT_BRANCH"
elif [[ -d "$DEPLOY_DIR" ]] && [[ -f "$DEPLOY_DIR/deploy/install.sh" ]]; then
  echo "==> Repo present at ${DEPLOY_DIR} (no .git) — using as-is"
else
  echo "==> Cloning ${REPO_URL} → ${DEPLOY_DIR}"
  mkdir -p "$(dirname "$DEPLOY_DIR")"
  if ! clone_repo "$REPO_URL"; then
    echo "==> Primary clone failed — trying legacy ${REPO_URL_LEGACY}"
    rm -rf "$DEPLOY_DIR"
    clone_repo "$REPO_URL_LEGACY"
  fi
fi

cd "$DEPLOY_DIR"
chmod +x deploy/*.sh 2>/dev/null || true

export PROFILE GIT_BRANCH DEPLOY_DIR REPO_URL
# Forward install knobs when set (set -u safe).
for _k in DOMAIN ADMIN_EMAIL OWNER_EMAIL OWNER_PASSWORD PLATFORM_ADMIN_EMAILS \
  POSTGRES_PASSWORD SESSION_SECRET MINIO_USER MINIO_PASSWORD \
  SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM \
  SELF_SIGNED_CERT WITH_LICENSING VITE_ADMIN_URL DEMO_PASSWORD; do
  if [[ -n "${!_k+x}" ]]; then
    export "$_k"
  fi
done

case "$PROFILE" in
  landing)
    echo "==> Profile=landing → deploy/install-landing.sh"
    exec bash deploy/install-landing.sh
    ;;
  demo)
    echo "==> Profile=demo → deploy/install-demo.sh"
    exec bash deploy/install-demo.sh
    ;;
  core|enterprise)
    echo "==> Profile=${PROFILE} → deploy/install-enterprise.sh"
    exec bash deploy/install-enterprise.sh
    ;;
  *)
    echo "==> Profile=${PROFILE} → deploy/install.sh"
    exec bash deploy/install.sh
    ;;
esac
