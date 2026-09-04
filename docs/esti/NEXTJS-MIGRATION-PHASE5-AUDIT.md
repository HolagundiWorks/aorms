# Phase 5 repo audit — Reporting (dashboards, reports, exports, analytics)

**Status:** Draft audit, not yet reviewed against a Phase 5 implementation
**Date:** 2026-09-04
**Scope:** Per [NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md) § 36–37
and [ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md)'s Phase 5 definition — maps the
office dashboard, GST/TDS filing reports, the audit-log viewer, workload
views, and ASPRF performance scoring onto the target Next.js + Supabase
stack. Same audit shape as Phases 2–4; Phase 6 (Advanced processing) and
Phase 7 (AI) get their own pass when their turn comes.

---

## Scope map — five real domains behind "dashboards, reports, exports, analytics"

1. **Dashboard** (`dashboard` namespace, `backend/src/modules/dashboard/`) — the
   office home view (`StudioAbstract.tsx`'s Overview tab): a `home` bundle of
   ~10 parallel read models (summary, boards, action center, financial health,
   project health, client/team/revision/technical "intelligence", recent
   activity), plus per-user dashboard layout persistence and a small set of
   demo-only bulk interventions. This is the "dashboards" word in the roadmap
   line.
2. **Reports** (`reports` namespace) — GST abstract, TDS abstract, invoice
   register export. Three read-only aggregations over Phase 3's `invoices`
   table. This is "reports" and "exports".
3. **Audit log viewer** (`audit` namespace) — paginated, filterable, searchable
   view over the audit trail (`AuditLog.tsx`, owner-only). Distinct from the
   `write_audit()`/`audit_log` table itself (already live from Phase 2) — this
   domain is the **read UI** over that table, not the table.
4. **Workload** (`workload` namespace) — team capacity views (day/month) plus
   an unauthenticated iCal subscription feed (Google/Apple Calendar). Not
   named in the roadmap line, but it's a reporting/analytics view over task
   data with no home in any other phase — including it here.
5. **ASPRF / Performance** (`asprf` namespace, `Performance.tsx`) — the rolling
   30-day composite performance score (Reliability/Quality/Client
   Impact/Collaboration/Learning/Wellbeing weights, per `CLAUDE.md` § Domain
   conventions). Also not named in the roadmap line, also has no other home —
   it is pure analytics over tasks/attendance/decisions data.

**Excluded, with a citation for each:**

- **`admin.usageReports`** — despite the name, this lives entirely under
  `backend/src/licensing-platform/`, the separate central multi-firm
  licensing service the [Phase 2 audit](./NEXTJS-MIGRATION-PHASE2-AUDIT.md)
  already decided is out of scope for the single-tenant-per-deployment model
  (it isn't the office-hub database this migration is porting). Not this
  phase's concern at all.
- **`rewards`** (reward-point events, owner-only grant) — schema-adjacent to
  ASPRF (`packages/contracts/src/asprf.ts` defines both) but is a Team/HR
  feature (points/recognition), not a reporting view. Not audited here;
  belongs with whichever phase picks up Team/HR if one hasn't already.
- **`search`** (global search) — cross-cutting over nearly every entity in the
  system, not specific to reporting/analytics, and carries its own
  infrastructure decision (Postgres full-text search vs. `pg_trgm` vs. an
  external index) that deserves its own audit pass rather than being folded
  in here as an afterthought.

---

## Finding — dashboard financial data has a real RLS gap to decide on, not silently port

`dashboard.home`/`dashboard.financialHealth` runs on bare `protectedProcedure`
(any authenticated staff member, including `VIEWER`) and its `getFinancialHealth()`
read model (`backend/src/modules/dashboard/readModels/financial.ts`) aggregates
office-wide revenue pipeline, ready-to-bill value, and outstanding receivables
straight from `esti_projectoffice`/`esti_phase`/`esti_invoice` via raw SQL. This
sits next to the *opposite* decision Phase 3 made deliberately and documented in
code: `invoices.listAll`/`byId` were tightened off `protectedProcedure` onto
`invoice:manage` specifically because "a VIEWER could pull firm-wide revenue,
GST, TDS." The dashboard's aggregate view reaches the same data through a side
door. **This is a real design gap in the current system, not a migration
question to solve unilaterally** — flag it to whoever implements this phase
(and ideally the product owner) rather than either (a) silently porting the gap
forward into RLS, which keeps a known inconsistency, or (b) silently tightening
it, which is a behavior change nobody asked for. Recommend surfacing the choice
explicitly during implementation: either gate `financialHealth`'s RLS policy at
`is_partner_or_above()` (closing the gap, matches Phase 3's stated intent) or
document the aggregate-vs-line-item distinction as an intentional exception (an
aggregate KPI leaking a total is a different exposure than raw invoice rows,
and might be judged acceptable) — but make the call on purpose.

---

## Dashboard

| | Current | Target |
| --- | --- | --- |
| Read models | 10 independent async functions under `dashboard/readModels/` (`summary`, `boards`, `actionCenter`, `financial`, `projectHealth`, `clientIntelligence`, `teamIntelligence`, `revisionIntelligence`, `technicalIntelligence`, plus `me`/`home` composing the rest), each a self-contained SQL aggregation, run in parallel via `Promise.all` for the `home` bundle | Each read model → either a Supabase query in a Server Component, or (given ~10 parallel aggregations per page load) a single Postgres function/view returning a composed JSON object, called once via `.rpc()` — the current `Promise.all` fan-out is the kind of N-roundtrip pattern worth collapsing into one call in the new stack rather than porting literally, per spec §12/§13's "don't duplicate business logic between Server Actions and Route Handlers" spirit (this is the same logic either way, just a chance to reduce round trips) |
| Module toggles | `getOrgSettings()` gates whether `financialHealth`/`projectHealth` even run (`financialEnabled`/`projectEnabled` flags on the single-row org settings, ported in Phase 2 as part of `firm`/`orgsettings`) | Read the same flags from `public.firm` (Phase 2's schema folded `esti_orgsettings`' dense config onto/near `firm` — confirm exact column placement when implementing, the Phase 2 audit flagged `esti_orgsettings` as "worth splitting when it's actually migrated rather than porting as one wide table") |
| "Cognition" engine | `backend/src/modules/cognition/engine.ts` — `priorityScore()`, `buildOfficeEvents()`, `buildBehaviorProfiles()`, `buildReasoningFrame()`, `ingestCognitionEvents()`, `loadCognitionQueue()`, `loadBehaviorProfiles()`. **Despite the name, this is deterministic rule-based scoring, not an LLM call** — no model API, no prompt, just weighted heuristics over event/task data feeding the dashboard sidebar's "AI recommendation" (per `CLAUDE.md`'s description of the Overview tab). The actual ESTI AI (LLM-backed, desktop-only per `CLAUDE.md` § AORMS AI) is unrelated and belongs to Phase 7 | Include in this phase, not Phase 7 — it's KPI/insight computation over the office's own data, matching this phase's other "intelligence" read models exactly in kind. `priorityScore()`/`buildOfficeEvents()`/`buildBehaviorProfiles()`/`buildReasoningFrame()` look pure (not confirmed line-by-line here) — if so, port to `web/lib/services/dashboard.ts` alongside the read models, same pattern as every prior phase's business-logic sections |
| Per-user layout | `users.dashboardLayout` (jsonb column on the user record, not a separate table), read/written by the signed-in user only | `profiles` gains a `dashboard_layout jsonb` column (Phase 2's `profiles` table didn't include this — an addition, not a straight port); RLS: `id = auth.uid()` only, same as the rest of `profiles` |
| `applyIntervention` | Demo/system-admin-only bulk data-massaging mutations (mark overdue tasks done, clear stale approvals, etc.) gated on `ctx.user.isDemo \|\| ctx.user.isSystemAdmin` — **explicitly not a production feature**, it exists to make demo workspaces look healthy on demand | Decide whether this ships at all in the target stack — `isDemo`/`isSystemAdmin` are current-system user flags with no obvious Supabase-project equivalent yet (Phase 2's `profiles` table has no such columns). Recommend **not porting this in Phase 5** unless a specific demo/staging Supabase project is planned that needs it; note it here rather than silently dropping it so the decision is visible |

**Frontend:** `frontend/src/routes/StudioAbstract.tsx` — the app's root route
(`/`). Per `CLAUDE.md`, its Overview tab merges Studio + Summary and carries
the AI-recommendation sidebar (which is the cognition engine's output, not an
LLM call, per the finding above). New Carbon-only page in
`web/app/(app)/dashboard/` (Phase 1 already created a placeholder
`dashboard/page.tsx` — this phase fills it in for real), not a port of the MUI
route file.

---

## Reports (GST/TDS abstracts, invoice register export)

| | Current | Target |
| --- | --- | --- |
| Procedures | `reports.{gstAbstract,tdsAbstract,invoiceRegisterExport}` (`backend/src/modules/reports/router.ts`), all `reports:view`-gated (L2+, same rank as `invoice:manage`/`fees:manage`) | Straightforward Server Components (or Route Handlers for the export, since it returns rows meant for a file download) doing period-bucketed SQL aggregation directly against `public.invoices` — no business logic beyond SQL `GROUP BY`/`SUM`, nothing to extract into a services layer here beyond the period-range helper below |
| Shared logic | `periodRangeFromInput()`/`invoicePeriodDate` (`backend/src/lib/periodFilter.ts`, referenced but not opened in this audit) — turns a `PeriodFilterInput` (current FY, custom range, etc.) into concrete `from`/`to` dates; `formatINR()` — already noted portable as-is by the Phase 2 audit | Port `periodRangeFromInput()` alongside `formatINR()`/`financialYearRange()` in `web/lib/`; re-check its actual implementation before porting (not opened here) |
| RLS | `is_partner_or_above()` — same helper Phase 3 introduces for Proposals/Invoices, reused a third time here | No new policy needed if Phase 3's helper is already in place |

**Frontend:** `frontend/src/routes/Filing.tsx` (Finance › Financial Reports).
New Carbon-only page.

---

## Audit log viewer

| | Current | Target |
| --- | --- | --- |
| Procedure | `audit.list` — paginated (`page`/`pageSize`), filterable (`entity`/`action`), searchable (`ilike` across entity/action/actor name/email), joins `audit` → `users` for actor display name. `ownerProcedure`-gated (rank 100 — **owner only**, not partner) | Server Component with query params driving `.range()`/`.ilike()` on `public.audit_log` (Phase 2) joined to `public.profiles`. RLS: Phase 2's existing `audit_log: staff read` policy is `is_office_staff()` — **broader than this router's owner-only gate**. Same kind of inconsistency as the dashboard finding above, but smaller: decide whether the *viewer UI* additionally restricts to owner in the Server Component/page-level check (matching current behavior, RLS stays permissive as "any staff could query it directly" defense-in-depth) or whether the RLS policy itself should tighten to owner-only to match. Recommend the former (page-level gate, RLS stays broad) since `write_audit()`'s existing `staff read` policy was presumably a deliberate Phase 2 choice, not an oversight — but flag it, don't silently pick one |
| Note | `CLAUDE.md`'s route table says `AuditLog.tsx` is `firm:admin` gated, but the router itself uses `ownerProcedure` — `firm:admin` and owner-rank are likely the same tier in practice (`firm:admin` is capability rank 100, matching `ownerProcedure`), but confirm the two gates actually coincide before assuming the doc and the code agree by coincidence | Use whichever gate the implementer confirms is authoritative — the code, since docs drift (as this audit itself has found drift between `CLAUDE.md` and the live router table more than once) |

**Frontend:** `frontend/src/routes/AuditLog.tsx`. New Carbon-only page.

---

## Workload (capacity views + calendar feed)

| | Current | Target |
| --- | --- | --- |
| `day`/`month` | Team capacity read models — task load per person per day/month, `protectedProcedure` | Server Components, `is_office_staff()` RLS |
| `calendarSubscription`/`regenerateCalendarToken` | Issues a **secret, rotatable, per-user token** (`ensureCalendarFeedToken`/`rotateCalendarFeedToken`, `backend/src/lib/workloadCalendar.ts`) embedded in an unauthenticated URL path (`/calendar/workload/{token}.ics`), scoped `mine` or `office` (office scope requires Partner+). This is capability-and-role logic living in a **tRPC query**, separate from the feed itself | Server Action (mutating the token) + Server Component (displaying the current subscription URL); the role/scope check (`OWNER`/`PARTNER`/`SENIOR` for office scope) reuses `current_app_role()` |
| The feed itself | **Not tRPC** — `registerCalendarFeed(app)` (`backend/src/modules/calendar/feed.ts`, `backend/src/index.ts:294`) is a raw Fastify route serving `.ics` text, authenticated only by the token in the URL path (no session cookie — this endpoint is meant to be pasted into Google/Apple Calendar as a subscription URL, which can't carry cookies) | **Route Handler**, public (no Supabase session check) — auth is entirely "does this token exist and match a user" via a Supabase query keyed on the token column. This is the one endpoint in the whole system so far designed to be unauthenticated-by-session on purpose; don't accidentally wrap it in the same `redirect("/login")` guard every other `(app)` route gets — it needs to live outside that route group (e.g. `app/calendar/workload/[token]/route.ts`, not under `(app)/`) |
| Token rotation | `regenerateCalendarToken` invalidates the old URL — old subscriptions silently stop resolving after rotation, which is correct/expected iCal-client behavior (a calendar app just gets 404s on its next poll) | Port as-is; no special handling needed for "in-flight" old URLs |

**Frontend:** no dedicated `Workload.tsx` route found in `CLAUDE.md`'s route
table — likely a component/tab, not a standalone page (same "confirm rather
than assume" caveat the Phase 4 audit noted for Transmittals/Spec
sheets/Drawings).

---

## ASPRF / Performance

| | Current | Target |
| --- | --- | --- |
| Composite score | `computeAspRfScore()` orchestrating six weighted KPI functions — `computeReliabilityKpi` (30%), `computeQualityKpi` (25%), `computeClientImpactKpi` (15%), `computeCollaborationKpi` (15%), `computeLearningKpi` (10%), `computeWellbeingKpi` (5%, opt-in only) — plus `performanceBand()` (score → label/tag) and `buildAspRfKpiScores()` assembling the whole payload. All in `packages/contracts/src/asprf.ts`, all pure functions, weights matching `CLAUDE.md` § ASPRF performance weights exactly | Same pattern as every phase so far: port verbatim into `web/lib/services/asprf.ts`. This phase's `teamScores`/`myScore` Server Components become thin — fetch the raw signals (tasks, attendance, decisions data — the "rolling 30-day" window implies a date-bounded Supabase query per person) and hand them to the already-correct pure functions |
| Wellbeing opt-in | `setWellbeingOptIn` mutation — a per-user flag gating whether `computeWellbeingKpi` contributes to that person's own score (opt-in only, per `CLAUDE.md`) | Needs a `profiles.wellbeing_opt_in boolean` column (another Phase 2 `profiles` addition, alongside `dashboard_layout` from the Dashboard section above) — bundle both column additions into one migration when this phase starts, rather than two separate ALTER TABLEs |
| Access | `teamScores` (protectedProcedure — any staff can view team-wide scores) vs. `myScore` (protectedProcedure, but implicitly self-scoped by `ctx.user.id`) | RLS: `myScore`'s Supabase query just filters `WHERE assignee_id = auth.uid()`, no special policy needed beyond `is_office_staff()` read access to the underlying tasks/attendance tables (already granted from Phase 2). `teamScores` needs those same tables' `is_office_staff()` read policy, nothing narrower — matches current permissiveness |

**Frontend:** `frontend/src/routes/Performance.tsx`. New Carbon-only page.

---

## Suggested Phase 5 landing order

1. **Decide the two RLS-gap questions** flagged above (dashboard financial
   data, audit-log viewer's owner-vs-staff gate) — both are pre-existing
   product inconsistencies this audit surfaced, not new problems the
   migration creates, but the migration is where they'd otherwise get ported
   forward silently. Decide on purpose.
2. **`profiles` migration addition**: `dashboard_layout jsonb`,
   `wellbeing_opt_in boolean` — small, unblocks both Dashboard and ASPRF.
3. **Reports** (GST/TDS/export) — smallest domain, pure SQL aggregation, no
   open questions, depends only on Phase 3's `invoices` (already live).
   Good first slice to prove the period-range helper port.
4. **ASPRF** — next smallest, all business logic already pure and portable,
   depends on Phase 2's `tasks`/`profiles` (attendance isn't audited/ported
   yet in any phase so far — confirm whether ASPRF's reliability KPI actually
   needs an `attendance` table this migration hasn't scoped anywhere; flag
   before implementing if so, per the pattern of flagging rather than
   guessing).
5. **Audit log viewer** — depends only on Phase 2's `audit_log`/`profiles`,
   independent of everything else in this phase.
6. **Workload** — capacity views depend on Phase 2's `tasks`; the calendar
   feed's Route Handler is a self-contained side quest that can land any time
   after the token-table schema exists.
7. **Dashboard** — lands last: its `home` bundle composes nearly everything
   above (financial health needs Phase 3's invoices/project data; project
   health needs Phase 2's projects/phases; the "intelligence" read models
   likely touch clients, decisions, revisions — none individually audited
   here, worth a closer read per read-model before implementing each one).

---

## What this audit deliberately did not cover

- **Each individual "intelligence" read model's actual query** (`boards`,
  `actionCenter`, `clientIntelligence`, `teamIntelligence`,
  `revisionIntelligence`, `technicalIntelligence`, `summary`) — only `financial`
  was opened in depth (to chase the RLS-gap finding). Re-read each before
  implementing its Server Component — some may depend on tables no phase has
  audited yet (e.g. `esti_decision` for revision intelligence, not covered by
  any phase so far).
- ~~Whether an `attendance` table exists/is planned anywhere~~ — **resolved
  by the [Phase 8 audit](./NEXTJS-MIGRATION-PHASE8-AUDIT.md)**: `esti_attendance`
  exists, owned by the `attendance` namespace, covered there under HR/Payroll.
- **`periodFilter.ts`'s actual implementation** (`periodRangeFromInput`,
  `invoicePeriodDate`) — referenced, not opened.
- **`cognition/engine.ts`'s functions confirmed pure** — asserted from their
  signatures and the absence of any LLM/HTTP call in a quick read, not
  verified line-by-line the way Phase 3/4's business logic was.
- `rewards`, `search`, `admin.usageReports` — explicitly excluded above, with
  citations, not audited.
- Advanced processing (PDF/DWG worker internals as their own phase) and AI —
  Phases 6–7, own audit pass when their turn comes.
