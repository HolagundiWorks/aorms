# `web/` deployment — Hostinger Managed App Hosting

Practical deployment reference for the `web/` package (Next.js 16 +
Carbon + Supabase — see [NEXTJS-SUPABASE-MIGRATION.md](NEXTJS-SUPABASE-MIGRATION.md)).
This doc covers *how to deploy `web/`*; it does not repeat that doc's
architecture rationale (§23–25 there cover why Hostinger Managed App
Hosting was chosen over a VPS/Docker/Kubernetes setup — read that first if
the "why" is in question). Written 2026-09-09 as part of a hosting-
readiness pass; nothing below has been exercised against a real Hostinger
account yet — that first real deploy should treat this as a checklist to
verify against, not an already-proven runbook, and should correct this doc
wherever reality disagrees with it.

## Target architecture

```text
GitHub  →  Hostinger (Node.js app hosting)  →  Next.js (web/)
                                                     │
                                                     ▼
                                          Supabase (DB · Auth · Storage)
```

No Docker, no Kubernetes, no self-hosted Postgres, no self-hosted auth —
Hostinger runs the Next.js process directly; Supabase is the only external
infrastructure dependency for data/auth/storage. Design target is ~100
concurrent users (per §25 of the migration doc) — this is an internal
office-management ERP, not a public-scale consumer app, so the deployment
stays intentionally simple.

**`web/` is not yet the live production site.** As of this date, aorms.in
is still served by the old `frontend`/`backend` stack on the VPS (see
CLAUDE.md § Launch status); `web/` is the in-progress replacement. This doc
prepares `web/` to be deployable, which is a prerequisite for eventually
cutting traffic over — it does not itself perform that cutover.

## Required environment variables

Copy `web/.env.example` and fill in every value for the target environment;
see that file for the authoritative, commented list. Summary:

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `aorms-web` project (see below) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public, browser-exposed |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only, never expose to the client |
| `NEXT_PUBLIC_PLATFORM_SUPABASE_URL` | Yes | `aorms-platform` project (see below) |
| `NEXT_PUBLIC_PLATFORM_SUPABASE_ANON_KEY` | Yes | Public, browser-exposed |
| `PLATFORM_SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only |
| `JOBS_GATEWAY_URL` / `JOBS_GATEWAY_TOKEN` | Only if the `gateway/` job bus is deployed | Feeds `lib/jobs/enqueue.ts`; if unset, job-enqueueing Server Actions will fail — confirm whether the Phase 6 gateway is actually deployed before going live, or those features (DXF→SVG, PDF rendering, reconciliation import) will error at runtime |
| `OLLAMA_BASE_URL` | **Production: yes** | Local dev may omit it (defaults to `127.0.0.1:11434`) — that default does not work in production; see the callout below |
| `OLLAMA_MODEL` | Recommended | Defaults to `llama3.2` if unset |
| `SUPABASE_JWKS_URL` | No | Confirmed unused anywhere in `web/` as of this audit — do not set it under the assumption it wires something up |

### The Ollama production requirement (read this before going live)

`web/lib/ai/ollama.ts` defaults `OLLAMA_BASE_URL` to `127.0.0.1:11434` when
unset — a convenience for local dev, where Ollama runs natively alongside
`next dev` on the same machine (see CLAUDE.md § AORMS AI). **On Hostinger
there is no Ollama process on the same host.** If `OLLAMA_BASE_URL` is left
unset in production, every "Ask ESTI" request (`web/lib/actions/ai.ts`,
the header AI panel) will attempt to reach `127.0.0.1:11434` on the
Hostinger container itself, get a connection refused, and fail — silently
from the end user's point of view unless the UI's own error handling is
checked. Before going live, either:

- Point `OLLAMA_BASE_URL` at a separately hosted/self-hosted Ollama
  instance reachable from Hostinger over HTTPS, or
- Explicitly decide "Ask ESTI" ships disabled/degraded for the first
  production release and document that as a known limitation, rather than
  discovering it live.

Either is a legitimate choice; leaving it unset without deciding is the
failure mode to avoid.

## Supabase projects (two, deliberately separate)

| Project | Ref | Role |
| --- | --- | --- |
| `aorms-web` | `fyedovpqjwbslrughwdv` (`ap-south-1`) | Main app data — clients, projects, invoices, everything under `web/supabase/migrations/` |
| `aorms-platform` | `qbgbnhthchhbammzeebg` | Portable identity/licensing — `AORMS-U-`/`AORMS-C-` accounts, studios/companies, memberships, usage-hour tracking. See `docs/esti/AORMS-IDENTITY.md` |

Both are live cloud projects already (no local Supabase stack exists as of
2026-09-08 — see CLAUDE.md § Dev/verify loop). Point the env vars above at
these same two projects for production; there is no separate "production"
Supabase project to provision — the cloud projects already used in dev
*are* production for this app (Supabase's own environment separation, if
wanted later, would be a distinct future decision, not assumed here).

## Build & start

Hostinger Node.js app hosting runs an install step, a build step, then a
start command. Point the app's **Root directory** at `web/` — this is a
monorepo (pnpm workspace) and `web/` is one package in it, not the repo
root.

**Do not leave Install/Build/Start commands on auto-detect.** Set them
explicitly:

| Setting | Value |
| --- | --- |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Start command | `npm run start` |

These map straight to `web/package.json`'s own scripts (`next build
--webpack` / `next start` — see `next.config.ts`'s comment for why
`--webpack`, not Turbopack).

**Known incident (2026-09-08, recurred 2026-09-09):** with Root directory
set to `web` but Install command left on auto-detect, the build failed at
the install step with:

```text
Error: Cannot find module '.../corepack/v1/pnpm/12.3.4/bin/pnpm.cjs'
    ...
code: 'MODULE_NOT_FOUND'
```

The root `package.json` pins `"packageManager": "pnpm@9.7.0"` (this repo's
normal pnpm-workspace tooling), which triggers Node's Corepack to fetch
pnpm at install time; Corepack's shim was broken/incomplete on Hostinger's
build agent. `web/package-lock.json` was added (2026-09-08,
[`1b918bb9`](https://github.com/HolagundiWorks/aorms/commit/1b918bb9)) —
confirmed npm-installable standalone (`web`'s dependencies are all plain
semver ranges, no `workspace:` protocol, no dependency on
`packages/contracts` or anything else in the monorepo) — specifically so
Hostinger could detect npm instead of pnpm/corepack for this deploy
target. **That lockfile alone was not sufficient**: even with Root
directory correctly set to `web` and the npm lockfile present there, the
platform's auto-detection still chose pnpm/corepack on a later redeploy —
most likely because it clones the full monorepo and its detection scans
from the repository root (finds `pnpm-lock.yaml` +
`"packageManager": "pnpm@9.7.0"` there) rather than confining detection to
the configured subdirectory. Re-verified 2026-09-09: a clean `npm ci`
against `web/package.json` + `web/package-lock.json` in an isolated
directory passes the package.json/lockfile sync check (the check `npm ci`
runs before attempting any download) — the lockfile itself is not stale,
so the fix is the explicit command override above, not another lockfile
regeneration. **Auto-detection cannot be trusted for this app while
Hostinger's scan reaches the repo root; setting Install/Build/Start
commands explicitly is the actual fix, not optional polish.**

`web/package.json` declares `"engines": {"node": ">=20.9.0"}` (Next.js's
own minimum) — confirm Hostinger's Node runtime selection matches or
exceeds this. Observed on a real Hostinger build agent: Node.js v22.18.0,
which satisfies it. Local dev has been on Node 24; nothing in the codebase
is known to require newer than 20.9.

## Health check

`GET /api/health` returns `{"status":"ok","timestamp":"..."}` with a 200 —
added for Hostinger's uptime monitoring (2026-09-09). Deliberately a pure
liveness check (is the Node process serving requests), not a readiness
check against Supabase/Ollama — see the route's own comment for why that
distinction matters.

## Security headers

`next.config.ts`'s `headers()` sets baseline headers (X-Frame-Options,
X-Content-Type-Options, Referrer-Policy, Strict-Transport-Security,
Permissions-Policy) on every response as of 2026-09-09. **No
Content-Security-Policy yet** — deliberately deferred rather than shipped
untested; see that file's own comment for the reasoning. Add one as a
follow-up, verified page-by-page in the browser across all six route
groups before shipping it, not assumed correct from reading the code.

## robots.txt

`app/robots.ts` disallows every authenticated route (the office hub, all
three external portals, the platform identity app) and allows the public
marketing surface. Written host-agnostically (no hardcoded domain) since
`web/` may first serve from a Hostinger-assigned or staging hostname before
any DNS cutover to aorms.in.

## Known gaps / explicitly not done in this pass

- **No CSP.** See Security headers above.
- **No readiness/dependency health check** — only liveness. Add one if
  Hostinger's monitoring ever needs to distinguish "process is up" from
  "Supabase is reachable."
- **`output: "standalone"` not set** in `next.config.ts`. That option
  trims the build output for a self-contained Docker image — Hostinger's
  documented flow here is a plain `GitHub → Hostinger → Next.js` deploy,
  not a container `web/` builds itself, so it wasn't added speculatively.
  Revisit if Hostinger's actual app-hosting mechanism turns out to expect
  a standalone build (their docs/support should confirm this at deploy
  time — not yet checked against this specific product).
- **`JOBS_GATEWAY_URL`/`JOBS_GATEWAY_TOKEN`** assume the Phase 6
  `gateway/` service (fronting the Python `worker`'s Redis Streams job
  bus) is deployed somewhere reachable from Hostinger. That service's own
  deployment is out of scope for this doc — confirm it's live before
  relying on DXF/PDF/reconciliation job features in production.
- **This doc itself is unverified against a real Hostinger deploy** — see
  the note at the top. Update it with anything that turns out different
  once a real deploy happens.
