-- Round 3 — 0038 only revoked PUBLIC for its 21 functions, copying
-- 0037's pattern. Re-verifying live via pg_proc.proacl afterward (not
-- just information_schema.routine_privileges, which conflates the two
-- grant paths) showed all 21 still carry a *separate*, direct
-- `anon=X/postgres,authenticated=X/postgres` grant that 0038's PUBLIC
-- revoke didn't touch — Supabase grants EXECUTE to anon/authenticated
-- directly on function creation (its own default-privileges setup for
-- the public schema), independent of the Postgres PUBLIC-pseudo-role
-- default. Closing only one path isn't enough; both must be revoked —
-- confirmed by set_tenant_databases_updated_at's own history: 0036
-- revoked anon/authenticated, 0037 revoked PUBLIC, and only the
-- combination of both now shows a clean
-- `{postgres=X/postgres,service_role=X/postgres}` ACL with neither path
-- present.
--
-- Re-verified live afterward: pg_proc.proacl for all 21 functions now
-- reads `{postgres=X/postgres,service_role=X/postgres}` — no PUBLIC, no
-- anon, no authenticated — and a real accounts insert still correctly
-- fires its full trigger chain (handle_new_platform_account ->
-- log_account_created, etc.) afterward (trigger invocation runs as the
-- function owner, unaffected by caller-facing EXECUTE grants).
revoke execute on function public.apply_heartbeat() from anon, authenticated;
revoke execute on function public.enforce_studio_membership_update_invariants() from anon, authenticated;
revoke execute on function public.handle_new_account_identity_licence() from anon, authenticated;
revoke execute on function public.handle_new_platform_account() from anon, authenticated;
revoke execute on function public.handle_new_studio() from anon, authenticated;
revoke execute on function public.handle_new_studio_licence() from anon, authenticated;
revoke execute on function public.handle_new_studio_owner_membership() from anon, authenticated;
revoke execute on function public.log_account_created() from anon, authenticated;
revoke execute on function public.log_identity_licence_update() from anon, authenticated;
revoke execute on function public.log_identity_payment_insert() from anon, authenticated;
revoke execute on function public.log_identity_payment_update() from anon, authenticated;
revoke execute on function public.log_licence_update() from anon, authenticated;
revoke execute on function public.log_password_reset_insert() from anon, authenticated;
revoke execute on function public.log_payment_insert() from anon, authenticated;
revoke execute on function public.log_payment_update() from anon, authenticated;
revoke execute on function public.log_studio_created() from anon, authenticated;
revoke execute on function public.log_studio_membership_insert() from anon, authenticated;
revoke execute on function public.log_studio_membership_update() from anon, authenticated;
revoke execute on function public.log_support_ticket_insert() from anon, authenticated;
revoke execute on function public.log_support_ticket_update() from anon, authenticated;
revoke execute on function public.log_platform_activity(text, uuid, uuid, jsonb, uuid, uuid) from anon, authenticated;
