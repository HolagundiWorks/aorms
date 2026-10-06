# Security audit — 2026-10-06

Scope: `web/` (Office Hub + Platform portals), both live Supabase projects (`aorms-web`,
`aorms-platform`), dependencies, API routes. Follows [SECURITY-AUDIT-2026-10-02.md](SECURITY-AUDIT-2026-10-02.md);
this pass re-checks that work and covers everything added since (saved vendors, public
profile, `admin_analytics`, `search_products`). Method: Supabase security advisors on both
projects, SQL review of every `SECURITY DEFINER` function the advisors flag, a read of every
`app/api/**` route's auth, policy inspection, `npm audit`, targeted code greps. **Not done:**
active testing against production, load/DoS testing, the Python worker, the old `backend/`.

## Fixed in this pass
| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | Medium | `public.next_ref()` and `public.emit_event()` (aorms-web) were executable by every signed-in role, including CLIENT / CONSULTANT / CONTRACTOR portal users, and only checked that the caller has a firm. A portal user could burn the firm's document-number sequences or write arbitrary rows into its event stream via `/rest/v1/rpc/...`. | Both now require `is_office_staff()`. Migration `web/supabase/migrations/0095`, applied live. Every in-repo caller is an office-staff Server Action. |
| 2 | High (dependency) | `sharp < 0.35.5` (librsvg CVE, GHSA-wq5f-xc86-pv6w). | `npm audit fix` → sharp 0.35.5 (+ matching `@img/*` binaries). `npm audit --omit=dev`: 0 vulnerabilities. |

## Open — needs a dashboard setting (cannot be done from code)
- **Leaked-password protection is off on both Supabase projects** (Auth → Password security → "Prevent use of leaked passwords"). Enable on `aorms-web` and `aorms-platform`.
- Still owed from earlier sessions: rotate the Supabase personal access token and the service-role key that were shared in chat; require the `web` check on `main`.

## Reviewed, no action
- **SECURITY DEFINER functions callable by `authenticated`** — each of `get_tenant_db_secret`, `store_drive_connection`, `store_whatsapp_connection` (platform) and `store_drive_refresh_token`, `settle_reconcile_batch`, `ensure_default_accounts`, `mark_event_processed`, `acknowledge_transmittal`, `respond_to_approval`, `respond_to_decision`, `update_my_full_name`, `switch_active_firm`, `join_firm` (web) gates on the caller's own role/ownership/firm inside the body. Reviewed definitions: all check `auth.uid()` ownership, capability or firm match.
- **Anon-callable `is_*` / `current_*` / `has_capability` helpers** — read-only booleans keyed on `auth.uid()`; they return false/null for anon. Used inside RLS, so revoking EXECUTE would break policies. Linter warning accepted.
- **RLS enabled, no policy** (`licence_reminders`, `rate_limit_buckets`, `razorpay_webhook_events`, `support_ticket_replies`, `demo_roster`) — intentional: service-role-only tables, deny-all to clients.
- **Extensions in `public`** (`vector`, `pg_net`, aorms-web) — cosmetic; moving them risks breaking dependent objects. Deferred.
- **API routes** — cron/pulse routes use constant-time bearer comparison; Razorpay webhook verifies the HMAC over the raw body; calendar/feasibility are unguessable-token routes using the service role by design; mobile routes authorise via the caller's own session (bearer client); CSV exports run on the caller's session so RLS limits them (a portal user exports only their own row); CSV export uses `escapeFormulae`; the invoice register checks role rank. No `dangerouslySetInnerHTML` except the blog renderer (trusted, build-time markdown).
- **This session's additions** — `saved_vendors` (own-rows RLS, inserts via Server Action after validating the company), `admin_analytics` (service-role-only execute, page gated on SUPER_ADMIN), `search_products` (service-role-only, LIKE-escaped input), public profile (opt-in + verified re-checked each request, handle regex-validated, `noindex`, no files or contact data rendered).

## Residual risks worth knowing
- Public profile pages expose a person's name, photo, COA number and Studio names once they opt in. That is the feature, but it is public data once on.
- Edge rate limiting: auth endpoints use the shared Postgres limiter; token routes (`/api/calendar/[token]`, `/api/feasibility/[token]`) have no per-IP limit. The tokens are 128-bit so guessing is infeasible; limiting would only cap noise.
