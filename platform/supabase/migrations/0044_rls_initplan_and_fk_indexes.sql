-- Platform audit P3 (docs/esti/PLATFORMS-AUDIT-2026-10-01.md) — Supabase performance
-- advisor findings on `aorms-platform`. APPLIED 2026-10-01; verified afterwards:
-- 71 policies before and after, 0 policies with an unwrapped auth.uid().
--
-- 1. auth_rls_initplan (25 policies): `auth.uid()` inside a policy is re-evaluated per
--    row; wrapping it as `(select auth.uid())` makes Postgres evaluate it once per
--    query. Rewritten programmatically from pg_policies (semantics unchanged); a
--    dry-run in a rolled-back transaction rewrote exactly the 25 flagged policies.
-- 2. unindexed_foreign_keys: indexes for the FKs that user/studio/company/account
--    lookups and the admin pages actually join on. Vault `*_secret_id` FKs were
--    deliberately left unindexed (never queried by that column).
-- 3. platform_activity_log(created_at desc) for the paged SysDeX Logs view.
-- NOT done here: multiple_permissive_policies (113) — merging policies changes
-- access semantics and needs a per-table review, tracked in ROADMAP.md.
do $$
declare r record; q text; w text; stmt text;
begin
  for r in select * from pg_policies where schemaname in ('public','connectdex')
    and ((coalesce(qual,'') ~* '(?<!select )auth\.uid\(\)') or (coalesce(with_check,'') ~* '(?<!select )auth\.uid\(\)'))
  loop
    q := regexp_replace(coalesce(r.qual,''), '(?<!select )auth\.uid\(\)', '(select auth.uid())', 'gi');
    w := regexp_replace(coalesce(r.with_check,''), '(?<!select )auth\.uid\(\)', '(select auth.uid())', 'gi');
    stmt := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    if r.qual is not null then stmt := stmt || ' using (' || q || ')'; end if;
    if r.with_check is not null then stmt := stmt || ' with check (' || w || ')'; end if;
    execute stmt;
  end loop;
end $$;

create index if not exists companies_owner_id_idx on connectdex.companies (owner_id);
create index if not exists companies_verified_by_id_idx on connectdex.companies (verified_by_id);
create index if not exists company_board_members_company_id_idx on connectdex.company_board_members (company_id);
create index if not exists company_contacts_company_id_idx on connectdex.company_contacts (company_id);
create index if not exists connectdex_applications_invited_account_id_idx on connectdex.connectdex_applications (invited_account_id);
create index if not exists connectdex_applications_reviewed_by_id_idx on connectdex.connectdex_applications (reviewed_by_id);
create index if not exists connectdex_payments_account_id_idx on connectdex.connectdex_payments (account_id);
create index if not exists connectdex_payments_company_id_idx on connectdex.connectdex_payments (company_id);
create index if not exists ai_model_connector_access_account_id_idx on public.ai_model_connector_access (account_id);
create index if not exists ai_model_connector_access_studio_id_idx on public.ai_model_connector_access (studio_id);
create index if not exists identity_payments_account_id_idx on public.identity_payments (account_id);
create index if not exists password_reset_requests_account_id_idx on public.password_reset_requests (account_id);
create index if not exists password_reset_requests_company_account_id_idx on public.password_reset_requests (company_account_id);
create index if not exists password_reset_requests_triggered_by_id_idx on public.password_reset_requests (triggered_by_id);
create index if not exists payments_account_id_idx on public.payments (account_id);
create index if not exists payments_studio_id_idx on public.payments (studio_id);
create index if not exists platform_activity_log_account_id_idx on public.platform_activity_log (account_id);
create index if not exists platform_activity_log_company_account_id_idx on public.platform_activity_log (company_account_id);
create index if not exists platform_activity_log_company_id_idx on public.platform_activity_log (company_id);
create index if not exists platform_activity_log_studio_id_idx on public.platform_activity_log (studio_id);
create index if not exists platform_activity_log_created_at_idx on public.platform_activity_log (created_at desc);
create index if not exists studios_owner_id_idx on public.studios (owner_id);
create index if not exists support_tickets_account_id_idx on public.support_tickets (account_id);
create index if not exists support_tickets_company_account_id_idx on public.support_tickets (company_account_id);
create index if not exists support_tickets_resolved_by_id_idx on public.support_tickets (resolved_by_id);
create index if not exists usage_heartbeats_account_id_idx on public.usage_heartbeats (account_id);
