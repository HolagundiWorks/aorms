# Production operations checklist

Use this before declaring a VPS instance production-ready.

> **Runtime split:** development uses **Podman** (`podman compose up`) with `compose.yaml`.
> Production (VPS) uses **Docker** (`docker compose`) with `compose.prod.yaml`.
> All commands in this document target the VPS/Docker environment unless explicitly noted.
>
> **Roadmap:** [ROADMAP.md](ROADMAP.md) · **Install:** [VPS-INSTALL.md](VPS-INSTALL.md) · **Deploy scripts:** [`deploy/README.md`](../../deploy/README.md)

---

## Soft launch (aorms.in marketing — 2026-08)

Goal: **landing + blog only**. Apex login and installers stay Coming soon.

| Check | How |
| --- | --- |
| DNS A/AAAA → VPS | `dig +short YOUR_DOMAIN` |
| Install | `PROFILE=landing` via `deploy/bootstrap-vps.sh` or `deploy/install-landing.sh` |
| Env | `VITE_PUBLIC_SITE=true` · `VITE_MARKETING_ONLY=true` (default) · Mongo URL set by installer |
| Build | Frontend image bakes `VITE_MARKETING_ONLY` ([Dockerfile.prod](../../frontend/Dockerfile.prod)) |
| Smoke | `bash deploy/verify-vps.sh https://YOUR_DOMAIN` |
| Expect 200 | `/` · `/blog` · `/downloads` · `/wiki`→home · `/login`→Coming soon |
| Blog explainers | `/blog/why-aorms-suite-matters` · `how-aorms-suite-solves-fragmented-practice` · `aorms-suite-map` |
| Do **not** | Seed demo for marketing-only · Flip installers without signed URL+sha256 |

One-shot:

```bash
PROFILE=landing DOMAIN=aorms.in ADMIN_EMAIL=ops@aorms.in \
  OWNER_EMAIL=owner@firm.in OWNER_PASSWORD='…' \
  curl -fsSL https://raw.githubusercontent.com/HolagundiWorks/aorms/main/deploy/bootstrap-vps.sh \
  | sudo -E bash
```

### S8 — Reopen apex auth / portal demos

**When:** Firm portal tabs are honest (see [FIRM-PORTAL-SECTIONS.md](FIRM-PORTAL-SECTIONS.md)).  
**Does not:** Flip signed Windows Download CTAs (that is **D6**).  
**Staff ERP:** Still desktop via **AORMS Connect** — apex reopens portal/demo login only.

```bash
# On the VPS — requires explicit CONFIRM=yes
CONFIRM=yes bash deploy/s8-reopen-demos.sh
# Preview only:
CONFIRM=yes bash deploy/s8-reopen-demos.sh --dry-run

# From a workstation (GitHub Actions + VPS_* secrets):
gh workflow run s8-reopen-demos.yml -f mode=dry-run
gh workflow run s8-reopen-demos.yml -f mode=apply
```

If Actions fails with `Permission denied (publickey)`, the VPS no longer
trusts `VPS_SSH_KEY`. Production is **Hostinger** (`srv1742242.hstgr.cloud` /
`187.127.178.205`). Open **hPanel → VPS → Browser terminal**, then:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJzNk7P4spTM1FBfiiZiIa9k6asphlWNgW4lanTI04DT aorms-deploy-github-actions' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Then re-run `gh workflow run s8-reopen-demos.yml -f mode=apply` (or say “key added”
in chat and the agent will run it).


Manual equivalent: set `VITE_MARKETING_ONLY=false` in `/opt/esti/.env`, then
`bash deploy/update.sh`. Keep `VITE_INSTALLERS_COMING_SOON` default / true until D6
(signed URL + sha256 + `VITE_PORTAL_USE_RELEASE_INSTALLERS`). See [ROADMAP.md](ROADMAP.md).

---

## Secrets and environment

1. Normally you don't touch `.env` — `deploy/install.sh` / `bootstrap-vps.sh` generates `/opt/esti/.env` (secrets auto-generated). For a **manual** deploy, copy `deploy/.env.production.example` → `.env` on the VPS.
2. In a manual `.env`, replace **every** `CHANGE_ME_*` value by hand — nothing auto-substitutes when you deploy this way.
3. Generate strong secrets:
   - `openssl rand -hex 32` → `SESSION_SECRET`
   - `openssl rand -base64 24` → `POSTGRES_PASSWORD`, `S3_SECRET_KEY`
4. Soft launch: keep `VITE_MARKETING_ONLY=true`. Full firm: set `ALLOWED_ORIGINS` for every surface host ([AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md)).
5. Keep `COOKIE_SECURE=true` when serving over HTTPS.
6. For **real firm data**: use a unique `SEED_OWNER_EMAIL` / strong password; **do not** run `seed:demo`.
7. Ensure `MONGODB_URL=mongodb://esti-mongo:27017` (suite ops) unless intentionally using in-memory fallback.
8. Store `.env` with `chmod 600`; never commit it.

---

## TLS and nginx

AORMS terminates TLS on **host nginx** (not inside Docker). Docker runs the API on `127.0.0.1:4000` only.

### Prerequisites

- DNS **A** record for your domain → VPS public IP
- Ports **80** and **443** open (`ufw allow 80/tcp`, `ufw allow 443/tcp`)
- HTTP site working first (nginx serves SPA from `/opt/esti/frontend/dist`)

### Fresh VPS (SSL included)

```bash
# Soft-launch marketing (recommended for aorms.in now):
PROFILE=landing DOMAIN=aorms.in ADMIN_EMAIL=ops@aorms.in \
  OWNER_EMAIL=owner@firm.in OWNER_PASSWORD='…' \
  curl -fsSL https://raw.githubusercontent.com/HolagundiWorks/aorms/main/deploy/bootstrap-vps.sh \
  | sudo -E bash

# Or full AORMS-site profile:
git clone https://github.com/HolagundiWorks/aorms.git /opt/esti
cd /opt/esti
sudo bash deploy/install.sh
```

Non-interactive (pass the profile + inputs as env vars):

```bash
PROFILE=landing DOMAIN=aorms.in ADMIN_EMAIL=ops@firm.in \
  OWNER_EMAIL=owner@firm.in OWNER_PASSWORD=… sudo -E bash deploy/install-landing.sh
```

### Enable SSL on an existing HTTP-only VPS

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx

cd /opt/esti
DOMAIN=aorms.in   # hostname only — no https://

sudo cp deploy/nginx-proxy.conf /etc/nginx/sites-available/esti
sudo sed -i "s|DOMAIN_PLACEHOLDER|${DOMAIN}|g" /etc/nginx/sites-available/esti
sudo sed -i "s|DEPLOY_DIR_PLACEHOLDER|/opt/esti|g" /etc/nginx/sites-available/esti
sudo ln -sf /etc/nginx/sites-available/esti /etc/nginx/sites-enabled/esti
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d "$DOMAIN" --agree-tos -m you@example.com --redirect
sudo systemctl reload nginx
```

Then update `.env`:

```env
COOKIE_SECURE=true
ALLOWED_ORIGINS=https://aorms.in
```

Restart backend: `docker compose -f compose.prod.yaml up -d backend`

### Verify

```bash
curl -I https://your-domain
curl -s -o /dev/null -w "health %{http_code}\n" https://your-domain/health
sudo certbot certificates
sudo certbot renew --dry-run
```

Certbot installs a systemd timer for renewal.

---

## Database migrations

Schema is managed by committed SQL under `backend/drizzle/`. The backend applies pending migrations on startup; demo seeds also call `ensureDemoSchema()` before mutating data.

**Journal discipline:** every `backend/drizzle/NNNN_*.sql` file must appear in `backend/drizzle/meta/_journal.json`. Missing entries (historically `0041_wellbeing_opt_in`, `0048_ai_studio`) caused VPS columns to be absent while Drizzle ORM expected them. Repair migration `0056_schema_repair.sql` adds belt-and-suspenders `ADD COLUMN IF NOT EXISTS` for known drift.

After deploy, confirm migrations applied:

```bash
docker compose -f compose.prod.yaml logs backend --tail 30
docker compose -f compose.prod.yaml exec esti-db psql -U esti -d esti -c \
  "SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 5;"
```

---

## Demo seeds (public demo hosts only)

Run after deploy on **demo** instances — not production firm data:

```bash
docker compose -f compose.prod.yaml exec backend pnpm --filter @esti/backend seed:prod
docker compose -f compose.prod.yaml exec backend pnpm --filter @esti/backend seed:demo:prod
# Repair passwords + print login status:
docker compose -f compose.prod.yaml exec backend pnpm --filter @esti/backend seed:sync-demo:prod
```

| Account | Email | Password |
|---------|-------|----------|
| Team demo | `principal@demo.aorms.in` | `demo1234` (or `SEED_DEMO_PASSWORD`) |
| Client portal | `client@demo.aorms.in` | same → `/login?tab=portals` |
| Contractor portal | `contractor@demo.aorms.in` | same |
| Collaborator portal | `collab@demo.aorms.in` | same |

See [DEMO-AND-HR-MODE.md](DEMO-AND-HR-MODE.md).

---

## Landing page ESTI AI (Ollama required)

Prompts and Ollama client live in **`@hcw/aorms-ai-kit`** (vendored at `vendor/hcw-aorms-ai-kit/`). Rebuild backend after updating that package version. See [KITS.md](../KITS.md).

The public marketing site exposes **Ask ESTI** (`marketing.askEsti`) — product FAQ powered by on-server Ollama. There is **no mock fallback** on the landing page; if Ollama is down, visitors see a friendly unavailable message.

**Prerequisites**

1. `esti-ollama` service running in `compose.prod.yaml` (or `OLLAMA_BASE_URL` pointing to a reachable host).
2. Model pulled: `docker compose -f compose.prod.yaml exec esti-ollama ollama pull llama3.2` (or your `OLLAMA_MODEL`).
3. Rebuild backend after deploy so `landing-gateway` is in the image.

**Verify**

```bash
docker compose -f compose.prod.yaml exec esti-ollama ollama list
curl -s http://127.0.0.1:11434/api/tags | head
```

Open the site → corner **Ask ESTI** → ask “What is CRIF?” — expect an answer about the project change register.

---

## Beta request form (internal landing form + SMTP)

The **Request beta testing access** form on the landing page (`#beta`) is built into AORMS — **not** Google Forms. Each submission is:

1. Saved in PostgreSQL (`esti_trial_request`)
2. Emailed to **`BETA_REQUEST_NOTIFY_TO`** (default `hi@aorms.in`) when SMTP is configured

Configure your **mailbox SMTP** in `/opt/esti/.env` using credentials from your mail host panel:

```env
SMTP_HOST=smtp.gmail.com        # or mail.aorms.in / smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=hi@aorms.in
SMTP_PASS=your_mailbox_password
SMTP_FROM="AORMS Beta <hi@aorms.in>"
BETA_REQUEST_NOTIFY_TO=hi@aorms.in
```

| Port | `SMTP_SECURE` | Typical use |
|------|---------------|-------------|
| 587 | `false` | STARTTLS (most hosts) |
| 465 | `true` | Implicit SSL |

**Where to find settings**

- **Gmail with App Password:** Google Account → Security → 2-Step Verification → App passwords. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=you@gmail.com`, `SMTP_PASS=<16-char app password>`. Requires 2-Step Verification enabled.
- **Hostinger / similar:** hPanel → Emails → your mailbox → Connect apps / SMTP settings
- **cPanel:** Email Accounts → Connect Devices → outgoing server `mail.yourdomain.com`
- **Zoho Mail:** Mail → Settings → Mail accounts → SMTP

Restart backend after editing `.env`:

```bash
docker compose -f compose.prod.yaml up -d backend
```

**Test SMTP before going live**

```bash
docker compose -f compose.prod.yaml exec backend node backend/dist/scripts/testSmtp.js
```

Expect `✓ test message sent to hi@aorms.in` and the message in your inbox.

**Verify a real form submission**

```bash
docker compose -f compose.prod.yaml logs backend --tail 30

docker compose -f compose.prod.yaml exec esti-db psql -U esti -d esti -c \
  "SELECT full_name, work_email, company_name, created_at FROM esti_trial_request ORDER BY created_at DESC LIMIT 5;"
```

If SMTP is missing, submissions are **still saved**; backend logs: `beta request … saved but email not sent`.

---

## Object storage (downloads)

MinIO runs **internal-only** in `compose.prod.yaml`. Presigned URLs need a browser-reachable host:

| Option | Action |
|--------|--------|
| **Managed S3 / B2** | Point `S3_ENDPOINT` + `S3_PUBLIC_ENDPOINT` at the provider; drop `esti-minio` if unused. |
| **Self-hosted MinIO** | Publish MinIO on `127.0.0.1:9000`, add nginx `files.your-domain` TLS proxy, set `S3_PUBLIC_ENDPOINT=https://files.your-domain`. |

Until wired, PDF/drawing downloads will not resolve in the browser.

---

## Backup and restore drill

Run on a **staging clone** before production cutover.

```bash
# 1. Backup (PostgreSQL + optional MinIO volume)
bash deploy/backup.sh /opt/esti/backups

# 2. Restore drill on a staging clone: stop app, restore latest dump, verify /health
docker compose -f compose.prod.yaml stop backend worker
bash deploy/restore.sh "$(ls -t /opt/esti/backups/esti-pg-*.sql.gz | head -1)"
docker compose -f compose.prod.yaml up -d backend worker
curl -s http://127.0.0.1:4000/health | jq .
curl -s http://127.0.0.1:4000/readyz | jq .
```

Sign-off: owner can log in, open a project, and download an existing PDF after restore.

### Staging sign-off record

Run on the **staging VPS clone** before production cutover. Record in your ops log (not in git):

| Field | Value |
|-------|-------|
| Date | YYYY-MM-DD |
| Operator | Name |
| Backup path | e.g. `/opt/esti/backups/esti-pg-…` |
| `restore.sh` exit code | 0 |
| `/health` after drill | `ok: true` |
| Spot check | Login, project open, PDF download |

If the drill fails, do not declare production-ready — fix backup/restore paths first.

---

## Health probes

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Deploy gate — DB + Redis required (`ok: true`); revision + build metadata |
| `GET /readyz` | Full stack — DB + Redis + MinIO bucket (`503` if storage missing) |

Post-deploy: `bash scripts/smoke-health.sh http://127.0.0.1:4000`

Owner UI: **Company → Release & readiness** mirrors `system.release` tRPC.

---

## CI and release audit

- GitHub Actions (`.github/workflows/ci.yml`, `esti-ci`) runs on every push and PR: the **node** job does typecheck · lint · tests · backend + frontend production builds; the **python** job runs `ruff check` + `pytest` on the worker. Green CI is the pre-release gate.
- Dependency licenses: `node scripts/licenses.mjs`
- Backend API smoke: `pnpm --filter @esti/backend test:api-smoke`
- Worker limits / idempotency: [WORKER-LIMITS.md](WORKER-LIMITS.md)

---

## List caps

Office-wide queries use `clampListLimit()` (default 100, max 500). Activity feed and project-scoped lists use cursor pagination. Raise caps only after profiling — prefer filters and pagination over unbounded scans.

---

## Deploy cadence

```bash
cd /opt/esti
bash deploy/update.sh        # pulls, rebuilds, atomic dist swap, idempotent seeds
```

`update.sh` rebuilds images, extracts frontend `dist/` for host nginx (atomic swap), runs idempotent seeds, and waits for `/health`. Pass `GIT_BRANCH=…` to deploy a branch or `REFRESH_NGINX=true` to re-apply the nginx vhost.
