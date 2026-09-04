# AORMS System Architecture

**Status:** Canonical · **Owner:** Human Centric Works (HCW) · **Reviewed:** 2026-09-04

> **Scope:** AORMS is a **web-only, cloud-based office management system** — a
> single unified SPA (the **AORMS Office Hub**), no desktop apps, no per-app
> installers. Platform north-star: [AORMS-OFFICE-SYSTEM.md](AORMS-OFFICE-SYSTEM.md).
> Naming: [`../../CLAUDE.md`](../../CLAUDE.md) § Product naming.

## System Shape

```text
Marketing + office hub SPA + firm portals (Carbon Design System)
       |
       | tRPC / hub APIs
       v
Fastify/TypeScript backend ---- PostgreSQL (system of record)
       |        |
       |        +---- MinIO/S3 (published artifacts)
       |
       +---- Redis Streams ---- Python worker (DXF, PDF, imports)
```

The TypeScript backend owns domain rules, authorization, state transitions,
money/tax, numbering, audit, and activity. The Python worker owns no
authoritative business state.

The same authority boundary applies to the AORMS cognition engine:
deterministic TypeScript read models calculate office health and interventions,
Python may later recognise anomalies or predictions, and LLMs only explain
structured machine output. See COGNITION-ENGINE (if present).

## Repository

One monorepo (pnpm workspaces).

- `packages/contracts`: shared Zod schemas, permissions, money, tax, labels, and
  the PURE estimation engine (`.aormsest` `EstimateFile` + `recostEstimate`, BBS).
  Browser-safe — the seam every surface imports.
- `backend`: Fastify, tRPC, Drizzle, PostgreSQL domain modules and REST routes.
- `frontend`: React/Vite SPA on IBM Carbon Design System — the office hub, and
  the public marketing/landing pages.
- `worker`: Redis consumer for DXF, PDF, and reconciliation processing.
- `docs/esti`: canonical product and engineering documentation.

> **Web-only (2026-09).** No desktop apps, no Tauri shell, no local-first
> architecture, no per-app installers. The `desktop/` directory (legacy Tauri
> and WinUI packaging scaffolding from the pre-pivot suite era) has been
> deleted — it was never part of the shipped product.

### Access Topology

Estimation is accessed **inside a project** of the office hub — same session,
nav, permissions, and Carbon shell — not a subdomain. Legacy per-surface
subdomains (`studio.aorms.in`, `consultancy.aorms.in`, `proc.aorms.in`) redirect
to the office hub login. Host / surface map: [AORMS-SURFACE-URLS](AORMS-SURFACE-URLS.md).

## Architecture Decisions

### Single Firm, Explicit Scope

One installation represents one firm. Portal records are scoped to the firm's
projects; there is no tenant column. A future hosted multi-tenant product would
require a separate architecture decision and migration.

### Hybrid TypeScript And Python

TypeScript is authoritative. Python is used where its document/data libraries
are stronger. Jobs use versioned JSON payloads, request IDs, idempotency keys,
retry/backoff, dead-letter handling, and resource limits.

### Authorization

Authentication uses Argon2id passwords and secure cookie sessions. Internal
roles use capability checks from `packages/contracts/src/permissions.ts`.
Client, consultant, and contractor portal procedures enforce row-level scope.
See [ACCESS-HIERARCHY](ACCESS-HIERARCHY.md) for the L1–L5 ladder and four enforcement layers.

Email is the login handle and has one canonical form: **trim + lowercase**
(`normalizeEmail`, `backend/src/lib/email.ts`). Every account-creating path
(`users.createStaff`, `consultants.createLogin`, `clients.createPortalUser`,
`auth.register`/`bootstrap`, the owner seed) normalizes before insert, and every
lookup/uniqueness check compares case-insensitively via `emailMatches`
(`lower(email) = <normalized>` — not `ilike`, so `_`/`%` in an address are never
treated as wildcards). This keeps a hand-created login from being un-loginnable
or silently duplicated by case, and still matches legacy rows stored mixed-case.

The same policy applies to tRPC, REST upload/download routes, worker artifact
access, exports, and search. "Authenticated" alone is never sufficient for an
operational write.

### Audit And Activity

- Audit is append-only and records actor, action, entity, before/after, timestamp.
- Activity is append-only, project/object scoped, visibility-filtered, and used
  by timelines and the Activity Center.
- Significant writes create audit/activity in the same database transaction as
  the domain mutation.
- State machines centrally reject illegal transitions.

### Data And Retention

PostgreSQL is authoritative. Object binaries are content-addressed and treated
as immutable; versions create new objects. User-facing deletion archives by
default. Financial, issued-document, approval, and audit retention rules
prevent casual cascade deletion. Owner purge requires reauthentication,
explicit scope, audit, and backup/export safeguards.

### Money, Tax, And Numbering

Money is integer paise. Shared code owns Indian formatting and GST/TDS
calculation. Numbering is concurrency-safe and per financial year. Rules are in
[INDIA-PROFILE](INDIA-PROFILE.md).

### One Design System — IBM Carbon

The frontend is migrating to `@carbon/react` (IBM Carbon Design System) as the
only design system — no competing second system, no bespoke UI/UX. MUI and the
legacy `@hcw/ui-kit` coexist only during the migration (Waves 1–5) and are
removed entirely in Wave 6. See [CARBON-MIGRATION](CARBON-MIGRATION.md).

### Contextual Collaboration

Communication is attached to domain objects through activity and comments. AORMS
does not implement an unrelated general chat service. Portal writes create
normal domain records and pass the same authorization, state, audit, and
notification rules as internal writes.

### AI Boundary

AI providers are accessed through a backend gateway. Retrieval is permission
filtered; prompts and outputs are auditable; secrets stay server-side; sensitive
data transmission is explicit; output remains a draft until a human issues it.
ESTI (the built-in AI agent) answers only from validated firm repositories.

## Operational Requirements

- Versioned Drizzle migrations applied at boot.
- Rate and body-size limits, content sniffing, Origin/CSRF protection.
- Request IDs across SPA, backend, Redis jobs, worker, and logs.
- `/health` for liveness and `/readyz` for DB/Redis/object-store readiness.
- Cursor pagination and server-enforced caps.
- Production secrets, TLS, and authenticated artifact delivery.
- PostgreSQL/object-store backups with tested restoration.
- CI: typecheck, lint, unit tests, API integration tests, worker tests, frontend
  build and browser smoke tests.

## Delivery status

Engineering delivery through the pre-pivot phase history is complete; the
2026-09-04 web-only pivot removed the allied-app suite architecture described
in earlier revisions of this document. Open product gaps are tracked in
[ROADMAP-LOCAL.md](ROADMAP-LOCAL.md) (engineering) and
[ROADMAP-CLOUD.md](ROADMAP-CLOUD.md) (what's live). This document describes
the stack and ADRs — not the live backlog.
