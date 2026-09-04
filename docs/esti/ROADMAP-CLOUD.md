# AORMS Cloud Roadmap (aorms.in / production)

**Status:** ACTIVE — soft launch (landing + blog live)  
**Updated:** 2026-09-04  
**Scope:** What ships to the **production VPS** (`aorms.in`) and when — deployment
status, feature rollout to the live office hub, and cloud infrastructure. For
codebase work happening in local dev before it ships here, see
[ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md).

---

## Current phase — soft launch

Per [`../../CLAUDE.md`](../../CLAUDE.md) § Launch status and
[PRODUCTION-OPS.md](./PRODUCTION-OPS.md) § Soft launch:

| Surface | Status |
| --- | --- |
| `/` · `/blog` (landing pages) | ✅ **Live** |
| `/login`, `/access`, `/signup`, `/account` (office hub SPA) | 🔲 Coming soon (`VITE_MARKETING_ONLY` gate) |
| `/downloads` | ✅ Redirects to `/login` (web-only, no installers) |
| `/wiki*` | ✅ Redirects home (no wiki surfaces) |

**Gate:** `VITE_MARKETING_ONLY` (default **true** on public builds) —
`frontend/src/lib/marketing-gate.ts`.

**Next milestone — S8:** reopen apex `/login` for real sign-in and firm-portal
demos, once firm-portal tabs are honest (see PRODUCTION-OPS.md § S8).

**Codebase-side prerequisite: verified met (2026-09-04).** The "honest tabs"
requirement is fully implemented — `visibleFirmPortalSections()`
(`frontend/src/components/portal/FirmPortalSections.ts`) hides any firm-portal
chrome tab whose `panels` key isn't wired, and all four portals (Client,
Contractor, Collaborator, Site) pass a `panels` object matching their
documented capability list (no Alert stubs, no unwired tabs). This was already
covered by `visibleFirmPortalSections.test.ts`; the marketing-gate switch
itself (`isMarketingOnly()` / `isMarketingAuthPath()`, the exact toggle S8
flips) previously had **no** test coverage — added in
`frontend/src/lib/marketing-gate.test.ts` (20 cases: default-on behavior,
every truthy/falsy env value, and the gated-path matcher). Both suites pass;
`tsc` is unchanged at its 16 pre-existing, unrelated JSX errors.

What remains for S8 is **ops only**, not code: flip `VITE_MARKETING_ONLY=false`
on the VPS per PRODUCTION-OPS.md § S8 (`s8-reopen-demos.sh` / the
`s8-reopen-demos.yml` GitHub Action) — this session has no VPS/deploy
credentials, so that step is left to an operator.

---

## CI / build health 🚧

**Discovered 2026-09-04: `main` HEAD's CI has been fully broken at the first
step.** `esti-ci`'s `TypeScript`, `Dependency audit`, and `Visual regression`
jobs all run `pnpm install` before anything else, and on `main` (confirmed at
commit `0dfb3ac`) that step **fails outright** — `ERR_PNPM_OUTDATED_LOCKFILE`
— which skips every downstream step (typecheck, lint, test, build, audit) in
those three jobs. Only the `Python worker` job (a separate install path) was
green. This means **no PR or push to `main` has produced a real green check**
since the drift was introduced — CI was reporting failure, but for a reason
that had nothing to do with the actual change being pushed.

**Root cause:** `frontend/package.json` had drifted from what
`pnpm-lock.yaml` actually resolves — `@carbon/react` was missing from
`package.json` entirely (despite being imported and already resolved in the
lockfile), and `react-router-dom` was declared as plain `^7.18.1` while the
root workspace's `pnpm.overrides` (a deliberate security fix, PR #61)
force-aliases it to `npm:react-router@8.3.0`.

**Fixed, not yet on `main`:** corrected on `claude/fix-lockfile-drift-7315`,
merged into the `cloud-agent` branch. `pnpm install --frozen-lockfile` now
succeeds cleanly across all 6 workspace projects with **zero** lockfile
changes needed. Verified on CI itself, not just locally — re-running
`esti-ci` on the fixed commit shows `pnpm install` succeeding in all three
previously-blocked jobs.

**Still red on `cloud-agent`, now for real (pre-existing) reasons — each
job now fails on its own merits instead of on a shared install failure:**

| Job | Failing step | Cause |
| --- | --- | --- |
| `TypeScript` | `pnpm typecheck` | 16 pre-existing JSX errors in `Landing.tsx` / `DashboardTab.tsx` (unrelated to this pivot — see ROADMAP-LOCAL.md Phase 1) |
| `Visual regression` | `Build · serve · assert` | Downstream of the same `tsc` failure — `vite build` runs `tsc` first |
| `Dependency audit` | `pnpm audit --audit-level=high` | **12 high-severity findings** (0 critical, 6 moderate below the gate) across 629 resolved deps — see below |
| `Python worker` | — | ✅ Green (ruff + pytest both pass) |

**`pnpm audit --audit-level=high` findings (2026-09-04):**

| Package | Path | Issue |
| --- | --- | --- |
| `pdfjs-dist` | direct dep, pinned `6.1.200` (`frontend/package.json`) | Arbitrary JS execution on opening a malicious PDF — worth prioritizing: this app is PDF-heavy (invoices, proposals, drawings) and the version is exact-pinned, so bumping is a deliberate choice, not automatic |
| `fast-uri` | transitive, via `fastify` / `fast-json-stringify` in `backend` | 4 distinct advisories (host confusion via IDN/percent-encoding, SSRF via IPv6/hostname decoding) — the root `pnpm.overrides` already pins `fast-uri` (`^3.1.5`) and `fast-json-stringify>fast-uri` (`^4.1.2`) for an *earlier* round of the same package; these are newer advisories the current pin doesn't cover — the override version needs bumping, not re-adding |
| `browserslist` | transitive, via `eslint-plugin-react-hooks` → `@babel/core` (dev-only path) | Unbounded memory growth + a crash/prototype-write vector via untrusted stats — build-tooling only, not shipped to users, lower urgency |
| `nanoid` | transitive, via `vite` → `postcss` | Custom generators can loop indefinitely at size 0 — build-tooling only |

Not fixed in this pass — flagging with specifics so the next session doesn't
have to re-run `pnpm audit --audit-level=high --json` to find out what's
actually failing. `pdfjs-dist` and the `fast-uri` override bump are the two
worth doing first; `browserslist`/`nanoid` are dev-only exposure.

**Action:** merge `cloud-agent` into `main` to at least restore CI's ability
to *run* — right now every push is fighting an install failure that has
nothing to do with the change being reviewed. The typecheck and audit
findings are then real, addressable red — not blocked from even being seen.

---

## Cloud infrastructure ✅

| Component | Status |
| --- | --- |
| Docker Compose (prod) — `compose.prod.yaml` | ✅ Live |
| VPS deployment scripts — `deploy/*.sh` (bootstrap, install-landing, update-landing, verify-vps) | ✅ Live |
| PostgreSQL (system of record) | ✅ Live |
| Redis Streams + Python worker (DXF, PDF, reconcile) | ✅ Live |
| MinIO/S3 (published artifacts) | ✅ Live |
| SSL/TLS + nginx reverse proxy | ✅ Live |
| No cloud Ollama by default — ESTI AI runs through the backend gateway, not a sized-for-inference box | ✅ (see PRODUCTION-OPS.md § ESTI AI) |
| CI (`esti-ci` — TypeScript, lint, test, build, audit, visual regression, Python worker) | 🚧 Install step fixed (on `cloud-agent`, not yet `main`); typecheck + audit still red — see § CI / build health |

Deploy references: [VPS-INSTALL.md](./VPS-INSTALL.md) ·
[PRODUCTION-OPS.md](./PRODUCTION-OPS.md) · [`../../deploy/README.md`](../../deploy/README.md).

---

## Office hub feature rollout (cloud-facing)

Status reflects what a signed-in user reaches on `aorms.in` once S8 reopens
`/login` — not local-dev code completeness (see ROADMAP-LOCAL.md for that).

### Clients & Projects
- Client CRM (interactions, leads, tenders)
- Project tracking (phases, tasks, milestones)
- Project moodboards + mood asset management

### Proposals & Contracts
- Unified proposals (COA fee + scope agreements)
- Version control + client approval gates
- Digital signatures (future: DocuSign integration)

### Invoicing & Finance
- GST-compliant invoicing
- Reconciliation (bank, 26AS, AIS, GSTR via Python worker)
- Cash book + expense tracking
- Financial reports + filing abstracts (GST/TDS)

### Delivery & Supervision
- BBS (bar bending schedules) — IS 456 cutting lengths
- Steel reconciliation (scheduled vs issued vs consumed kg)
- Running bills (project RA bills with advances/deductions)
- Site supervision (snags, inspections, progress reports)

### Team & HR
- Team roster + assignments
- Leaves + payroll management
- ASPRF composite scoring (reliability, quality, impact, collaboration, learning, wellbeing)
- Attendance + time attribution

### Knowledge Bank
- Specification catalog (materials, finishes, makes)
- Compliance library (NBC, FAR, setbacks, fire, regulatory)
- Design standards by discipline + attached files
- Master plan file library (PDF/DWG)
- Lessons learned + NC/CAPA tracking

### ESTI AI Agent 🚧
- Built-in office automation, via the backend AI gateway (not desktop-only — see PRODUCTION-OPS.md § ESTI AI)
- Task recommendations + priority
- Project health insights
- Document generation (proposals, invoices, specs)
- Email draft automation
- Reminder creation

### EOMS Knowledge API 🔲
- External knowledge store integration
- Search + filtering
- Trending + recommendations
- Connected to office hub

---

## Q4 2026 milestones (cloud)

| Week | Milestone | Status |
|------|-----------|--------|
| **This week** | Landing + blog soft launch stays green; legacy docs archived | ✅ |
| **This week** | Restore CI's ability to run (`pnpm install` fix merged to `main`) | 🚧 fixed on `cloud-agent`, not yet on `main` |
| **This week** | Clear `pnpm typecheck` red (16 JSX errors) and `pnpm audit --audit-level=high` findings | 🔲 |
| **S8** | Reopen apex `/login` — real sign-in + firm-portal demos | 🔲 (codebase prerequisite met — ops-only step remains) |
| **EOQ** | Office hub v2.0 live on Carbon Design System · SSO + ESTI AI ready | 🔲 |

Engineering work that gates these milestones (codebase cleanup, Carbon
migration waves) is tracked in [ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md) —
this file tracks only what's actually live for users.

---

## Q1 2027+ roadmap (cloud)

### Q1 2027
- ESTI AI agent fully live on the office hub
- EOMS knowledge bank live
- SSO + federated identity
- Office hub fully responsive on mobile

### Q2 2027+
- Advanced BI dashboards + reporting
- Integrations (Tally, QuickBooks, DocuSign, etc.)
- Multi-language support (Hindi + regional)
- Mobile app (if needed; web-responsive stays primary)
- Performance optimizations + caching

---

## Support & questions

- **Deployment / VPS?** See [VPS-INSTALL.md](./VPS-INSTALL.md) · [PRODUCTION-OPS.md](./PRODUCTION-OPS.md)
- **Product definition?** See [AORMS-OFFICE-SYSTEM.md](./AORMS-OFFICE-SYSTEM.md)
- **Engineering / local-dev status?** See [ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md)
- **Market fit / GTM?** See [MARKET-FIT.md](./MARKET-FIT.md)

---

**Last updated:** 2026-09-04  
**Companion doc:** [ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md)
