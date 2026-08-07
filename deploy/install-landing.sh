#!/usr/bin/env bash
# ============================================================
#  AORMS — marketing / landing VPS install (soft launch)
# ============================================================
# Public suite landing + blog + downloads (Coming soon). Apex login deactivated.
# Same stack as install.sh with PROFILE=landing.
#
#   sudo bash deploy/install-landing.sh
#   DOMAIN=aorms.in ADMIN_EMAIL=ops@aorms.in \
#     OWNER_EMAIL=owner@firm.in OWNER_PASSWORD='…' \
#     sudo -E bash deploy/install-landing.sh
#
# Re-enable login later: set VITE_MARKETING_ONLY=false in .env → bash deploy/update.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PROFILE=landing
export VITE_MARKETING_ONLY="${VITE_MARKETING_ONLY:-true}"
exec bash "$SCRIPT_DIR/install.sh"
