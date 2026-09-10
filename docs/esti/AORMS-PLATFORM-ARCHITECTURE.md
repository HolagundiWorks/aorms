# AORMS Platform — architecture, nomenclature, and the Admin/Portal boundary

Canonical reference for **what runs where** across `web/`'s two separate
systems, written 2026-09-09 once a genuine site-wide admin back office
(`/admin/*`) landed alongside the existing self-service pages and the
distinction needed to be made explicit rather than left to accumulate
inconsistently. Read this before adding any new page under
`app/(platform)/*` — it exists specifically so "where does this feature
go" has one answer instead of being re-decided ad hoc each time.

## The two systems — do not conflate them

| | **AORMS Office Hub** | **AORMS Platform** |
| --- | --- | --- |
| Route group | `app/(app)/*` | `app/(platform)/*` |
| Supabase project | `aorms-web` (`fyedovpqjwbslrughwdv`) | `aorms-platform` (`qbgbnhthchhbammzeebg`) |
| What it is | **The product.** Office management for one architecture practice — clients, projects, tasks, invoices, estimates, BBS, HR, ESTI AI. This is "AORMS" as a prospect or user experiences it. | **The substrate underneath it.** Portable personal identity (`AORMS-U-` handles), the two business-entity types (Studios, Companies), memberships, usage-hour tracking, and — as of this date — licensing and payments. Not a product a user "uses" for its own sake; it's what a person's AORMS-U- identity, a Studio's licence, and a Company's supplier profile actually live in. |
| Tenancy | Single-tenant per deployment (one firm, per CLAUDE.md § Conventions — "Tenancy decided: single-tenant per deployment, no org_id") | Multi-tenant by design — one platform database can (eventually) sit underneath many separate Office Hub deployments, each a different firm |
| Auth | Its own Supabase Auth session (`sb-*` cookie) | A **separate** Supabase Auth session (`sb-platform-auth-token` cookie — see `lib/platform/client.ts`'s own header comment for why the name had to be explicit) |
| Nav shell | `AppShell.tsx` — full `SideNav`, the product's real navigation | `(platform)/layout.tsx` — a thin header bar only, deliberately not linked from the Office Hub's own nav at all (reached only by direct URL) |

**"AORMS Office Hub" is the Hub.** That name is already established (see
`CLAUDE.md` § Product naming: "AORMS Office Hub — Web-only SPA"). The
Platform is not a second "hub" — avoid the word for anything under
`(platform)/*` to prevent exactly the naming confusion this doc exists to
resolve. Where the Platform needs a name for its own signed-in landing
page, call it **the Identity page** (`/identity`) — never "the hub."

A person links their Office Hub login to a Platform identity once
(`linkPlatformIdentity`, storing an `AORMS-U-` handle on `profiles.
platform_public_id`) — this is a **link, not a merge**: two separate
sessions, two separate databases, joined by one stored handle. Losing
sight of this is the single most common source of "why does X need to
check two different clients" in this codebase's Platform-touching code —
see `lib/platform/account.ts`'s `getCurrentPlatformAccount()` for the
canonical two-step resolution every Platform-touching Server Action/page
needs.

## Three portals (2026-09-10)

The boundary rules below (Admin / Portal / Directory) haven't changed —
this section is a **branding layer on top of them**, not a replacement.
Before this date every `(platform)/*` page shared one undifferentiated
header, and the Admin back office had no name of its own. Three explicit,
audience-scoped portals now exist, matching how ESTI and ConnectDeX
Partners are already named sub-brands elsewhere in this codebase:

| Portal | Audience | Subdomain | Pages | Header component |
| --- | --- | --- | --- | --- |
| **Identity Portal** | Architects & Studios | `identity.aorms.in` | `/identity`, `/studios/[studioId]`, `/licences` | `IdentityPortalHeader` |
| **ConnectDeX Portal** | Material/interior suppliers (Companies) | `connectdex.aorms.in` | `/connectdex`, `/connectdex-apply`, `/companies/[companyId]`, `/materials` | `ConnectDexPortalHeader` |
| **SysDeX** | Platform staff (`accounts.is_admin`) | `sysdex.aorms.in` | every `/admin/*` page | `SysDexPortalHeader` |

**Subdomains (2026-09-10)** — each portal's canonical URL is now its own
subdomain, not a path prefix on the main domain. This is routing-level
separation within the existing single Next.js deployment, not a genuine
multi-app split: `web/proxy.ts` reads the incoming `Host` header and
redirects to the owning portal's subdomain (or, on a portal subdomain,
back to the main domain for anything that isn't that portal's own path
or one of the shared `/platform-login`/`/platform-signup`/`/support`
paths — closing a real gap where `identity.aorms.in/dashboard` would
otherwise have silently served the Office Hub). The full routing table
lives in `web/lib/platform/subdomains.ts`; the deploy runbook is
`docs/esti/PLATFORM-SUBDOMAINS-DEPLOY.md`. The Platform session cookie
is scoped to `.aorms.in` in production so one sign-in follows a visitor
across all three subdomains.

All three headers live in one file,
`components/aorms/platform/PortalHeaders.tsx` — each page renders its own
matching header directly (not a shared layout-level header; the three
portals have genuinely distinct nav, not just a different title).
`/platform-login`, `/platform-signup`, and `/support` are portal-neutral
(a person may not yet belong to any one portal, or may need help from
any of them) and render their own minimal standalone heading instead,
same as before this split.

**Identity/ConnectDeX split** — before this date, `/identity` showed both
Studio *and* Company memberships in one page. Company membership moved
out entirely to its own page, `/connectdex` — Identity is now
Studio-only, matching the "architects & Studios" / "material & interior
suppliers" audience split precisely. Creating a brand-new Company still
only ever happens through the gated onboarding pipeline
(`platform/supabase/migrations/0013_connectdex_onboarding.sql`); joining
an already-active Company as a team member is unaffected.

**HelpDeX** — the support-ticket area, nested inside SysDeX the same way
ESTI is nested inside AORMS: `/support` (public submit form, portal-
neutral) → `support_tickets` (`platform/supabase/migrations/
0015_helpdesk_and_password_reset.sql`) → `/admin/helpdesk` (SysDeX,
triage/status/internal note). **Disclosed scope boundary**: there is no
outbound "reply to the submitter" email — that needs new email infra
beyond Supabase Auth's fixed-template emails (invite/recovery), which is
all this codebase has. An admin triages and resolves a ticket's status;
actually replying to the submitter is manual/out of band for now.

**Admin-triggered password reset** — `/admin/accounts` (SysDeX) lists
every account and can send a Supabase Auth recovery email
(`resetPasswordForEmail`, the same "Supabase's own email delivery only"
convention as `inviteUserByEmail` elsewhere), logging a
`password_reset_requests` row for the activity trail. `is_admin` itself
stays DB-only — no grant/revoke toggle was added; that boundary (see
`platform/supabase/migrations/0009_admin_role.sql`) is unchanged.

**Admin-auth fix — SysDeX signs in with its own Platform session.**
Every admin gate used to resolve via `getCurrentPlatformAccount()` — the
Office-Hub-link-based resolver (Office Hub session → `profiles.
platform_public_id` → Platform account). That's the right mechanism for
`/identity`'s own read-only display (deliberately lets a person view
their linked identity from an Office Hub session alone), but it was a
real inconsistency for **admin** gating specifically: it required a
platform admin to also hold an `aorms-web` Office Hub account with a
linked identity, even though "platform staff" is supposed to be
independent of any one Office Hub deployment (`aorms-web` is one tenant
among many — see the Tenancy row above). Fixed 2026-09-10:
`getCurrentPlatformSessionAccount()` (`lib/platform/account.ts`) resolves
purely via the Platform's own session (`sb-platform-auth-token`) — no
Office Hub account needed. Every admin gate (`admin/*` pages, both
`requirePlatformAdmin()` duplicates, the new `admin-accounts.ts`/
`support.ts` actions) now uses this resolver.
`getCurrentPlatformAccount()` itself is untouched — it still exists for
`/identity`'s own use case, a distinct concern from admin gating.

## Nomenclature, precisely

| Term | Meaning | Do NOT use it to mean |
| --- | --- | --- |
| **AORMS Office Hub** | The product (`(app)/*`) | The Platform, or any `(platform)/*` page |
| **AORMS Platform** | The identity/licensing substrate (`(platform)/*`) | A second product; a "hub" |
| **Studio** | An architecture-firm entity (`studios` table, `AORMS-S-` handle) — was called "Company" until the 2026-09-07 rename | A material-supplier business |
| **Company** | A material-supplier business entity (`companies` table, `AORMS-C-` handle) — the *new* meaning as of the Studio/Company split | An architecture firm (that's a Studio now) |
| **Account** | A person's portable identity on the Platform (`accounts` table, `AORMS-U-` handle) | A Studio or Company (those are entities, not people) |
| **Identity page** (`/identity`) | A signed-in person's own landing page on the Platform — their account, level, and every Studio/Company membership | "The hub" (see above) |
| **Portal** | A self-service page scoped to **one entity the caller belongs to** — sees only that entity's own data | The Admin back office (opposite scope) |
| **Admin** / **Admin back office** | The platform-staff-only area (`/admin/*`) — sees **every** entity's data, platform-wide | A Portal; anything a Studio/Company member can reach |
| **Directory** | A cross-entity *discovery* surface (currently just `/materials`) — any Studio can browse any Company's products. Neither Portal-scoped (it deliberately shows other entities' data) nor Admin (any authenticated account can use it, not just staff) | A Portal or Admin |

## The boundary: Admin vs. Portal vs. Directory

This is the specific thing that had to be architected, not left implicit,
once real payments and a site-wide admin panel existed side by side with
self-service entity pages.

**Rule:** a Portal page shows and edits data for **the one Studio or
Company the signed-in caller is an active member of** — nothing about any
other entity, ever, even in aggregate (no "how many other studios exist"
counts, no cross-entity search). Everything platform-wide — every studio,
every payment, every account, cross-entity settings like pricing — lives
in Admin, gated behind `accounts.is_admin`, and nowhere else.

| Route | Kind | Audience / scope |
| --- | --- | --- |
| `/identity` | Personal (Identity) | The signed-in account's own profile + every Studio they belong to (list, not detail) — Studio-only since the 2026-09-10 Identity/ConnectDeX split, see § Three portals above |
| `/studios/[studioId]` | **Portal** (Studio) | That one Studio's profile, board, contacts, membership management — only reachable/actionable for a member of that specific studio (RLS-enforced, not just hidden in the UI) |
| `/companies/[companyId]` | **Portal** (Company) | Same shape, for one Company (material supplier) — profile, board, contacts, and that company's own product catalogue |
| `/licences` | **Portal** (Studio) | **Licence management for studios the caller belongs to, and only those** — current plan/seats/expiry, and the Razorpay "Upgrade" flow (`UpgradeLicenceButton`). This is the page the user's "company/user portals will have only licence management related to them" instruction is about: it must never show another studio's licence, and as of 2026-09-09 it can no longer even self-edit a plan for free (see § Licensing & payments below) |
| `/materials` | **Directory** | Cross-entity browsing — any authenticated account can search every Company's products, nearest-first by city/state. Deliberately NOT Admin (no staff gate — this is meant to be used by every Studio) and NOT a Portal (deliberately shows *other* entities' data, the opposite of Portal scoping) |
| `/admin` | **Admin** | Dashboard: platform-wide counts (every studio, every account, licence-plan breakdown), recent payments and activity across the whole platform |
| `/admin/licences` | **Admin** | Every studio's licence, direct override (`adminUpdateLicence`) — the admin counterpart to the Portal's `/licences`; this is where "manage licences platform-wide" lives, never the Portal |
| `/admin/payments` | **Admin** | Every payment, every studio — a Studio's own Portal never shows another studio's payment history (RLS: `"payments: studio members read"` scopes a member to their own studio's rows only; `"payments: admin read"` is the only cross-studio read path) |
| `/admin/pricing` | **Admin** | The one global `plan_pricing` table — per-seat prices apply platform-wide, so this is inherently Admin-only, never something a Studio Portal could reasonably expose |
| `/admin/logs` | **Admin** | `platform_activity_log` — every event, every entity. No Portal-level "my studio's activity log" exists yet (see § Open questions) |
| `/admin/accounts` | **Admin** | Every `accounts` row, platform-wide — admin-triggered password reset (see § Three portals above) |
| `/admin/helpdesk` | **Admin** | HelpDeX — every `support_tickets` row, status/internal-note triage (see § Three portals above) |
| `/connectdex` | Personal (ConnectDeX) | The signed-in account's own Company memberships (list, not detail) — the ConnectDeX Portal's counterpart to `/identity` |
| `/support` | Auth-neutral | Public HelpDeX ticket submit form — no account required |
| `/platform-login`, `/platform-signup` | Auth | Sign in/up for a personal Platform Account — not entity-scoped at all, this is what creates the `AORMS-U-` identity everything else hangs off of |

**Currently NOT true, flagged rather than silently assumed:** Companies
(material suppliers) have **no licence of their own** — licensing only
applies to Studios (`licences.studio_id`, not a generic `entity_id`). This
was an explicit, disclosed scope decision from the original Studio/Company
split plan ("Companies/suppliers don't get licence management here, an
explicit, disclosed scope boundary"), still true as of this doc. If that
changes, it needs its own `company_licences`-shaped table (or a
generalization of `licences` to reference either a studio or a company) —
not a quiet extension of the existing Studio-only table, since RLS,
Razorpay order metadata, and the activity-log triggers all currently
assume `studio_id`.

## Licensing & payments — the part that made the boundary matter

Before 2026-09-09, `/licences` was pure self-service: a Studio owner could
`PATCH` `plan`/`seats`/`expires_at` directly via RLS, no payment involved
(`platform/supabase/migrations/0004_licences.sql`'s own header comment
disclosed this plainly). Once real Razorpay payments existed
(`0010_payments.sql`), that self-serve RLS policy became a free bypass —
closed in `0011_licence_payment_gate.sql` (dropped `"licences: owner
update"`, added `"licences: admin update"` gated by `is_platform_admin()`).

**The resulting rule, now enforced at the database level, not just the
UI:** a Portal can only ever *purchase* a licence change (via Razorpay,
verified by the webhook — `app/api/razorpay/webhook/route.ts` — or the
client-side fast-path confirmation, `confirmPaymentClientSide`) or
*request* one; only Admin can *directly set* a licence's plan/seats/expiry
with no payment attached. `docs/esti/ROADMAP.md`'s dated History entry for
this work has the full incident/design account; this doc only states the
resulting boundary.

## Open questions (flagged, not decided here)

- **Should Companies (suppliers) get their own licence eventually?** Not
  built; would need schema work as noted above. No signal yet that it's
  needed — `/materials` (the Directory) works today without one.
- **Should a Studio/Company Portal get its own scoped activity log** (only
  events about that one entity), separate from Admin's platform-wide
  `/admin/logs`? Not built. `platform_activity_log` already carries
  `studio_id`, so a Portal-scoped view is a straightforward filtered query
  away if this is ever wanted — flagged here so it isn't rebuilt from
  scratch as a surprise later.
- **Multiple Office Hub deployments sharing one Platform database** is the
  Platform's stated long-term design point (see the Tenancy row above),
  but only one Office Hub deployment (`aorms-web`) exists today. Nothing
  in the Admin/Portal boundary above assumes a single Office Hub — Admin
  is scoped to "every entity in the Platform database," which already
  spans whatever Office Hub deployments exist, not just this one.

## See also

- [`docs/esti/AORMS-IDENTITY.md`](AORMS-IDENTITY.md) — the original design
  doc this system was built from (predates the Studio/Company rename and
  the admin/payments work; historical, not fully current — this doc is
  the one to trust for current nomenclature and boundaries).
- [`docs/esti/ROADMAP.md`](ROADMAP.md) § History — the dated, narrative
  build history (what was built when, why, what was verified) for every
  Platform feature including this admin/payments round.
