# Platforms audit — Identity · ConnectDeX · SysDeX (2026-10-01)

Scope: the three `app/(platform)/*` portals of `web/` (Identity, ConnectDeX,
SysDeX/HelpDeX) as of `main` after PR #88. Method: read the canonical docs
(`AORMS-PLATFORM-ARCHITECTURE.md`, `SYSDEX-PORTAL-AUDIT-2026-09-14.md`,
`ROADMAP.md`) and the code (`app/(platform)`, `lib/platform`, `lib/actions`,
`proxy.ts`, `platform/supabase/migrations` 0001–0040, `.github/workflows`).
Not done: no live sign-in (no credentials here), so behaviour below is from
code and docs, not click-through. Items marked **(unverified)** need a live check.

## 1. What is implemented

| Area | Implemented (evidence) |
| --- | --- |
| Routing / separation | Subdomain routing (`proxy.ts`, `lib/platform/subdomains.ts`); three portal headers (`PortalHeaders.tsx`); shared cookie `sb-platform-auth-token` on `.aorms.in`; three identity tables (`accounts` AORMS-U-, `company_accounts` AORMS-CU-, `platform_staff`) with mutual exclusion by trigger; `connectdex` Postgres schema split (0025) |
| **Identity** | Signup/login/reset, profile + professional profile + resume, photo upload, certificates, Studio memberships, Studio profile/board/contacts, licence page, Pro-seat assignment, ownership transfer, ₹199 one-time identity verification after 100 usage-hours, heartbeat usage tracking |
| **Licensing / payments** | Razorpay orders + webhook (HMAC verified, 4xx on bad signature, dedup table 0031), client-side fast-path confirm, licence write gated to admin at the DB level (0011), Pro ₹1,999 / Enterprise ₹14,999 plans, Enterprise `subdomain_slug` reservation |
| **ConnectDeX** | Gated company onboarding (apply → admin review → ₹ fee → active), company profile/board/contacts, product catalogue with specs + test results, tiers BASE_LINE/PRO/PRO_PLUS (admin-set), Base Line 5-category cap, cross-company Materials directory with nearest-first ranking, company-invite flow (found already built 2026-09-30) |
| **SysDeX** | Dashboard counts, Users (accounts + company accounts, level override, password reset), Studios, Companies, Licences (manual override), Payments, Pricing, ConnectDeX review queue, AI Connectors (tenant DB / WhatsApp / Drive connectors, 0034–0039), Logs (`platform_activity_log`, written by DB triggers), HelpDeX tickets; two staff roles (SUPER_ADMIN / SUPPORT_STAFF) enforced at page + action layer |
| Security | Turnstile CAPTCHA + in-memory rate limit on auth actions, safe-error wrapper, RLS on every table, repeated `public execute` grant-gap fixes (0037–0040), security headers, `PENDING` role guard on Identity→Hub sign-in |
| UI/UX | Sheet system, black chrome, Instructions toggle and WCAG pass apply to all three (portal-parity work, merged) |

## 2. What is not implemented (explicit gaps in code/docs)

1. **ConnectDeX Pro / Pro Plus differentiators have zero schema** — interactive catalogue, SKU-level detail, direct PO generation, lead generation (architecture doc). Tiers are labels with one enforced rule (5 categories).
2. **Companies have no licence or price**; no self-serve tier upgrade or payment for tiers.
3. **No outbound HelpDeX replies** — staff triage status/notes only; the submitter is never emailed.
4. **No recurring billing** — licences are one-time annual orders; no renewal reminder, no expiry notification, no dunning.
5. **`<slug>.aorms.in` Enterprise subdomains** are reserved in the DB but do not resolve.
6. **Admin writes are not audit-logged from the app layer** — `platform_activity_log` is filled by DB triggers on specific tables (0012…); manual licence override, tier changes, role/level changes, password-reset requests are only logged where a trigger exists **(unverified per action)**. No "who did this" for every staff action.
7. **No staff MFA.** SUPER_ADMIN sign-in is password only.
8. **No Portal-level activity log** for a Studio/Company (only SysDeX sees logs).
9. **No tests for `web/` at all** (no `*.test.*`, no `test` script) and **CI (`ci.yml`) builds the retired backend/frontend, not `web/`** — nothing automated gates the product that is live on aorms.in.
10. **No error monitoring / structured logging** (no Sentry/OTel in `package.json`).
11. **Razorpay live test-mode payment never run end-to-end** (roadmap open item, blocked on keys).
12. Companies cannot be members of multiple "Studios-style" teams with roles beyond what 0024 models; Studio↔Company interaction is limited to the Materials directory (no RFQ/enquiry channel).

## 3. Risks found (ordered)

| # | Risk | Where | Why it matters |
| --- | --- | --- | --- |
| R1 | CI does not build/typecheck/lint `web/` | `.github/workflows/ci.yml` | A broken `main` deploys straight to production (Hostinger builds from `main`); today only manual builds catch it |
| R2 | In-memory rate limiter | `lib/security/rate-limit.ts` | Resets on redeploy, per-instance; weak against distributed brute force. Acceptable for one instance, not once scaled |
| R3 | Staff session cookie scoped to `.aorms.in`, no MFA | `lib/platform/client.ts` | A script injection on any subdomain exposes a SUPER_ADMIN session; mitigated by CSP/HttpOnly **(unverified)**, but MFA would cap the blast radius |
| R4 | SUPPORT_STAFF restriction only at page/action layer | architecture doc | Direct API reads of licences/payments possible (disclosed); RLS-level split is the durable fix |
| R5 | Materials search: `ilike '%q%'` with unescaped `%`/`_`, no limit, whole catalogue sorted in JS | `materials/page.tsx` | Unbounded payload as catalogue grows; wildcard injection (not SQL injection, but surprising results) |
| R6 | Admin lists hard-capped at 200 with no paging/search server-side | `admin/accounts`, `logs`, `payments` | Rows beyond 200 are invisible to staff; the new client-side table toolbar only filters what was fetched |
| R7 | `lib/actions/platform.ts` is 1,183 lines / 26 actions in one file | `lib/actions/platform.ts` | Hard to review for auth-check consistency; split by domain |
| R8 | Many sequential service-role round-trips per page (account → membership → studio) | `materials`, `identity`, `studios/[id]` | Latency; some can be one joined query or a view |
| R9 | `public execute` grant gaps recurred in 4 migrations (0037, 0038, 0039, 0040) | migrations | The pattern keeps coming back with each new function; needs a default-privileges fix, not per-function patches |

## 4. Recommendations

### P0 — protect production (small, high value)
- **Add a `web` CI job**: `npm ci`, `tsc --noEmit`, `eslint`, `next build` with dummy env (the exact recipe used manually here), required status check on `main`. Retire or isolate the legacy backend/frontend jobs.
- **Staff MFA**: Supabase TOTP (AAL2) required for `platform_staff`; gate `/admin/*` on `aal2`.
- **Audit every staff write**: one `logStaffAction(actor, action, target, before, after)` helper called by all `admin*` actions; surface it on SysDeX Logs with actor.
- **Default-privileges migration** (`alter default privileges … revoke execute on functions from public`) so grant gaps stop recurring (R9).

### P1 — correctness and scale
- **Server-side pagination + search** for SysDeX lists (keyset on `created_at,id`, `?page`/`?q`), keep `TableToolbar` for the current page only; label it so staff aren't misled (R6).
- **Materials**: `pg_trgm` GIN index on `products.name`, escape `%`/`_`, `limit 24` + "load more", rank in SQL (city/state tiers via `order by case …`) (R5).
- **Shared rate-limit store** (Upstash/Redis or a Postgres table with `ON CONFLICT` counters) before running >1 instance (R2).
- **Split `platform.ts`** into `studios.ts`, `licences.ts`, `accounts.ts`, `admin.ts`; add a lint rule/test that every exported action calls a gate (R7).
- **Collapse waterfalls**: a `my_studio_context()` SQL function or view returning account + first studio in one call (R8).
- **Error monitoring** (Sentry) and request-id logging on Server Actions and the Razorpay webhook (failed webhook = unpaid licence activation, currently silent).

### P2 — product enhancements
- **Licence lifecycle**: expiry/renewal emails at T-30/T-7/T-0, grace state, in-portal "renew" CTA; later Razorpay Subscriptions for true recurrence.
- **HelpDeX replies** through the existing Hostinger SMTP (already configured on `aorms-platform`): send reply, thread, status emails, SLA timers, canned responses.
- **ConnectDeX value ladder**: build one differentiator at a time — start with *lead capture* (Studio "Request quote" on a product → company inbox + email), then SKU variants, then PO generation into the Hub's `purchase_orders`. Price tiers only after the first ships.
- **Studio↔Company link**: save vendors, attach a catalogue product to a Hub project spec sheet (`spec-catalog`), closing the loop between Directory and Office Hub.
- **Identity portability**: a verified-profile public page (`/u/AORMS-U-…`) and shareable CV export (PDF via the existing worker render path); skills/endorsements fed by Hub project participation.
- **Studio/Company activity log** in-portal (own entity only) for owners.
- **Enterprise subdomains**: wildcard DNS + `portalFromHost` extension so `<slug>.aorms.in` resolves to the Hub with the Studio preselected.
- **SysDeX analytics**: MRR/ARR, plan mix, churn, onboarding funnel (apply → approved → paid → active), ticket aging — reuse `BigStat` + the dataviz palette.
- **Impersonation (read-only, logged)** for support to reproduce issues without passwords.

### P3 — optimisation
- Cache stable reads (`plan_pricing`, product categories) with `unstable_cache` + tag revalidation on admin writes; keep per-user pages dynamic.
- `select` only needed columns on directory pages; add composite indexes for `(company_id, category)` and `(studio_id, status)` after checking `get_advisors` (performance) on the live project.
- Move heavy admin aggregates to SQL views/materialised views refreshed on write instead of fetching rows to count in JS.
- Bundle: the platform pages import the Hub's Carbon tree; confirm per-route client JS with `next build` output and lazy-load Razorpay/Turnstile scripts only on the pages that need them **(unverified)**.

## 5. Suggested order of work
1. Web CI job + required check (½ day) → 2. staff MFA + audited staff actions (1–2 days) → 3. default-privileges migration (½ day) → 4. SysDeX server pagination + Materials index/limit (1–2 days) → 5. error monitoring + webhook alerting (½ day) → 6. licence-expiry emails + HelpDeX replies (2–3 days) → 7. first ConnectDeX differentiator (lead capture).

## 6. Corrections to existing docs found during this audit
- `ROADMAP.md` Open Items still carries the ConnectDeX invite-acceptance item as unfixed in one place (line ~7470) while the 2026-09-30 entry says it is mostly built — reconcile.
- `AORMS-PLATFORM-ARCHITECTURE.md` still lists the old `aorms-web` project ref in its first table (stale; live ref is `aenacjqhmjlppmwodpar` per CLAUDE.md).
