# Phase 2 repo audit — Core ERP (orgs, users, roles, clients, projects, tasks)

**Status:** Draft audit, not yet reviewed against a Phase 2 implementation  
**Date:** 2026-09-04  
**Scope:** Per [NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md) § 36–37 and
[ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md)'s Phase 2 definition — maps the current
tRPC/Fastify/Drizzle implementation of the Core ERP domains onto the target
Next.js + Supabase stack. Later phases (Commercial, Technical, Reporting,
Advanced processing, AI) get their own audit pass when their turn comes —
this one only covers what Phase 2 needs.

---

## ⚠️ Critical finding — the current schema is single-tenant per deployment

Before any Phase 2 table design: **the current Postgres schema has no
organization/tenant column anywhere.** `esti_firm` and `esti_orgsettings` are
both explicitly single-row tables (one firm's data per deployed database
instance) — confirmed by reading `backend/src/db/schema/org-auth.ts` directly,
not inferred. `esti_client`, `esti_projectoffice`, `esti_task`, and every
other table have no `org_id`/`tenant_id` foreign key. This matches
`CLAUDE.md`'s existing note ("Single firm, single tenant — no tenant column")
but is worth restating here because it directly contradicts the migration
spec's own §16 Authentication example (`organization_members` join table) and
§18 User Hierarchy (`Organization` as the root entity) — both written for a
conventional multi-tenant Supabase SaaS shape.

**This has to be decided before Phase 2 schema work starts, not during it:**

1. **Keep single-tenant-per-deployment** (matches the current product: each
   firm gets its own Supabase project, or its own schema/database). Simpler
   migration — table shapes barely change, RLS policies can mostly just
   check `auth.uid()` against role, no org-scoping needed anywhere. Matches
   how the product actually ships today (per-firm VPS installs).
2. **Adopt true multi-tenancy** (one Supabase project serves many firms, RLS
   policies scope every query by `org_id`). Matches the migration spec's
   generic guidance and would be needed if AORMS becomes a shared multi-firm
   SaaS product rather than one-deployment-per-firm — but that's a product
   decision, not just a technical one, and isn't the product's current shape.

There's a hint of a **third, existing model** worth knowing about: a
separate "licensing platform" schema (`backend/src/db/schema/licensing-platform.ts`,
`backend/src/licensing-platform/`) already handles multi-firm concepts
(`hlp_account`, portable `AORMS-U-`/`AORMS-C-` identity handles, a
`workspaceType` enum) as a *distinct* central service that each single-tenant
firm install talks to for activation/licensing — not the office-hub database
itself. If real multi-tenancy is ever wanted, that existing split (one
central identity/licensing service + many single-tenant firm databases) may
be closer to workable than bolting `org_id` onto every ERP table. **Nobody
has decided this yet — flag it before writing Phase 2 Supabase migrations.**
Everything below assumes option 1 (single-tenant) since that's what today's
product actually is; if option 2 is chosen instead, every table mapping
below needs an added `org_id` column and RLS policy.

---

## Auth & sessions

| | Current | Target |
| --- | --- | --- |
| Identity store | `esti_user` (`backend/src/db/schema/org-auth.ts`) — email, `passwordHash`, `totpSecret`, `role` enum, `disabled`, portal-scoping FKs (`clientId`/`consultantId`/`contractorId`) | `auth.users` (Supabase) for credentials; keep `esti_user`-equivalent as a `profiles` table (or similar) holding `role`, portal-scoping FKs, `disabled`, etc. — per spec §16, app profile data stays separate from the auth record |
| Sessions | `esti_session` — opaque token, `tokenHash`, cookie name `esti_session` (`backend/src/auth/session.ts`) | Supabase Auth session (JWT via `@supabase/ssr` cookies) — already wired in `web/lib/supabase/{client,server,middleware}.ts` from Phase 1. **This table goes away entirely once auth moves.** |
| Login | `auth.login` (email/password, TOTP second factor, rate-limited, unified-accounts/delegated-identity fallback to a central platform — `backend/src/modules/auth/router.ts`) | `supabase.auth.signInWithPassword()` — already implemented in `web/lib/actions/auth.ts`. **TOTP/MFA needs Supabase's MFA API** (not yet touched — current TOTP implementation is fully custom, no direct Supabase equivalent wired up). |
| Registration | `auth.bootstrap` (first-run only, creates firm + owner in one shot) | Supabase `signUp()` + a Server Action that also creates the `profiles` row and `esti_firm`-equivalent row |
| Password reset | `auth.requestPasswordReset` / `resetPassword` (self-hosted token + expiry columns on `esti_user`) | Supabase's built-in `resetPasswordForEmail()` / update-password flow — removes the need for `passwordResetToken`/`passwordResetExpires` columns entirely |
| Delegated/unified identity | `verifyPlatformLogin()` / `verifyAtPlatform()` — opt-in delegation to the central licensing platform for single-sign-on across a person's multiple firm installs | Out of scope for Phase 2; revisit once the licensing-platform multi-tenant question above is settled |
| Authorization | Custom tRPC middleware tiers (`publicProcedure` → `authedProcedure` → `protectedProcedure` → `capabilityProcedure(cap)` / `ownerProcedure`, plus `clientProcedure`/`collaboratorProcedure`/`contractorProcedure` for portals) in `backend/src/trpc/trpc.ts`, backed by `can(role, capability)` in `packages/contracts/src/permissions.ts` (fixed `StaffRole` enum + rank + capability allow-lists, no DB-driven permissions) | Two layers per spec §17: (1) a Next.js-side check — a `requireCapability()` helper wrapping Server Actions/Route Handlers, straight port of `can()`/`StaffRole` (the role model itself doesn't need to change, just where it's enforced); (2) **Supabase RLS policies mirroring the same rules at the database level** — this is net-new work, the current system has zero DB-level enforcement (a Fastify bug bypassing tRPC would currently have unrestricted table access) |

**Frontend:** `frontend/src/lib/auth.ts` (`useAuth()` hook, `trpc.auth.me` query) → replaced by Supabase's client-side session hooks / `useUser()`-style pattern; `LandingAuth.tsx`/`AuthPage.tsx` (this session's earlier work) already assume this shape and don't need rework, just backend wiring.

---

## Organization / firm settings

| | Current | Target |
| --- | --- | --- |
| Firm profile | `esti_firm` (single row) — company name, GSTIN, PAN, address, `firmType` | Supabase table, still single-row **if** option 1 (single-tenant) is chosen; becomes one row per org **if** option 2 |
| Org settings | `esti_orgsettings` (single row) — feature toggles, `plan`, `licenceStatus`, AI settings, storage quota, escalation/numbering config | Same shape question as above; this table is dense with unrelated concerns (licensing, AI config, module toggles) — worth splitting when it's actually migrated rather than porting as one wide table |
| Partners | `esti_partner` — partnership-firm partner list (DIN, PAN, etc.) | Straightforward table port |
| tRPC | `firm.get` / `firm.update` / `firm.{add,update,remove,list}Partner` (`backend/src/modules/firm/router.ts`), gated `firm:admin` | Server Actions, same capability check |

**Frontend:** `frontend/src/routes/{Company.tsx→redirects,Settings.tsx→redirects}`; live settings UI is `frontend/src/routes/Users.tsx` region + firm profile forms — needs a fresh Carbon-only Next.js page, not a port (current pages are MUI).

---

## Clients

| | Current | Target |
| --- | --- | --- |
| Table | `esti_client` (`org-auth.ts`) — `publicId`, `name`, `kind` enum (INDIVIDUAL/COMPANY/ARCHITECT_FIRM), GSTIN/PAN, contact fields, `disabled` | Direct port, add `org_id` only if option 2 |
| tRPC | `clients.{list,byId,create,setDisabled,createPortalUser}` (`backend/src/modules/clientlog/router.ts` — note the confusing module directory name, the namespace is `clients` not `clientlog`) | `list`/`byId` → Server Components (direct Supabase query); `create`/`setDisabled` → Server Actions; `createPortalUser` → Route Handler (creates a Supabase Auth user scoped to this client, mirrors current `role: CLIENT` + `clientId` FK pattern) |
| Related | `esti_clientlog` (interaction history, separate `clientLog` tRPC namespace) — same migration shape as `esti_client` | |

**Frontend:** `frontend/src/routes/Clients.tsx` ⚠️ — flagged in `CLAUDE.md` as having ongoing parallel WIP, avoid touching the *current* file; the Next.js Phase 2 version is new code in `web/app/(app)/clients/`, not a port of this file.

---

## Projects

| | Current | Target |
| --- | --- | --- |
| Table | `esti_projectoffice` (`project.ts`) — the project root record; `esti_phase` — project phases | Direct port; this is the largest table by relationship fan-out (nearly every other domain FKs into it — proposals, invoices, tasks, decisions, drawings, etc.), so Phase 2 should land `projectOffices` before anything that references it |
| tRPC | `projectOffice.{list,byId,create,update,remove,restore,purge,activate,activationStatus,updateStatus,updateSite,exportData,logs,addLog,listArchived}` (`backend/src/modules/projectoffice/router.ts`) | `list`/`byId`/`listArchived` → Server Components; mutations → Server Actions; `exportData` → Route Handler (file download, needs a real HTTP response) |
| Phases | Separate `phases` tRPC namespace, own CRUD | Same pattern, direct port |

**Frontend:** `frontend/src/routes/{Projects.tsx ⚠️, ProjectDetail.tsx, ArchivedProjects.tsx}`. `Projects.tsx` has the same parallel-WIP flag as `Clients.tsx`. `ProjectDetail.tsx` is large (hosts Estimation/Delivery/Tenders/Moodboard tabs) — Phase 2 only needs the base project record + phases; the tabbed sub-features belong to later phases (Estimation → Phase 4, Delivery → Phase 4, Tenders → not yet scoped, Moodboard → not yet scoped).

---

## Tasks

| | Current | Target |
| --- | --- | --- |
| Table | `esti_task` (`hr-work.ts`) — title/description, `projectId` FK, `assigneeId`/`reviewerId` FKs to `teamMembers` (not `users` directly — see below), `dependsOnId` self-FK, ASPRF fields (`classification`, `workType`, `difficultyCoefficient`, `estimatedHours`), computed `priorityScore`/`confidenceScore` | Direct port. Note the `assigneeId`/`reviewerId` → `teamMembers` indirection (not straight to `users`) — `teamMembers` is a separate HR-domain table (roster) not audited here since Phase 2 scope is "orgs, users, roles, clients, projects, tasks", not full HR; **decide whether Phase 2 also needs a minimal `teamMembers`-equivalent, or whether tasks temporarily FK straight to `profiles` until HR lands** |
| Business logic | `computeScores` (priority scoring), `flagInterventions` (dependency-stall detection), `todayQueue` — all live server-side logic in `backend/src/modules/task/router.ts`, not simple CRUD | Per spec §13, extract into `services/tasks/` — these three are exactly the kind of business logic that shouldn't live directly in a Server Action |
| tRPC | `task.{list,listByProject,create,update,remove,computeScores,flagInterventions,todayQueue}` | `list`/`listByProject`/`todayQueue` → Server Components; `create`/`update`/`remove` → Server Actions; `computeScores`/`flagInterventions` are `protectedProcedure.mutation`s today (confirmed — no cron/interval call in `backend/src/index.ts`), i.e. user- or frontend-triggered, not server-scheduled — port as Server Actions too, same as the CRUD ones |

**Frontend:** `frontend/src/routes/Work.tsx` (`/tasks`; "Tasks pillar") + `frontend/src/components/work/*`.

---

## Shared/cross-cutting pieces Phase 2 will need early

- **Money formatting** (`formatINR`/`formatINRShort`, integer-paise convention) — pure functions, port as-is into `web/lib/`.
- **Email normalization** (`normalizeEmail`/`emailMatches`, `backend/src/lib/email.ts`) — still needed if `profiles.email` is queried case-insensitively; Supabase Auth itself already lowercases emails on `auth.users`, so this may only matter for the `profiles` mirror table.
- **Audit log** (`esti_audit`, append-only, written via `writeAudit()` helper) — every mutation across every domain calls this; port the table and a `writeAudit()`-equivalent helper before porting any single domain's mutations, or audit coverage silently regresses domain by domain.
- **Numbering sequences** (`esti_sequence`, gap-free per-scope-per-FY counters) — not needed for Phase 2's domains directly (used by invoices/proposals, Phase 3), but the table has no natural owner in the "orgs/users/clients/projects/tasks" grouping — decide which phase owns porting it.

---

## Suggested Phase 2 landing order

Given the FK fan-out above, roughly:
1. **Decide single-tenant vs multi-tenant** (blocks everything else)
2. `profiles` (mirrors `esti_user`) + Supabase Auth wiring — builds on Phase 1
3. `esti_audit`-equivalent + `writeAudit()` helper (everything else depends on this existing first)
4. `esti_firm`/`esti_orgsettings`-equivalent
5. `clients`
6. `projectOffices` + `phases`
7. `tasks` (depends on projects; decide the `teamMembers` question first)

---

## What this audit deliberately did not cover

Per the Phase 2 scope, these are out of scope here and get their own pass
when their phase comes up: Proposals/Invoices/Payments (Phase 3), Estimation/
BOQ/Measurements/Drawings (Phase 4), Reports/Dashboards (Phase 5), PDF/DWG
worker (Phase 6), AI/ESTI (Phase 7). Also out of scope: the ~70 other tRPC
namespaces in the module map (`CLAUDE.md` § Module map) that don't belong to
any of Auth/Users/Clients/Projects/Tasks/Firm.
