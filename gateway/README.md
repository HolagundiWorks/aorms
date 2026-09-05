# Jobs gateway

The Phase 6 enqueue boundary — see
[docs/esti/NEXTJS-MIGRATION-PHASE6-AUDIT.md](../docs/esti/NEXTJS-MIGRATION-PHASE6-AUDIT.md).

`web/` (Next.js) deploys to Hostinger Managed App Hosting; the Python worker
(`../worker/`) and Redis stay on the existing VPS, unaffected — Hostinger's
Node.js hosting has no documented support for a background worker process or
Redis. This tiny service is the authenticated HTTP boundary between the two:
`web/`'s Server Actions call `POST /jobs` here instead of talking to Redis
directly, so Redis itself never needs to be reachable from the public
internet — the same reason Supabase fronts Postgres with PostgREST rather
than exposing the database directly.

It does exactly one real thing: check a bearer token, validate a job `type`
against the same four job types the worker knows (`dxf_to_svg`,
`render_pdf`, `pdf_to_markdown`, `reconcile_import`), and `XADD` onto the
same Redis Stream `backend/src/lib/redis.ts`'s `enqueueJob()` used — same
stream name, same field names (`type`, `payload`) — so
`worker/esti_worker/main.py` needs **zero changes** to consume a job
produced here instead of there. Verified live: see the commit that added
this for the exact `XADD` → `XREADGROUP` round-trip proof against a real
ephemeral Redis, plus a real browser click-through against `web/`'s
`/invoices` "Generate PDF" button.

## Endpoints

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /healthz` | none | Liveness probe for the reverse proxy / compose healthcheck |
| `POST /jobs` | `Authorization: Bearer <JOBS_GATEWAY_TOKEN>` | `{ type, payload, requestId? }` → `202 { id }` on success |

## Local development

```bash
cp .env.example .env      # fill in JOBS_GATEWAY_TOKEN, point REDIS_URL at a local Redis
npm install
npm run dev
```

## Production deployment (not yet done — see the Phase 6 audit's "What's still open")

This service, `compose.prod.yaml`'s new `jobs-gateway` block, and
`deploy/nginx-proxy.conf`'s new `jobs.DOMAIN_PLACEHOLDER` server block are
all written and ready, but **none of this has been deployed to the live VPS
yet** — this repo session had no VPS access to do it. The actual rollout,
when someone with VPS access picks it up:

1. Generate a token: `openssl rand -hex 32`, add it to the VPS's `.env` as
   `JOBS_GATEWAY_TOKEN=...` (same value `web/`'s own deployment's
   `JOBS_GATEWAY_TOKEN` env var must carry).
2. `docker compose -f compose.prod.yaml up -d --build jobs-gateway`.
3. Add a DNS `A`/`AAAA` record for `jobs.<domain>` pointing at the VPS.
4. `sudo ln -s /etc/nginx/sites-available/esti /etc/nginx/sites-enabled/esti`
   already exists from the main install — just re-run `nginx -t && systemctl
   reload nginx` after `deploy/nginx-proxy.conf`'s placeholder substitution
   picks up the new `jobs.DOMAIN_PLACEHOLDER` block (same `install.sh`/
   `update.sh` substitution step every other subdomain in that file uses).
5. `sudo certbot --nginx -d jobs.<domain>` to provision TLS for the new
   subdomain (matches the existing `admin.<domain>` pattern).
6. Set `JOBS_GATEWAY_URL=https://jobs.<domain>` and the matching
   `JOBS_GATEWAY_TOKEN` in `web/`'s own deployment environment (Hostinger).

Until this is done, `web/`'s "Generate PDF" button (and every future one
wired the same way) surfaces a clear in-UI error — `JobEnqueueError` from
`web/lib/jobs/enqueue.ts` — rather than crashing, so shipping `web/`'s side
first without this deployed is safe.
