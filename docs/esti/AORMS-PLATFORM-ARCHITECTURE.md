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
| Supabase project | `aorms-web` (`fyedovpqjwbslrughwdv`) | `aorms-platform` (`qbgbnhthchhbammzeebg`) — as of 2026-09-14 (migration `0025`), the Company/ConnectDeX domain (11 tables: `companies`, `company_accounts`, `company_memberships`, board/contacts, `connectdex_*`, `products`/specs/test-results) lives in its own `connectdex` Postgres **schema** within this same project, not `public` — a deliberate namespace-only move (see SYSDEX-PORTAL-AUDIT-2026-09-14.md § 8) so a future split into a genuinely separate Supabase project, once ConnectDeX has real traffic, is a mechanical schema dump/restore rather than a fresh audit. Every Supabase call touching those tables goes through `.schema("connectdex")` |
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

**2026-09-14 — `aorms.in/login` now accepts an AORMS Identity password
too**, per explicit user direction after being shown the concrete
consequence and confirming anyway (`web/lib/actions/auth.ts`'s
`signInWithIdentity()`; see that function's own header comment for the
full design). This does **not** weaken "link, not merge" — sessions and
databases are still fully separate, and a Platform-verified password
never becomes a real Office Hub password. What it adds: `signIn()` now
falls back to checking the Platform's own Auth when a password doesn't
match this deployment's `auth.users` directly, and can auto-provision a
brand-new `profiles` row for a Platform Identity that has never touched
this Office Hub before. **The critical safety property, found and fixed
before this shipped, not after**: `profiles.role` defaults to
`'ASSOCIATE'` — real staff access — the instant a new `auth.users` row is
created (`handle_new_user()`'s own trigger). A naive version of this
feature would have let literally any internet stranger with a free
Identity account sign into any Office Hub deployment with real staff
access. Fixed with a new `'PENDING'` role (`web/supabase/migrations/
0049_pending_role_for_identity_signin.sql`) that `roleHome()` and every
role-gated RLS policy in this schema (all explicit allowlists, none of
them exclusion-based — confirmed before relying on that) already treat as
"no portal at all" — auto-provisioning creates a real row an OWNER/
PARTNER can find and promote on `/users`, never real access on its own.
An *existing* Office Hub account signing in with its Identity password
instead just auto-links the two (backfilling `platform_public_id` only if
unset) — its existing role is never touched.

**Stale-doc correction (2026-09-14) — the Platform is now THREE separate
identity tables, not one "portable AORMS-U- across everything."** This
doc used to describe one `accounts` table (`AORMS-U-`) as the single
portable identity underneath every Studio, Company, and admin context —
several passages below (`accounts.is_admin`, the Nomenclature table's
"Account" row) still say that and are superseded by this note, kept
un-rewritten only for the historical account of how the boundary was
first reasoned through. Explicit user direction, 2026-09-14: "the admin
users and staff should be separate from aorms hub users, and should be
separate from company users, three separate tables, and don't reconcile
every user in a single platform." Confirmed via a clarifying question
first (this directly conflicted with the design this doc originally
described) — the user's explicit answer accepted the real tradeoff: **a
person can no longer use one login across Studio/Identity, Company/
ConnectDeX, and platform-staff contexts.** Three genuinely separate
identity tables now exist on `aorms-platform`, each keyed to its own,
non-overlapping set of `auth.users` rows:

| Table | Handle prefix | Who | Migration |
| --- | --- | --- | --- |
| `accounts` | `AORMS-U-` | Studio/architect Identity users only (no longer "everyone") | original (0001), narrowed 2026-09-14 (0023 dropped its `is_admin`/`admin_role` columns) |
| `platform_staff` | (no handle — internal only) | AORMS admin/support staff, independent of any Studio/Company/Office Hub deployment | 0022 (created), 0023 (`accounts.is_admin`/`admin_role` retired in its favor) |
| `company_accounts` | `AORMS-CU-` | ConnectDeX/Company-side users only — minted solely via the admin ConnectDeX invite path, never self-signup | 0024 |

Mutual exclusion between `accounts` and `company_accounts` is enforced by
construction: the one trigger on every `auth.users` insert,
`handle_new_platform_account()`, branches on
`raw_user_meta_data->>'account_kind'` — `'company'` creates a
`company_accounts` row, anything else (the default, every existing
signup path unchanged) creates an `accounts` row. Every `auth.users` row
gets exactly one of the two, permanently, at signup/invite time — a
person needing both a Studio/Identity login and a Company login needs
two separate accounts (two separate emails). See `lib/platform/
account.ts`'s `resolveAdminRole()`/`getPlatformNavStatus()` and
`platform/supabase/migrations/0022`-`0024` for the implementation; the
"two separate sessions, two separate databases, joined by one stored
handle" sentence above (Office Hub ↔ Platform) is unaffected by any of
this — that's a different link, one level up.

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
| **SysDeX** | Platform staff (`platform_staff` — see the 2026-09-14 correction above; was `accounts.is_admin`) | `sysdex.aorms.in` | every `/admin/*` page | `SysDexPortalHeader` |

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
`password_reset_requests` row for the activity trail. `admin_role`
itself stays DB-only — no grant/revoke toggle was added; that boundary
(see `platform/supabase/migrations/0009_admin_role.sql`) is unchanged.

**SysDeX has two staff roles (2026-09-10)** — originally
`accounts.admin_role` (`platform/supabase/migrations/0016_admin_role.sql`),
now `platform_staff.admin_role` (see the 2026-09-14 correction above):
**SUPER_ADMIN** sees every `/admin/*` page (Accounts, Licences, Payments,
Pricing, ConnectDeX review, Logs) and can perform every admin write
action; **SUPPORT_STAFF** is scoped to the dashboard and
`/admin/helpdesk` only — everything else renders `AdminAccessDenied`.
`is_platform_admin()` (the RLS-facing function every "admin read" policy
keys off) now checks `platform_staff` only, unchanged in shape — the
role split is still enforced at the page/Server-Action layer
(`isSuperAdmin()` in `lib/platform/account.ts`), not at the RLS layer.
See `docs/esti/ROADMAP.md`'s dated entry for the full account, including
the disclosed scope boundary (support staff can still technically *read*,
not write, Licence/Payment/Account data via a direct API call — same as
before this split, unchanged, not newly introduced).

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
| **Account** | A person's Studio/Identity login on the Platform (`accounts` table, `AORMS-U-` handle) — **not** portable to Company/ConnectDeX or staff contexts as of 2026-09-14, see the correction above | A Company member's login (that's a Company Account, below); a Studio or Company itself (those are entities, not people) |
| **Company Account** | A person's Company/ConnectDeX login (`company_accounts` table, `AORMS-CU-` handle, 2026-09-14) — a genuinely separate identity from Account, minted only via the admin ConnectDeX invite path | An Account; anything Studio-scoped |
| **Identity page** (`/identity`) | A signed-in Account's own landing page on the Platform — their account, level, and every Studio membership (Company memberships are `/connectdex`'s own page, resolved from a Company Account instead) | "The hub" (see above) |
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
| `/admin/accounts` (nav label "Users") | **Admin** | Every person-level login, platform-wide, under two headed sections (2026-09-14): Users (`accounts`, with level/admin-role overrides) and Company Accounts (`connectdex.company_accounts`) — both with admin-triggered password reset |
| `/admin/studios` | **Admin** | Every `studios` row, platform-wide (2026-09-14) — name, handle, location, member count, licence plan, linking into `/studios/[studioId]`. Distinct from `/admin/licences` (licence-framed) |
| `/admin/companies` | **Admin** | Every `companies` row, platform-wide, any onboarding status (2026-09-14) — distinct from `/admin/connectdex`'s onboarding-review queue, which stays workflow-shaped |
| `/admin/helpdesk` | **Admin** | HelpDeX — every `support_tickets` row, status/internal-note triage (see § Three portals above) |
| `/connectdex` | Personal (ConnectDeX) | The signed-in **Company Account**'s own Company memberships (list, not detail) — the ConnectDeX Portal's counterpart to `/identity`. Resolved from the Platform's own session directly (2026-09-14), not an Office Hub link — a Company Account has no relationship to any Office Hub deployment at all |
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
assume `studio_id`. **Companies do now carry a `tier`** (`companies.tier`
— BASE_LINE/PRO/PRO_PLUS, migration `0018`, renamed from Silver/Gold/
Platinum) — admin-settable only (`/admin/connectdex`'s `SetCompanyTierForm`),
no self-serve upgrade purchase and no price attached to any of the three
yet. This is a bare classification field, not a licence — it doesn't
change the "no licence of their own" fact above. Base Line's only
enforced consequence so far is a 5-distinct-product-category catalogue
cap (`materials.ts`'s `addProduct`) — non-binding today, since `products.
category` is a fixed 4-value platform-wide list. Pro/Pro Plus's named
differentiators (interactive catalogue, SKU-level detail, direct PO
generation, lead generation) have zero schema yet — disclosed as a real
follow-up once they're actually priced, not built alongside the rename.

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

**Real pricing, two named plans (2026-09-13, corrected same day — see the
next entry)** — the placeholder `STANDARD`/`PREMIUM` per-seat plans are
retired. `licences.plan` now has exactly one paid value, **AORMS_FIRM**
(₹1,999/year base + ₹199/user/month, billed as one annual Razorpay order
— see `platform/supabase/migrations/0017_identity_and_firm_plans.sql`'s
header for the full billing-mechanics disclosure: this is still a
one-time purchase extending `expires_at`, same as before, just annual
instead of 30-day and base+per-seat instead of pure per-seat — real
recurring auto-debit remains out of scope). `plan_pricing` now stores
`base_price_paise` + `price_per_seat_monthly_paise` per plan instead of a
single per-seat figure.

**Correction, same day: AORMS Identity is NOT a subscription — individual
accounts stay free, always.** The paragraph this replaces described
AORMS_IDENTITY as a ₹599/year individual plan; the user's fuller spec
clarified this was wrong ("user accounts remain free for every[one]") —
see `platform/supabase/migrations/0018_identity_verification_pro_seats_
connectdex_tiers.sql`'s header for the full account. What actually ships:
`identity_licences`/`identity_payments` (account-scoped, same table
shapes as before, same precedent `connectdex_payments` established for a
non-studio payment target) now back a **one-time ₹199 fee**, available
only after **100 usage-hours**, that permanently verifies an account's
identity — never renews, never re-charges (`expires_at` is set once and
stays `null` forever). `accounts.public_id` (the handle itself) is
**untouched** — it kept minting free and immediate at signup exactly as
before; gating the handle itself was considered and rejected as circular,
since heartbeat recording (the very mechanism that counts the 100 hours)
depends on that handle already existing as the Office-Hub-session join
key. Separately, **PRO is no longer free/automatic** — the heartbeat
trigger (`apply_heartbeat()`) no longer touches `level` at all (it still
accumulates `total_active_seconds`, just for the 100hr gate above now, not
a free PRO flip). PRO is granted by a Studio to one of its own members,
capped at that Studio's own paid `licences.seats` — the first real use
for `seats`, previously a pure billing number. No new price for this: it
reuses AORMS_FIRM's already-built seat purchase rather than inventing a
second "pay for a different account's benefit" flow (confirmed none
existed anywhere in this codebase before this correction).

**Second correction, same day: AORMS_FIRM renamed/split into Pro +
Enterprise (migration 0019).** The single ₹1,999/yr+₹199/user/month
AORMS_FIRM tier above is retired — `licences.plan` now has two paid
values, **PRO** (₹1,999/yr flat) and **ENTERPRISE** (₹14,999/yr flat,
gated to 20+ active team members). Neither has a per-seat component at
all anymore; `licences.seats` (which the PRO-seat-assignment mechanism
above depends on) is now a fixed allotment baked into the plan a Studio
buys — 20 for Pro, 9999 (effectively unlimited) for Enterprise — not a
purchased quantity. Enterprise also carries a **`studios.subdomain_slug`**
reservation (validated, unique) as a named perk — schema + UI only; it
does not make `<slug>.aorms.in` actually resolve (see
`docs/esti/ROADMAP.md`'s dated entry for the disclosed DNS/routing
follow-up). New `transferStudioOwnership` gives `studios.owner_id` its
first real, validated write path — previously any owner could `PATCH` it
to any UUID via RLS with zero validation, since `is_studio_owner()`
checks `studio_memberships.role`, not this column.

The "Companies have no licence" open question below is unaffected by any
of this — it only touches Studio/individual pricing, not Company.

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
