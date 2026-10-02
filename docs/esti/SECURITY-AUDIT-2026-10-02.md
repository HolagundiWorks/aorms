# Security audit — all portals (2026-10-02)

**Scope:** `web/` (Office Hub, Identity, ConnectDeX, SysDeX, Client / Contractor /
Collaborator portals, public pages, 21 API routes, 40+ Server Action modules) and both live
Supabase projects (`aorms-web`, `aorms-platform`).
**Method:** code review + targeted greps (auth gates, redirects, SSRF, injection, uploads,
tokens), the Supabase security advisors on both projects, live inspection of RLS policies,
grants, buckets and function definitions, `npm audit`, and unit tests for each fix.
**Not done:** no live penetration test, no authenticated click-through of the portals (no
credentials in this environment), no review of the Android app, and no check of Hostinger's
own configuration. Findings below are from reading code/DB, not from exploiting them.

## Findings fixed (this pass)

| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| F1 | **High** | **Cross-tenant leak: `ai_devices`** had no `firm_id` and its RLS only checked `is_office_staff()` — staff of any firm could list and delete every firm's AI devices (incl. `device_secret_hash`). | Added `firm_id` (default `current_firm_id()`, backfilled), firm-scoped all 3 policies (web 0093). I then swept every `public` table: all others carry `firm_id` (or scope via a parent) and every policy references it. |
| F2 | **High** | **Google Drive OAuth login-CSRF.** `state` was unsigned base64 JSON; its `nonce` was never verified. An attacker could finish OAuth with their own Google account and send a victim a callback link — the victim's session matched the embedded account id, so the victim's Studio got linked to the attacker's Drive. Callback redirects also used the internal `:3000` origin. | `state` is now HMAC-signed, expires in 15 min, and its nonce must match an httpOnly cookie set only in the initiating browser; redirects use the public site URL; RPC errors no longer echoed. 4 tests. |
| F3 | **High (latent)** | **Session-minting helpers were Server Actions.** `bridgeIdentityToOfficeHub` / `bridgeOfficeHubToIdentity` (create accounts, `email_confirm`, mint a session for an arbitrary email via the service role) were exported from `"use server"` files — every export of such a file is a network-callable endpoint. Next.js usually prunes unreferenced actions and ids are unguessable, so exploitability was low, but it is the one mistake that turns into account takeover. | Moved (with `resolveSignInDestination`, `signOutSafely`) to `lib/auth/bridge.ts`, a plain module. A structural test now fails CI if any `"use server"` file exports them. |
| F4 | Medium | **Invites didn't join the inviter's firm.** `inviteStaffMember` / contractor / consultant invites left `profiles.firm_id` NULL after the multi-tenancy migrations (2 of 5 live profiles had NULL). Functionally broken and un-scoped. | Invites now set `firm_id` to the inviting OWNER's firm and record the membership. |
| F5 | Medium | **CSV/formula injection** in every export (a client named `=HYPERLINK(...)` executes in Excel). | `escapeFormulae: true`; test. |
| F6 | Medium | **`xlsx` 0.18.5** — 2 high CVEs (prototype pollution, ReDoS), parses user-uploaded bank statements; no npm fix. | Switched to SheetJS 0.20.3 (CDN tarball, CVEs fixed); `npm audit --omit=dev` → 0; parser tests. |
| F7 | Medium | **`anon` could EXECUTE 17 SECURITY DEFINER functions on `aorms-web`** and the 3 secret-handling RPCs (`get_tenant_db_secret`, Drive/WhatsApp token store) on `aorms-platform`. Each checks the caller internally, so anon calls failed — but unauthenticated callers should not reach them. | Revoked from PUBLIC/anon, `authenticated` unchanged; verified with `has_function_privilege`. Default privileges also revoke for future functions. RLS helper predicates deliberately untouched. |
| F8 | Low | Cron bearer secrets compared with `!==` (timing); raw DB error text returned by 8 API routes; 12 functions with mutable `search_path`; no outbound-URL guard on admin AI-connector URLs (SSRF); storage buckets without size/type limits; AI-connector creation not in the staff audit trail. | Constant-time `bearerMatches`; `toSafeErrorMessage`; `search_path` pinned; `validateOutboundUrl` (blocks metadata/link-local, non-http, embedded credentials) + test; bucket limits; `logStaffAction`. |

## Verified already sound (no change)
Open-redirect guard on both auth callbacks (`safeNextPath`) · constant-time Razorpay HMAC and
replay protection · `profiles` UPDATE only by the firm OWNER within their firm (no
self-promotion) · every table has RLS (0 without, 114 on web) · private buckets with no
storage policies (signed URLs only) and magic-byte upload checks · security headers (HSTS,
X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, CSP with
`frame-ancestors 'none'`) · Turnstile + shared rate limiting on sign-in/up/reset · 24-hour
absolute session cap · every exported `admin*` Server Action gated (test) · mobile/pulse/
cron/calendar/feasibility endpoints authenticate via bearer/token and use RLS or scoped
service-role reads · Server Actions use Next's built-in Origin check (CSRF).

## Open — needs a decision or a dashboard setting (not fixed here)
1. **Leaked-password protection is OFF on both Supabase projects** (advisor
   `auth_leaked_password_protection`). Enable in Auth → Providers → Email (needs the Pro plan).
2. **CSP still allows `'unsafe-inline'` scripts** (Next's inline bootstrap). A nonce-based CSP
   via middleware is the real fix — a larger change that needs browser testing.
3. **Supabase auth cookies are not HttpOnly** (required by `@supabase/ssr`'s browser client).
   Together with (2) this makes any XSS a session-theft bug; the app has no
   `dangerouslySetInnerHTML` on user content (blog renders repo-owned markdown only).
4. **AI-connector API keys are stored in plaintext** (`ai_model_connectors.api_key`, platform
   project; readable only by service role / platform admins). Move to Supabase Vault like the
   Drive/WhatsApp/tenant secrets.
5. **Duplicate SELECT policy** `ai_devices: firm read` (identical to `staff read`) — harmless;
   drop when convenient (the MCP held the DROP for confirmation).
6. Apply-time note: invites for an email that already has an account elsewhere still fail at
   Supabase (`email exists`); adding an existing user to a second firm needs the
   `join_firm` / membership flow, not an invite.
7. Still recommended from the platforms audit: staff MFA enforcement (`STAFF_MFA_REQUIRED`),
   real Razorpay test payment, 113 `multiple_permissive_policies` review.
