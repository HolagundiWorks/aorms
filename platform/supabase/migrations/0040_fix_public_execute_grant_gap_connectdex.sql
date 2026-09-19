-- 0038/0039 only swept the `public` schema. A schema inventory afterward
-- (pg_namespace joined to pg_proc, counting prosecdef per schema) found
-- a second exposed schema this audit had missed entirely: `connectdex`
-- (split out from `public` by 0025_connectdex_schema_split.sql), with 9
-- of its own SECURITY DEFINER functions — confirmed reachable via
-- PostgREST by Supabase's own advisor sweep
-- (`/rest/v1/rpc/handle_new_company` etc. under the `anon_security_
-- definer_function_executable` / `authenticated_security_definer_
-- function_executable` lints), not just a theoretical schema.
--
-- 8 are trigger-only (`returns trigger`, each with a live pg_trigger row
-- naming it): enforce_company_membership_update_invariants,
-- handle_new_company, handle_new_company_owner_membership,
-- log_company_status_update, log_connectdex_application_insert,
-- log_connectdex_application_update, log_connectdex_payment_insert,
-- log_connectdex_payment_update. Same category as every trigger function
-- fixed in 0038/0039 — never a direct-RPC target.
--
-- Revoking from public, anon, and authenticated together in one
-- statement this time (not staged across two migrations like 0038/0039
-- had to be) — both grant paths (the Postgres PUBLIC-pseudo-role default
-- and Supabase's own direct anon/authenticated default-privileges grant)
-- need closing, confirmed by 0038/0039's own live re-verification.
--
-- `connectdex.is_company_owner(uuid)` reviewed and left untouched — a
-- read-only, self-scoped helper (same category as public.is_studio_owner/
-- public.is_platform_admin), safe regardless of PUBLIC grant.
--
-- Re-verified live afterward: pg_proc.proacl for all 8 now reads
-- `{postgres=X/postgres,service_role=X/postgres}` — no PUBLIC, no anon,
-- no authenticated — and a real connectdex.company_applications insert
-- (via a real company_accounts + application row) still correctly fires
-- its trigger chain afterward (trigger invocation runs as the function
-- owner, unaffected by caller-facing EXECUTE grants).
revoke execute on function connectdex.enforce_company_membership_update_invariants() from public, anon, authenticated;
revoke execute on function connectdex.handle_new_company() from public, anon, authenticated;
revoke execute on function connectdex.handle_new_company_owner_membership() from public, anon, authenticated;
revoke execute on function connectdex.log_company_status_update() from public, anon, authenticated;
revoke execute on function connectdex.log_connectdex_application_insert() from public, anon, authenticated;
revoke execute on function connectdex.log_connectdex_application_update() from public, anon, authenticated;
revoke execute on function connectdex.log_connectdex_payment_insert() from public, anon, authenticated;
revoke execute on function connectdex.log_connectdex_payment_update() from public, anon, authenticated;
