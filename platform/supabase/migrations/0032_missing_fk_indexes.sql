-- 2026-09-14 — performance audit companion to web/supabase's
-- 0050_missing_fk_indexes.sql. `studio_memberships` and
-- `company_memberships` each only have a composite unique index leading
-- on `account_id` (confirmed live: `memberships_account_id_company_id_key`
-- on `(account_id, studio_id)`, `company_memberships_account_id_company_id_key`
-- on `(account_id, company_id)`) — that serves an account-scoped lookup
-- fine, but not a studio/company-only filter, which is exactly what
-- `is_studio_owner()`/`is_company_owner()` (used inside RLS policies on
-- nearly every studio/company-scoped table) and
-- `web/app/(platform)/companies/[companyId]/page.tsx`'s own
-- `.eq("company_id", companyId)` do.
create index if not exists studio_memberships_studio_id_idx on public.studio_memberships (studio_id);
create index if not exists company_memberships_company_id_idx on connectdex.company_memberships (company_id);
