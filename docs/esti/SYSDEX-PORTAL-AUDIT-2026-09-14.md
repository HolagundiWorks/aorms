# SysDeX Portal Audit — 2026-09-14

**Trigger:** "Update the SysDeX portal, activating licence is not
working, activating user, user level Basic/Pro scheme doesn't exist,
audit and implement the missing links, remove bugs and errors, and
complete the whole portal. Understand the Identity and Admin account
scenarios — Admin and Support Staff for the platform should be
independent of Identity Platform users. Structure this out and complete
it, take full access, make recommended decisions and work on it and
document everything."

This document is the record of what was actually found, what was fixed,
what was checked and confirmed **not** broken, and the one large
structural question (Admin/Support Staff vs. Identity accounts) that's
recorded here as a recommendation rather than executed live in this
pass — see § 5.

---

## 1. What was actually broken (fixed)

### 1.1 Free-tier studios could grant one PRO seat for free

`handle_new_studio_licence()` (platform migration 0006) minted every new
studio's TRIAL licence with `seats = 1`. `assignProSeat` caps PRO grants
at `licences.seats` — so a studio that had never paid anything could
still promote one member to PRO, directly contradicting the documented
model everywhere else in this app ("PRO is granted by a studio you
belong to, **from its own paid seats**, not automatic" —
`app/(platform)/identity/page.tsx`'s own copy).

**Fixed** — platform migration `0021_trial_zero_pro_seats.sql`:
- Widened `licences_seats_check` from `seats > 0` to `seats >= 0` (0 is
  now a legitimate value).
- Changed the trigger's default to `seats = 0` for new TRIAL studios.
- Corrected the two existing live TRIAL licences to `seats = 0` —
  confirmed safe first: zero `studio_memberships` anywhere had
  `pro_assigned_at` set, so this revoked nothing anyone was using.
- `UpdateLicenceForm.tsx`'s seats input and `adminUpdateLicence`'s own
  validation both had `min={1}` / `seats < 1` guards that would have
  blocked an admin from ever setting or keeping 0 — both widened to
  allow 0, or this fix would have been unreachable from the admin UI
  that's supposed to let someone override it.

**Verified live:** created a real TRIAL studio via the actual
studio-creation trigger, confirmed it minted with `seats = 0`;
re-queried `licences` grouped by plan/seats afterward and confirmed both
real, pre-existing TRIAL studios now show `seats = 0`.

### 1.2 No admin UI existed to change an account's BASIC/PRO level or
admin role at all

Migration 0016's own header comment recorded this as a deliberate
decision at the time ("no self-service grant admin UI in this pass") —
revised here by explicit instruction. Before this pass, the *only* way
to change `accounts.level` was `assignProSeat`/`revokeProSeat` (gated
behind a studio's own paid seat count — no direct override for a support
gesture or a stuck state), and the *only* way to change `admin_role` at
all was a raw SQL statement run by someone with direct database access.

**Added:**
- `adminSetAccountLevel(accountId, level)` and
  `adminSetAccountRole(accountId, adminRole | null)`
  (`lib/actions/platform.ts`) — both gated to SUPER_ADMIN
  (`requireSuperAdmin()`), both refuse to let a caller change their
  *own* admin role (a deliberate guard against a solo admin locking
  themselves out, per migration 0009's own reasoning for why this
  wasn't self-service in the first place).
- **Real bug caught before shipping, not after:** `accounts` has exactly
  one RLS policy — `"accounts: self read"` (SELECT, own row only) — and
  **no UPDATE policy at all**. Writing these two actions against the
  normal RLS-scoped client would have silently updated zero rows with no
  error, the same failure class `assignProSeat`/`revokeProSeat` already
  route around by using the service-role client for this exact table.
  Both new actions do the same.
- `AccountAdminControls.tsx` — two inline Selects (Level, Admin role) on
  `/admin/accounts`, replacing the old read-only Tags. Disabled entirely
  (with a visible reason) for the signed-in admin's own row.

**Verified live:** created a temp SUPER_ADMIN account, changed a real
existing account's level `BASIC → PRO`, reloaded the page (fresh
server-side fetch) and confirmed it read back `PRO`; changed its
`admin_role` `— → SUPPORT_STAFF`, confirmed the same way; reverted both
back to their original values (`BASIC` / not admin) so the demo data
stays as it was. Confirmed the self-row admin-role Select rendered
disabled with "Can't change your own admin role."

### 1.3 Manual licence override (plan/seats/expiry) — checked, not broken

The read of "licence activation not working" that seemed most literal —
an admin manually clearing an expired licence's expiry date to
reactivate it — was tested directly: created a studio, forced its
licence to an expired date, signed in as a real SUPER_ADMIN, cleared the
expiry field via `/admin/licences`, submitted, and confirmed the row
flipped from an EXPIRED red tag to an ACTIVE green one, including after
a full page reload. This specific mechanism works correctly; it wasn't
retested against a live Razorpay webhook capture (`applyCapturedPayment`
in `lib/platform/licence-payment.ts`), which reads correctly on
inspection but has no live payment gateway to fire against in this
environment.

---

## 2. Scanned, no issues found

`/admin` (dashboard), `/admin/payments`, `/admin/pricing`,
`/admin/connectdex`, `/admin/ai-connectors`, `/admin/helpdesk`,
`/admin/logs` — read for structure, RLS gating, and dead/missing links.
No broken links, missing pages, or obvious logic errors found in this
pass. This is a **code-review-level** check, not the same live,
click-through verification § 1's fixes got — flagged here rather than
silently implied to be equally thorough.

---

## 3. Shell/branding (carried over from the same-day earlier pass)

Already done earlier the same day, not re-litigated here:
`PlatformShellHeader.tsx` (shared Carbon header, all three portals),
`docs/esti/AORMS-WEB-BRANDING-GUIDE.md`. This audit's own new UI
(`AccountAdminControls.tsx`) follows that same shell/typography
convention.

---

## 4. Studio membership / client / contractor caps (carried over)

The mandatory studio join-or-create gate and the 3-user / 3-client /
3-contractor free-tier caps (migration 0048, `lib/platform/
firm-studio.ts`) were built and verified earlier the same day, in the
same session as this audit — see that work's own commit for detail, not
repeated here.

---

## 5. Identity accounts vs. Admin/Support Staff — current state and recommendation

**The explicit ask:** "Admin and Support Staff for the platform should be
independent of Identity Platform users." This is a real, valid structural
observation, and this section is the honest account of why it's
recorded as a **recommendation** rather than executed as a live schema
change in this pass.

### 5.1 What "independent" would mean, precisely

Today, `public.accounts` is **one table serving two genuinely different
roles**:

1. **Identity accounts** — a portable personal identity (`AORMS-U-`
   handle) for an architect or Studio member: `full_name`, `level`
   (BASIC/PRO), `total_active_seconds`, Studio memberships, ConnectDeX
   company memberships. This is the Identity Portal's whole reason to
   exist.
2. **Platform staff** — `is_admin` + `admin_role` (SUPER_ADMIN /
   SUPPORT_STAFF), granting access to SysDeX. Bolted onto the *same*
   table and the *same* row shape as (1), via two nullable/boolean
   columns added by migration 0009.

The practical consequence: every SysDeX admin **is, structurally, also
an Identity Portal end-user account** — same id, same handle, same
`level`/hours-logged/Studio-membership machinery, whether or not that
admin has (or should have) any personal architect identity at all. There
is no such thing today as "a Platform staff account with no Identity
Portal footprint."

### 5.2 Why this wasn't restructured live in this pass

Splitting platform staff into their own table (e.g. `platform_staff`,
keyed by the same `auth.users.id` but with none of `accounts`'s
Identity-specific columns) is a genuine, multi-part migration:

- Every RLS policy currently gated by `is_platform_admin()` (reading
  `public.accounts.is_admin`) — a fairly long list across payments,
  licences, `platform_activity_log`, ConnectDeX admin review, AI
  connectors, identity_licences — would need to read the *new* table
  instead, or `is_platform_admin()` itself would need to check both
  during a transition.
- The two real, live admin accounts (`AORMS-U-6WG2`,
  `AORMS-U-SHAM`) need a real migration path, not a manual one-off
  fix, since this is meant to be the durable model going forward.
- `getCurrentPlatformSessionAccount()`/`getPlatformNavStatus()`
  (`lib/platform/account.ts`) — the single resolver every SysDeX page
  and this audit's own new actions call — would need a second query
  path (staff table vs. accounts table) or a view/union, decided
  deliberately rather than improvised under an "audit and fix bugs"
  banner.
- This session's own recorded history includes a real RLS
  privilege-escalation incident from a rushed policy change (see
  CLAUDE.md's own dated account of the `memberships` self-update gap) —
  the standing lesson from that incident is exactly "don't rush a
  table/policy restructure without a dedicated review," which is what a
  live table split here would be.

None of that is a reason not to do it — it's the reason it's written up
here as a scoped, sequenced follow-up rather than attempted inside an
"audit and fix bugs" pass where a half-migrated admin table would be a
materially worse outcome than the current, merely-inelegant one.

### 5.3 Sequencing — steps 1-4 done same day, step 5 deliberately deferred

1. ✅ **Done** — `public.platform_staff (id uuid references auth.users,
   admin_role text, created_at)`, platform migration `0022_platform_
   staff_table.sql`. Additive; `accounts.is_admin`/`admin_role` untouched.
2. ✅ **Done** — same migration backfills the two real admin rows
   (`AORMS-U-6WG2` SUPER_ADMIN, `AORMS-U-SHAM` SUPPORT_STAFF) from
   `accounts` into `platform_staff`.
3. ✅ **Done** — `is_platform_admin()` now checks `platform_staff` OR
   `accounts.is_admin` (transition-safe — every existing RLS policy that
   calls it, unchanged, now recognizes staff from either table).
4. ✅ **Done** — `lib/platform/account.ts`'s `getCurrentPlatformAccount`/
   `getCurrentPlatformSessionAccount` resolve `admin_role` via a shared
   `resolveAdminRole()` helper: `platform_staff` first, falling back to
   the legacy columns. `adminSetAccountRole` (lib/actions/platform.ts)
   now writes `platform_staff` exclusively (upsert to grant, delete to
   revoke) — the one path that *grants* admin status, so it needed to
   move first. **Real regression caught and fixed in the same pass:**
   `/admin/accounts`'s own list was still reading `accounts.admin_role`
   directly for display — since that column is no longer kept in sync
   by writes, the list would have silently gone stale the moment anyone
   used the very control this same audit added. Fixed by joining
   `platform_staff` into the list query instead.
5. ✅ **Done** (2026-09-14, same day, explicit request: "drop the legacy
   accounts.is_admin columns now") — platform migration
   `0023_drop_legacy_admin_columns.sql`. First removed
   `resolveAdminRole()`'s fallback query against the legacy columns
   (`lib/platform/account.ts`) and `is_platform_admin()`'s `OR
   accounts.is_admin` clause, confirmed nothing else in `web/` read
   those columns directly (grepped the whole app — every remaining
   `is_admin`/`admin_role` reference was either a derived field on
   `CurrentPlatformAccount` or a comment), *then* dropped the columns.
   **One dependency found live, handled before it could block anything**:
   `before_account_admin_role_sync` (`sync_account_is_admin()`), a
   pre-existing trigger keeping `is_admin` derived from `admin_role` on
   every write — a pure consistency helper for the two-column model this
   step retires, confirmed to be the *only* trigger on `accounts`
   depending on either column, dropped explicitly (not via blanket
   `CASCADE`) in the same migration before the columns themselves.

**Verified live, end-to-end, with real accounts and a real revocation
path** (all test accounts deleted afterward):
- Created an account admin *only* via `platform_staff` (zero
  `accounts.is_admin` involvement) — signed in, confirmed full SUPER_ADMIN
  SysDeX access (all nav items, all four dashboard KPIs).
- Confirmed the two real pre-existing admin accounts still show their
  correct role on `/admin/accounts` post-migration (SUPPORT_STAFF /
  SUPER_ADMIN), via the newly-joined query.
- Created a plain, non-admin account; used the live `/admin/accounts`
  UI (`adminSetAccountRole` → `platform_staff` upsert) to grant it
  SUPPORT_STAFF; signed in as that exact account and confirmed it
  landed on the correct restricted SysDeX view (Dashboard + HelpDeX nav
  only, the single HelpDeX-ticket-count KPI) — proving the grant path,
  the RLS check, and the app-level resolver all agree, for an account
  the legacy `accounts` table has never marked as admin at all.

Each step above was independently verifiable against the live project
the same way every migration in this codebase already is — no single
step was a point where a mistake could have broken the live SysDeX
login for its two real admins, and at every point their access kept
working (checked directly, not assumed).

**Post-drop verification (step 5), separately, same discipline:** typecheck/
lint/build all clean before the drop was even applied (so a code issue
would have surfaced before the destructive step, not after). After
applying it: confirmed via `information_schema` that `accounts` no
longer has either column; created a fresh temp SUPER_ADMIN (via
`platform_staff` only) and confirmed full SysDeX access and a correct,
error-free `/admin/accounts` list for all five real+test accounts;
granted and then revoked SUPPORT_STAFF on a real existing account
through the live UI, confirming both directions persist correctly with
the legacy columns gone entirely. Test account deleted afterward;
`platform_staff` confirmed to hold exactly the two real admin rows.

---

## 6. Files touched this pass

- `platform/supabase/migrations/0021_trial_zero_pro_seats.sql` (new)
- `platform/supabase/migrations/0022_platform_staff_table.sql` (new)
- `platform/supabase/migrations/0023_drop_legacy_admin_columns.sql` (new)
- `web/lib/actions/platform.ts` — `adminSetAccountLevel`,
  `adminSetAccountRole`, `requireSuperAdmin`
- `web/lib/actions/platform-payments.ts` — seat validation `>= 0`
- `web/lib/platform/account.ts` — `resolveAdminRole()`
- `web/components/aorms/platform/UpdateLicenceForm.tsx` — seats input
  `min={0}`
- `web/components/aorms/platform/AccountAdminControls.tsx` (new)
- `web/app/(platform)/admin/accounts/page.tsx` — wired in the new
  controls, merged the Level/Admin columns, joins `platform_staff`

## 7. Company/ConnectDeX identity split — the third table (2026-09-14, same day)

Explicit follow-on request, after §5's Identity/Admin separation shipped:
"the admin users and staff should be seperatte from aorms hub users, and
should bde seperate from comapny users, three seperate tabeles, and dont
concile everyusers in single platform." §5 had already split admin/staff
out into `platform_staff`; this splits Company/ConnectDeX identities out
of the shared `accounts` table the same way.

**Flagged before building, not silently decided**: this directly
conflicts with `docs/esti/AORMS-PLATFORM-ARCHITECTURE.md`'s own
documented design — one portable `AORMS-U-` handle across every Studio
*and* Company (the signup page's own copy said so too). Asked a
clarifying question; the user's explicit answer was **"Split Company
users too, accept the tradeoff"** — a person can no longer use one login
across Studio/Identity and Company/ConnectDeX contexts, full stop, by
design. (A follow-up ask to also give ConnectDeX its own *Supabase
project*, not just its own table, was surfaced with the real blocker —
this org's free tier caps it at 2 active projects, already used by
`aorms-web`/`aorms-platform` — and the user chose to hold off rather than
upgrade the org's billing plan or pause a live project; the table-level
split below is the shipped, final state, not an intermediate step.)

**Design** — `platform/supabase/migrations/0024_company_account_split.sql`:
- New `company_accounts` table: `id uuid references auth.users`,
  `full_name`, `public_id` (own `AORMS-CU-` prefix, distinct from
  `accounts`'s `AORMS-U-`), `created_at`. RLS: self-read + staff-read-all
  (`is_platform_admin()`), no authenticated write policy — same shape as
  `platform_staff`.
- **Mutual exclusion enforced by construction, not a bolted-on check**:
  the single trigger on every `auth.users` insert,
  `handle_new_platform_account()`, now branches on
  `new.raw_user_meta_data ->> 'account_kind'` — `'company'` inserts into
  `company_accounts` (minting an `AORMS-CU-` handle), anything else (the
  unchanged default, every existing signup path) inserts into `accounts`
  as before. Every `auth.users` row gets exactly one of the two,
  permanently, decided at signup/invite time.
- The only place that ever sets `account_kind: "company"` is
  `adminInviteConnectDexApplication` (`web/lib/actions/connectdex.ts`) —
  there is no public self-serve Company signup, so this is the one and
  only path that mints a Company identity.
- FKs repointed from `accounts` to `company_accounts`:
  `companies.owner_id`, `company_memberships.account_id`,
  `connectdex_applications.invited_account_id`,
  `connectdex_payments.account_id`. Deliberately **not** repointed:
  `companies.verified_by_id`, `connectdex_applications.reviewed_by_id` —
  both are set from an admin's own session (`getCurrentPlatformSessionAccount().id`),
  and every real admin is an Identity/Studio account with a
  `platform_staff` grant layered on top, not a Company identity.
- **Backfill**: exactly one pre-existing row needed it — the seeded "Demo
  Materials Co" (`AORMS-C-QYQY`), created back when Company had instant
  self-serve creation (migration `0007`), before ConnectDeX's admin-invite
  gating existed at all. Grandfathered in with a fresh `AORMS-CU-` handle
  rather than breaking the demo data.

**Code updated to match**:
- `web/lib/actions/connectdex.ts` — `adminInviteConnectDexApplication`'s
  `inviteUserByEmail` call now passes `account_kind: "company"`.
- `web/lib/actions/company.ts` — `joinCompany` checks the caller already
  holds a `company_accounts` identity first, returning a clear explanation
  instead of a raw FK-violation error for an Identity/Studio account;
  `inviteCompanyMember` looks up the invitee's `AORMS-CU-` handle in
  `company_accounts`, not `AORMS-U-` in `accounts`.
- `web/app/(platform)/connectdex/page.tsx` and
  `web/app/(platform)/companies/[companyId]/page.tsx` — **rewritten**, not
  just patched: both used to resolve "who am I" via the Office Hub session
  → `profiles.platform_public_id` → `accounts`, the same portable-identity
  link Studio pages use. That path can never resolve a Company member
  post-split (arguably was already broken pre-split too, for a Company
  identity with no Office Hub account at all — this pass didn't
  separately verify the old behavior, only that the new one works).
  Rewritten to resolve directly from the Platform's own session
  (`createPlatformClient().auth.getUser()` → `company_accounts`), the same
  pattern `getCurrentPlatformSessionAccount()` already used for Studio/
  staff — no Office Hub link involved for a Company identity at all.
- `web/lib/platform/account.ts` — `getPlatformNavStatus()` now falls back
  to `company_accounts` when the session has no Studio/staff `accounts`
  row, so a signed-in Company user shows correctly signed-in (with their
  own name) in every portal header instead of "Sign in" — the header
  previously had no path to resolve a Company identity at all.
- `web/components/aorms/platform/company/InviteCompanyMemberForm.tsx` —
  label/placeholder updated to `AORMS-CU-`.
- `docs/esti/AORMS-PLATFORM-ARCHITECTURE.md` — dated correction section +
  inline fixes (Nomenclature table gained a "Company Account" row; the
  `/connectdex` boundary-table row and the two remaining stale
  `accounts.is_admin` mentions updated to match §5's `platform_staff`
  split too, missed when that section originally shipped).

**Verified live** (`aorms-platform`, service-role script, temp rows
deleted after): a plain signup with no `account_kind` still creates an
`accounts`/`AORMS-U-` row and no `company_accounts` row (existing
behavior unaffected); a signup with `account_kind: "company"` creates a
`company_accounts`/`AORMS-CU-` row and no `accounts` row; inserting a
`company_memberships` row for the Company identity succeeds; inserting
one for the Identity-only account correctly fails on the FK
(`company_memberships_account_id_fkey`) with a clear constraint error,
not silent success. `tsc --noEmit`, `eslint`, browser click-through of
the rewritten `/connectdex` page (new copy renders, sign-in CTA and
"Apply to become a ConnectDeX Partner" link both present) all clean.

**Files touched**: `platform/supabase/migrations/0024_company_account_split.sql`
(new), `web/lib/actions/connectdex.ts`, `web/lib/actions/company.ts`,
`web/app/(platform)/connectdex/page.tsx`,
`web/app/(platform)/companies/[companyId]/page.tsx`,
`web/lib/platform/account.ts`,
`web/components/aorms/platform/company/InviteCompanyMemberForm.tsx`,
`docs/esti/AORMS-PLATFORM-ARCHITECTURE.md`.

---

## 8. ConnectDeX/Company Postgres-schema split — migration-readiness (2026-09-14, same day)

Explicit follow-on request after §7: "keep it as it is for now... restructure
the db for easy migration in future... once the data grows I need separate
platforms." Also asked about a genuinely separate Supabase *project* for
ConnectDeX — attempted it, hit a real wall (this org's free tier caps it at
2 active projects, already used by `aorms-web`/`aorms-platform`, and the
2-project limit is scoped to the *account*, not the org — a fresh org under
the same login doesn't help), and the user chose to hold off on upgrading
billing or pausing a live project rather than force it. **This section is
the alternative that was built instead**: full logical separation *within*
`aorms-platform`, structured so the eventual physical split (once there's
real traffic to justify it) is a mechanical `pg_dump --schema=connectdex` +
restore, not a fresh audit.

**Correction made before building**: the user's first phrasing of the split
("platform db = credentials, web db = actual data — projects, logs, work,
catalogues") would have put the Material Catalogue inside `aorms-web`. That's
wrong for this schema specifically — `aorms-web` is single-tenant per Office
Hub deployment (CLAUDE.md's own Tenancy row), while the catalogue is
cross-tenant by design (`/materials` lets every Studio browse every
Company's products). Flagged this before building anything; the actual
boundary implemented is **tenant-scoped vs. cross-tenant**, not
"credentials vs. data" — the catalogue stays in `aorms-platform` (now inside
its own `connectdex` schema there), `aorms-web` is untouched.

**What moved** — `platform/supabase/migrations/0025_connectdex_schema_split.sql`,
a new `connectdex` Postgres schema inside `aorms-platform`:
- 11 tables: `companies`, `company_accounts`, `company_memberships`,
  `company_board_members`, `company_contacts`, `connectdex_applications`,
  `connectdex_payments`, `connectdex_settings`, `products`,
  `product_specifications`, `product_test_results`.
- 9 domain-specific functions (and their trigger attachments):
  `is_company_owner`, `handle_new_company`,
  `handle_new_company_owner_membership`,
  `enforce_company_membership_update_invariants`,
  `log_company_status_update`, `log_connectdex_application_insert`,
  `log_connectdex_application_update`, `log_connectdex_payment_insert`,
  `log_connectdex_payment_update`.
- Stayed in `public`, deliberately: the Identity/Studio core (`accounts`,
  `platform_staff`, `studios`, `studio_memberships`, `licences`, `payments`,
  `plan_pricing`, `platform_activity_log`, `support_tickets`,
  `password_reset_requests`), plus `handle_new_platform_account()` (the one
  shared auth trigger that creates EITHER an `accounts` row or a
  `company_accounts` row — it has to see both schemas) and `new_public_id()`
  (the handle-minting utility, made schema-aware via a new optional
  parameter rather than duplicated).

**Why this was safe to do live, same-session, no downtime**: `ALTER TABLE/
FUNCTION ... SET SCHEMA` preserves every FK, RLS policy, index, and trigger
attachment automatically — Postgres resolves all of those by object OID,
not by re-parsing a schema-qualified name. Confirmed via `pg_policies`/
`pg_constraint`/`information_schema.triggers` before writing the migration:
every FK touching these 11 tables (14 total, both directions), and the RLS
policies on `company_board_members`/`company_contacts` that reference
`company_memberships` by bare name, all needed zero changes. The only
things that genuinely needed editing were the handful of PL/pgSQL function
BODIES that hardcode a `public.<table>` string (re-resolved as literal SQL
text at call time, unlike OID-based references) — read every trigger
function's actual definition first (not assumed) to find exactly which 4
needed a body rewrite vs. which 5 only needed the schema move itself.

**One real bug hit and fixed in the same pass, not shipped broken**:
`new_public_id`'s `CREATE OR REPLACE FUNCTION ... (text, text, text
DEFAULT 'public')` did not replace the original 2-arg function — Postgres
treats a different argument count as a distinct overload, not a
replacement. With both the 2-arg and 3-arg-with-default versions live at
once, every 2-arg call (`handle_new_studio`'s own `new_public_id('AORMS-S-',
'studios')`, and the accounts branch of `handle_new_platform_account`)
became ambiguous ("function ... is not unique"), which silently broke
*every new plain signup on the whole platform* — caught immediately by the
live verification step below (not left for a user to find), fixed by
adding an explicit `drop function if exists public.new_public_id(text,
text);` before the replacement, and folded into the migration file itself
so a fresh apply from scratch is correct too, not just the live database
(which was hand-patched first, then the file corrected to match).

**PostgREST exposure**: `connectdex` added to the project's exposed-schema
list (`PATCH /v1/projects/{ref}/postgrest`, `db_schema: "public,connectdex,
graphql_public"`) — without this the new schema exists in Postgres but the
Supabase REST API (and therefore the `supabase-js` client every Server
Action/page uses) can't reach it at all.

**App code updated to match** — every Supabase call touching the 11 moved
tables now goes through `.schema("connectdex")` first (either inline or via
a small `cx`-scoped client variable per function, added directly after
each client's creation): `web/lib/actions/connectdex.ts`,
`web/lib/actions/company.ts`, `web/lib/actions/materials.ts` (all three
files entirely connectdex-schema — every call touched),
`web/lib/platform/connectdex-payment.ts` (both calls),
`web/lib/platform/account.ts` (`getPlatformNavStatus()`'s Company-account
fallback), `web/app/(platform)/connectdex/page.tsx`,
`web/app/(platform)/companies/[companyId]/page.tsx`,
`web/app/(platform)/admin/connectdex/page.tsx`,
`web/app/(platform)/admin/ai-connectors/page.tsx` (one call, mixed with
unrelated `accounts`/`ai_model_connectors` queries that correctly stayed
unscoped), `web/app/(platform)/materials/page.tsx` (one call, mixed with
unrelated `accounts`/`studio_memberships` queries), and
`web/app/api/razorpay/webhook/route.ts` (2 of its 6 payment-table calls —
`payments`/`identity_payments` correctly stayed unscoped, only
`connectdex_payments` moved).

**Verified live**, `aorms-platform`, service-role script (temp rows deleted
after): confirmed all 11 tables actually landed in `information_schema.
tables` under `connectdex`; a plain signup still lands in `public.accounts`
(unaffected domain, proving the ambiguity fix actually worked); an
`account_kind: "company"` invite lands in `connectdex.company_accounts`;
inserting a `companies` row with no `public_id` correctly minted one via
the now-schema-aware `new_public_id(..., 'connectdex')`
(`connectdex.handle_new_company`); the founding OWNER
`company_memberships` row fired correctly
(`connectdex.handle_new_company_owner_membership`); the immutability guard
correctly rejected changing `account_id` on an existing membership
(`connectdex.enforce_company_membership_update_invariants`); confirmed the
schema is reachable through the same `supabase-js` `.schema()` call path
the app itself uses (not just direct SQL) after the PostgREST exposure
change. Browser click-through of the real, live `/materials` Directory
page afterward — not a temp script — rendered 3 real products from the
seeded "Demo Materials Co" with their `companies(...)` embed resolved
correctly (the FK-based PostgREST join across two tables that both moved
together), proving the whole pipeline end-to-end through the actual app,
not just isolated queries. `tsc --noEmit`, `eslint .`, and a full `next
build --webpack` all clean throughout.

**Files touched**: `platform/supabase/migrations/0025_connectdex_schema_split.sql`
(new), `web/lib/actions/connectdex.ts`, `web/lib/actions/company.ts`,
`web/lib/actions/materials.ts`, `web/lib/platform/connectdex-payment.ts`,
`web/lib/platform/account.ts`, `web/app/(platform)/connectdex/page.tsx`,
`web/app/(platform)/companies/[companyId]/page.tsx`,
`web/app/(platform)/admin/connectdex/page.tsx`,
`web/app/(platform)/admin/ai-connectors/page.tsx`,
`web/app/(platform)/materials/page.tsx`,
`web/app/api/razorpay/webhook/route.ts`.

---

## 9. Portal-completion audit — Studios/Companies/Users directories, and three regressions found by proactive testing (2026-09-14, same day, autopilot)

Explicit follow-on request: "the identity platform is incomplete, no
options to connect to existing company, no option to create a company...
also sysdex platform is incomplete, all the accounts needs to be under
respective heading, users, companies, studios... take autopilot mode and
continue, any challenge move as per your recommendations, document
everything and continue."

### 9.1 Claims checked against the real code before acting on any of them

Rather than assume the complaint was accurate everywhere, each part was
verified against the live app first:

| Claim | Finding |
| --- | --- |
| "Identity platform... no option to create/join a company" | **Already complete, not a gap** — `/identity` has always had both `CreateStudioForm` and `JoinStudioForm`, in both the gated empty-state and the normal view (`app/(platform)/identity/page.tsx`). "Company" here reads as the general join/create concept, which Identity (Studio-scoped) already has in full. |
| "ConnectDeX... no option to create a company" | **Exists, but as a review-gated application, not instant self-serve** — `/connectdex-apply` (`ConnectDexApplyForm`) is the "create a company" flow; deliberately not instant per the 2026-09-10 ConnectDeX-gating decision (migration 0013). Not changed — the gate is a considered decision from an earlier pass, not something this audit's "any challenge, move per your recommendation" licensed re-litigating without a fresh, explicit ask to do so. |
| "Client/contractor/consultant management + logins should be in aorms-web, not aorms-platform" | **Already exactly this — confirmed, not built.** `web/supabase/migrations/0020_client_portal.sql` / `0021_collaborator_contractor_portals.sql` — Client/Consultant/Contractor Portal auth is `public.current_app_role()` + `profiles.client_id`/`consultant_id`/`contractor_id`, all on `aorms-web`'s own `auth.users`/`profiles`, nothing on `aorms-platform` at all. `/clients`, `/consultants`, `/contractors` (record management) already live under `app/(app)/*`, the Office Hub's own admin area. No code changed for this claim — verified via the migration files and the route tree, not assumed. |
| "SysDeX incomplete, accounts need to be under respective headings — users, companies, studios" | **Real, confirmed gap** — see § 9.2. |

### 9.2 New SysDeX directories: Studios, Companies, and a restructured Users page

Before this pass, SysDeX had a bare studio *count* on the dashboard and
no studio list at all; Company entities only appeared inside
`/admin/connectdex`'s onboarding-review queue (pending applications/
verification/payment, shaped around that workflow, not a general
browse-everything list); and `/admin/accounts` — despite its nav label
"Accounts" implying platform-wide coverage — only ever queried `accounts`
(Identity users), with no page anywhere showing a Company Account
(`connectdex.company_accounts`, minted only via the ConnectDeX admin
invite, migration 0024) at all.

- **`/admin/studios`** (new) — every Studio, platform-wide: name, handle,
  city/state, active member count, licence plan, created date, linking
  into `/studios/[studioId]`. Distinct from `/admin/licences` (which
  already listed every studio but licence-framed, no link into the
  studio's own page, no location/member data).
- **`/admin/companies`** (new) — every Company, any onboarding status,
  platform-wide: name, handle, location, status, tier, active member
  count, created date, linking into `/companies/[companyId]`. Distinct
  from `/admin/connectdex`, which keeps doing what it does well (the
  actionable review workflow for pending applications) — this is the
  general directory that workflow-shaped page never was.
- **`/admin/accounts`** (restructured, kept its URL, nav label changed
  "Accounts" → "Users") — now two clearly headed tables on one page:
  **Users — AORMS Identity (AORMS-U-)** (the pre-existing table,
  unchanged) and **Company Accounts — ConnectDeX (AORMS-CU-)** (new —
  name, handle, created, password reset; no level/admin-role controls,
  since both are Identity-only concepts a Company Account doesn't have).
- SysDeX nav (`PortalHeaders.tsx`) gained "Studios" and "Companies"
  entries; "Accounts" relabeled "Users" to match the page's own new
  heading.

All three pages verified live through the real browser, signed in as a
temporary SUPER_ADMIN test account (created via service-role, granted
`platform_staff`, deleted after): `/admin/studios` showed the real "Demo
Architecture Studio" (AORMS-S-R0QV, Bengaluru, 1 member, TRIAL) linking
correctly; `/admin/companies` showed "Demo Materials Co" (AORMS-C-QYQY,
ACTIVE, PRO tier, 1 member) linking correctly; `/admin/accounts` showed
both headed sections, the Users table's level/admin-role controls working
exactly as before (including correctly disabling the signed-in admin's
own row), and the new Company Accounts section showing the one real
Company Account with its own password-reset button. `tsc --noEmit`,
`eslint .`, and a full `next build --webpack` all clean.

### 9.3 Three regressions found by proactive testing, not by a user report

"Take autopilot mode... any challenge, move per your recommendations,
document everything" was read as license to actually test the schema-
split work from §§ 7–8 systematically, not just the new pages — and doing
so surfaced three real, live bugs, all introduced by earlier migrations
this same day, all fixed and verified before moving on. **Same-mistake
pattern across two of them, worth naming plainly**: `CREATE OR REPLACE
FUNCTION` does **not** replace a function with a different argument
*count* — Postgres treats that as a new overload, leaving the old one
live and ambiguous for every shorter-arg-list caller. This exact mistake
was made once already this session (`new_public_id`, migration 0025, §
8) and documented as a lesson — then made again in migration 0026 before
this section's own testing caught it. Both instances are now fixed with
an explicit `DROP FUNCTION` before the replacement, in the migration
files themselves, not just hand-patched live.

1. **`platform_activity_log.account_id`'s hard FK to `accounts(id)`
   broke every real ConnectDeX payment** (order creation, capture,
   failure) — migration 0024 repointed `connectdex_payments.account_id`
   to `connectdex.company_accounts`, but never checked that
   `log_connectdex_payment_insert`/`_update` pass that same id into
   `log_platform_activity()`'s `p_account_id`, which inserts into a
   column FK'd to `accounts` only. The one pre-existing grandfathered
   identity (present in both tables) masked this in a first test; a
   genuinely fresh company-only identity (the normal case for every real
   future ConnectDeX Partner) reproduced
   `platform_activity_log_account_id_fkey` and aborted the whole
   transaction. **Fix** (`platform/supabase/migrations/
   0026_activity_log_company_account_fk_fix.sql`): a new nullable
   `company_account_id` column, extending the table's own existing
   "one nullable FK column per actor/context" pattern (it already had
   separate `studio_id`/`company_id` columns, not one polymorphic
   column) rather than inventing a new convention; `log_platform_
   activity()` gains a trailing `p_company_account_id` parameter;
   `log_connectdex_payment_insert`/`_update` pass their Company actor
   through it instead of the accounts-only parameter. **The overload
   mistake described above happened while writing this exact migration**
   — caught by this section's own live verification step (a fresh
   company-only signup broke with "function ... is not unique" before
   the `DROP FUNCTION` fix), not shipped broken.
2. **`password_reset_requests.account_id`'s hard FK would have broken
   admin-triggered password reset for any Company Account** — found
   proactively while building § 9.2's new Company Accounts section
   (before shipping its "Send password reset" button, not after).
   **Fix** (`platform/supabase/migrations/
   0027_password_reset_company_accounts.sql`): `account_id` made
   nullable, a sibling `company_account_id` column added, a check
   constraint requires exactly one of the two (never both, never
   neither — every reset request has exactly one real target).
   `adminTriggerPasswordReset` (`web/lib/actions/admin-accounts.ts`)
   takes a new `accountKind` parameter; `SendPasswordResetButton`
   passes it through.
3. **`support_tickets.account_id`'s hard FK would break the *public*
   HelpDeX form (`/support`) for any signed-in Company user** — found by
   a proactive sweep of every remaining FK to `accounts(id)` platform-
   wide (13 total) after finding the first two by narrower, targeted
   testing; this one wasn't a code path either of the first two
   incidents would have exercised. `submitSupportTicket` attaches
   whatever platform session happens to be active when the public form
   is submitted — a signed-in Company user hitting `/support` would
   violate the FK and lose their ticket entirely. **Fix**
   (`platform/supabase/migrations/
   0028_support_tickets_company_account_fk_fix.sql`): same "at most one
   of two nullable actor columns" shape as #2, except *neither* being
   set is legitimate here (an anonymous, not-signed-in submitter) — a
   `<= 1` check, not `= 1`. Also added the RLS policy this table was
   missing for the new column (`"support_tickets: company submitter
   read own"`) — the pre-existing "submitter read own" policy only ever
   checked `account_id`, so a Company-submitted ticket would have
   inserted fine after the FK fix but been invisible to its own
   submitter afterward; caught by insisting on a full RLS read-back
   test, not just an insert-succeeds test. `web/lib/actions/support.ts`
   now resolves which table the session id actually belongs to (checks
   both) rather than assuming, since a support request predates any
   context about which kind of account is asking.

**The remaining 10 of 13 `accounts`-referencing FKs platform-wide were
individually checked and confirmed safe by design, not skipped**:
`studios.owner_id`, `studio_memberships.account_id`, `payments.
account_id`, `identity_licences.account_id`, `identity_payments.
account_id` (all genuinely Identity-only concepts — Studio ownership/
membership, Studio licence payments, and identity verification/its
payment don't have a Company-side equivalent to confuse them with);
`connectdex.companies.verified_by_id`, `connectdex.connectdex_
applications.reviewed_by_id`, `support_tickets.resolved_by_id`,
`password_reset_requests.triggered_by_id` (all admin-only by
construction — every real admin is an Identity account with a
`platform_staff` grant, never a Company Account); and `usage_heartbeats.
account_id` (`recordHeartbeat` in `lib/actions/platform.ts` resolves
strictly via the Office Hub's own `profiles.platform_public_id` link,
which a Company Account — no relationship to any Office Hub deployment —
can never have populated; confirmed by re-reading the actual resolution
code, not assumed from the table name).

**Verified live for all three fixes**, `aorms-platform`, before moving
on from each: a genuinely fresh company-only identity (created via
service-role, no grandfathered dual-table exception) exercising the
exact broken path first (confirmed the FK violation was real, not
theoretical), then the same path again after the fix (confirmed clean);
for #3, additionally signed in as that identity with the anon key and
confirmed RLS actually lets them read their own submitted ticket back,
not just that the insert succeeds. All temp identities and rows deleted
afterward. `tsc --noEmit`, `eslint .`, and a full `next build --webpack`
clean after every fix.

**Files touched this section**: `platform/supabase/migrations/
0026_activity_log_company_account_fk_fix.sql` (new),
`0027_password_reset_company_accounts.sql` (new),
`0028_support_tickets_company_account_fk_fix.sql` (new),
`web/app/(platform)/admin/studios/page.tsx` (new),
`web/app/(platform)/admin/companies/page.tsx` (new),
`web/app/(platform)/admin/accounts/page.tsx`,
`web/components/aorms/platform/PortalHeaders.tsx`,
`web/components/aorms/platform/SendPasswordResetButton.tsx`,
`web/lib/actions/admin-accounts.ts`, `web/lib/actions/support.ts`.
