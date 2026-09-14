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
5. **Deliberately not done** — dropping `accounts.is_admin`/`admin_role`
   stays a follow-up, done only once this phase has run live for a
   while with no read path found still depending on the legacy columns.

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

---

## 6. Files touched this pass

- `platform/supabase/migrations/0021_trial_zero_pro_seats.sql` (new)
- `web/lib/actions/platform.ts` — `adminSetAccountLevel`,
  `adminSetAccountRole`, `requireSuperAdmin`
- `web/lib/actions/platform-payments.ts` — seat validation `>= 0`
- `web/components/aorms/platform/UpdateLicenceForm.tsx` — seats input
  `min={0}`
- `web/components/aorms/platform/AccountAdminControls.tsx` (new)
- `web/app/(platform)/admin/accounts/page.tsx` — wired in the new
  controls, merged the Level/Admin columns
