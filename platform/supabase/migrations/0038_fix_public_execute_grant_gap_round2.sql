-- Follow-up sweep to 0037's PUBLIC-execute grant fix (which only covered
-- set_tenant_databases_updated_at) — a full inventory of every SECURITY
-- DEFINER function in this project via pg_proc + pg_trigger +
-- information_schema.routine_privileges turned up 21 more still
-- PUBLIC-executable:
--
--   * 20 trigger-only functions (`returns trigger`, each with a live
--     pg_trigger row naming it — confirmed via pg_trigger.tgfoid, not
--     just inferred from the name): apply_heartbeat,
--     enforce_studio_membership_update_invariants,
--     handle_new_account_identity_licence, handle_new_platform_account,
--     handle_new_studio, handle_new_studio_licence,
--     handle_new_studio_owner_membership, log_account_created,
--     log_identity_licence_update, log_identity_payment_insert,
--     log_identity_payment_update, log_licence_update,
--     log_password_reset_insert, log_payment_insert, log_payment_update,
--     log_studio_created, log_studio_membership_insert,
--     log_studio_membership_update, log_support_ticket_insert,
--     log_support_ticket_update. Same category as 0037's
--     set_tenant_databases_updated_at — never a direct-RPC target.
--   * log_platform_activity() — not itself a trigger (`returns void`),
--     but its own migration (0012_activity_log.sql) says it's meant to
--     be called "exclusively by trigger functions ... never by
--     application code calling an insert directly," precisely so
--     platform_activity_log stays a trustworthy record of what actually
--     happened. Left PUBLIC-executable, any authenticated (or anon)
--     caller could forge arbitrary activity-log entries via
--     /rest/v1/rpc/log_platform_activity — the same class of gap as
--     reset_demo_data() in aorms-web's 0073, just for log integrity
--     instead of data mutation. Grep confirms it's never called via
--     `.rpc(...)` from application code, matching the "internal-only"
--     intent in its own comment. Function-to-function calls (every
--     trigger above calling it internally) run as the security-definer
--     owner and don't need their own EXECUTE grant, so revoking PUBLIC
--     doesn't break the logging path.
--
-- Every other SECURITY DEFINER function in this project was reviewed and
-- left untouched on purpose: is_platform_admin/is_studio_owner are
-- read-only, self-scoped helpers (safe regardless of PUBLIC grant, same
-- category as aorms-web's current_app_role/is_office_staff);
-- get_tenant_db_secret() is a genuine authenticated end-user RPC (a
-- Studio's own OWNER, or platform staff) gated by its own internal
-- `is_studio_owner(...) or is_platform_admin()` check, not a trigger or
-- service-role-only function.
--
-- (Static grep also turned up handle_new_company/is_company_owner/
-- handle_new_company_owner_membership/enforce_membership_update_
-- invariants/enforce_company_membership_update_invariants/
-- log_connectdex_application_insert/log_connectdex_application_update/
-- log_company_status_update/log_connectdex_payment_insert/
-- log_connectdex_payment_update/sync_account_is_admin from earlier
-- migrations — none of these exist in pg_proc today; later migrations
-- (the studios rename, the connectdex schema split, the legacy
-- admin-column drop) superseded or dropped them. Confirmed live via
-- pg_proc before writing this migration, not just inferred from the
-- migration file history.)
--
-- Re-verified live afterward: information_schema.routine_privileges
-- shows zero PUBLIC/anon/authenticated rows for all 21, and a real
-- accounts insert still correctly fires its full trigger chain
-- (handle_new_platform_account -> log_account_created, etc.) afterward
-- (trigger invocation isn't gated by these grants — only direct RPC
-- calls are).
revoke execute on function public.apply_heartbeat() from public;
revoke execute on function public.enforce_studio_membership_update_invariants() from public;
revoke execute on function public.handle_new_account_identity_licence() from public;
revoke execute on function public.handle_new_platform_account() from public;
revoke execute on function public.handle_new_studio() from public;
revoke execute on function public.handle_new_studio_licence() from public;
revoke execute on function public.handle_new_studio_owner_membership() from public;
revoke execute on function public.log_account_created() from public;
revoke execute on function public.log_identity_licence_update() from public;
revoke execute on function public.log_identity_payment_insert() from public;
revoke execute on function public.log_identity_payment_update() from public;
revoke execute on function public.log_licence_update() from public;
revoke execute on function public.log_password_reset_insert() from public;
revoke execute on function public.log_payment_insert() from public;
revoke execute on function public.log_payment_update() from public;
revoke execute on function public.log_studio_created() from public;
revoke execute on function public.log_studio_membership_insert() from public;
revoke execute on function public.log_studio_membership_update() from public;
revoke execute on function public.log_support_ticket_insert() from public;
revoke execute on function public.log_support_ticket_update() from public;
revoke execute on function public.log_platform_activity(text, uuid, uuid, jsonb, uuid, uuid) from public;
