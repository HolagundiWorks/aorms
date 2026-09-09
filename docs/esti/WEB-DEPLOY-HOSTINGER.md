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
--webpack` / `next start` — see `next.config.mjs`'s comment for why
`--webpack`, not Turbopack).

**Known incident, two layered bugs (2026-09-08 → 2026-09-09), both now
fixed — read this if the install or build step ever fails again on this
app, before re-diagnosing from scratch.**

**Bug 1 — auto-detect chose pnpm/corepack over npm (install step).** With
Root directory set to `web` but Install/Build/Start left on auto-detect,
the build failed at the install step:

```text
Error: Cannot find module '.../corepack/v1/pnpm/12.3.4/bin/pnpm.cjs'
    ...
code: 'MODULE_NOT_FOUND'
```

The root `package.json` pins `"packageManager": "pnpm@9.7.0"` (this repo's
normal pnpm-workspace tooling), which triggers Node's Corepack to fetch
pnpm at install time; Corepack's shim was broken/incomplete on Hostinger's
build agent. `web/package-lock.json` was added
([`1b918bb9`](https://github.com/HolagundiWorks/aorms/commit/1b918bb9),
2026-09-08) specifically so Hostinger would detect npm instead. That alone
didn't stop the recurrence — most likely because Hostinger clones the
full monorepo and its package-manager auto-detection scans from the
**repository root** (finds `pnpm-lock.yaml` + the `packageManager` pin
there), not the configured subdirectory. Fixed by setting Install/Build/
Start commands **explicitly** (the table above) rather than trusting
auto-detection at all.

**Bug 2 — the npm lockfile itself was broken (build step), found only
after Bug 1's fix let the install step "succeed" too easily.** With
Install command forced to `npm ci`, the install step logged `added 14
packages` — implausibly low for a Next.js + Carbon app — and the build
step then failed with:

```text
Error: Cannot find module '.../web/node_modules/next/dist/bin/next'
code: 'MODULE_NOT_FOUND'
```

Root cause: `1b918bb9`'s lockfile was generated via `npm install
--package-lock-only` while `web/node_modules` still held live pnpm
symlinks (this repo's normal local-dev state — see CLAUDE.md § Dev/verify
loop). npm recorded every dependency as it found it locally: a `"link":
true` pointer to a **relative path** like
`../node_modules/.pnpm/next@16.3.4.../node_modules/next` — i.e. "this is
a symlink to a sibling directory" — instead of a real npm-registry
resolution with a tarball URL and integrity hash. That relative path
only resolves inside this exact pnpm-managed monorepo checkout; on
Hostinger's isolated `web/` deploy it points at nothing, so `npm ci`
created 14 dead symlinks and captured **zero transitive dependencies**
(no `next/dist/bin/next`, no `@next/swc-*`, nothing) — silently, with no
error at install time, only surfacing once the build step tried to run
the (nonexistent) binary.

Fixed 2026-09-09 by regenerating `web/package-lock.json` from complete
isolation: copied only `web/package.json` (no `node_modules`, no
reachable pnpm store) into a scratch directory and ran a genuine `npm
install` there, forcing npm to resolve every package — direct and
transitive — from the real npm registry. Verified before replacing the
committed lockfile: the regenerated file has zero `"link": true` entries
across 152 package entries; a clean `npm ci` from it in a separate
isolated directory produces a real, non-empty `next/dist/bin/next`
(confirmed running, `next --version` → `16.3.4`); and a full `next build
--webpack` plus `tsc --noEmit`, run against the real `web/` app source
copied alongside that freshly-installed `node_modules`, both pass clean
with **zero errors** — confirming the slightly newer semver-compatible
versions npm resolved (e.g. `@carbon/react` 1.116.0 vs. the 1.115.0
pnpm has pinned for local dev, `react` 19.2.8 vs. 19.2.7 — both caret
ranges in `package.json` unchanged, npm simply resolved "latest
matching" at generation time) don't break anything. Confirmed the local,
pnpm-managed `web/node_modules` used for day-to-day dev was untouched by
this — only the committed `package-lock.json` file changed; pnpm ignores
a sibling `package-lock.json` in a workspace member.

**Lesson for next time:** an npm lockfile generated with `--package-lock-
only` (or any invocation) inside a directory whose `node_modules` is
pnpm-managed cannot be trusted, even if `npm ci` "succeeds" — it may
silently capture local symlinks instead of real resolutions, with the
failure only surfacing at the *build* step, several minutes and a whole
install-step "success" later. Always regenerate this repo's npm lockfiles
in a directory with no local `node_modules` and no reachable pnpm store,
and verify the result actually contains resolved packages (check for
`"link": true` entries, and confirm a real binary like `next/dist/bin/
next` exists after a fresh `npm ci`) before committing it — don't trust
the install step's exit code alone.

**Bug 3 — `next.config.ts` couldn't load on Hostinger's build host (build
step), only reachable once Bug 2 was also fixed.** With a genuine install
succeeding (`added 110 packages`), the build step got further before
failing on something new:

```text
▲ Next.js 16.3.4 (webpack)
  Using cached swc package @next/swc-wasm-nodejs...
⚠ Attempted to load @next/swc-linux-x64-gnu, but an error occurred: /lib64/libm.so.6: version `GLIBC_2.29' not found
⚠ Attempted to load @next/swc-linux-x64-musl, but it was not installed
⨯ Failed to load next.config.ts
Error: Cannot find module '.../web/<hash>.next.config' imported from '.../web/next.config.compiled.js'
```

Root cause: `@next/swc`'s prebuilt native binary needs a newer glibc
(`GLIBC_2.29`) than Hostinger's build host has — an OS-level constraint of
their shared hosting image, not fixable from this repo. The musl variant
isn't installed because npm correctly detected the host uses glibc (just
an old version), not musl — it wouldn't have helped anyway. Next falls
back to a WASM SWC build for ordinary app-file compilation (that's what
the `Using cached swc package @next/swc-wasm-nodejs` line confirms
succeeding), but that fallback doesn't cover **loading the config file
itself** when it's TypeScript — `next.config.ts` needs its own SWC
transform before Next can `import()` it, and on this host that transform
silently failed to produce its output file.

Fixed 2026-09-09 by removing the need for any config-file transformation:
renamed `web/next.config.ts` → **`web/next.config.mjs`** (plain ESM
JavaScript — dropped the `import type { NextConfig }` and `: NextConfig`
annotation; everything else was already valid JS). A `.mjs` file is
`import()`-able by Node directly, no native or WASM SWC involved at all,
so this class of failure can't recur regardless of the build host's
glibc version. Verified: `tsc --noEmit` and `eslint .` clean, a full
`next build --webpack` clean across all 90+ routes with `✓ Running
next.config.mjs took 16ms` in the log, and — since config changes need a
dev-server restart to take effect — live-verified after restarting that
`headers()` still applies: `fetch('/dashboard')` shows `x-frame-options:
DENY` and the HSTS header exactly as before the rename. Every doc
reference to `next.config.ts` in this file was updated to `.mjs`
accordingly.

**Summary — three Hostinger deploy-blocking bugs, one per layer, each
only surfacing once the previous one was fixed:** auto-detect choosing
pnpm/corepack over npm (install step), a broken symlink-only lockfile
that let `npm ci` "succeed" while installing nothing real (also install
step, but a different failure mode), and a glibc-incompatible native SWC
binary breaking TypeScript config-file loading specifically (build step).
If a fourth ever surfaces, add it here in the same format — this section
is meant to be the standing incident log for this deploy target, not a
one-time note.

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

`next.config.mjs`'s `headers()` sets baseline headers (X-Frame-Options,
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
- **`output: "standalone"` not set** in `next.config.mjs`. That option
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
