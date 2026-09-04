-- Capability-based authorization, mirroring packages/contracts/src/permissions.ts
-- `can(role, capability)` exactly (rank table, MIN_RANK table, and the two
-- explicit-allow-list roles ACCOUNTANT / HR_MANAGER / SITE_SUPERVISOR).
-- Every future migration's RLS policies should call has_capability(...)
-- rather than hand-rolling a new one-off role check.

create or replace function public.has_capability(cap text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    -- Explicit allow-list roles: only the capabilities named here, nothing
    -- from the seniority-rank table below (matches ROLE_CAPABILITIES).
    when public.current_app_role() = 'ACCOUNTANT' then
      cap in ('workspace:view', 'write', 'project:financials', 'invoice:manage',
              'invoice:delete', 'fees:manage', 'finance:ops', 'reports:view', 'cost:approve')
    when public.current_app_role() = 'HR_MANAGER' then
      cap in ('workspace:view', 'write', 'hr:manage')
    when public.current_app_role() = 'SITE_SUPERVISOR' then
      cap = 'site_portal'
    -- Everyone else: seniority rank >= the capability's minimum rank.
    else
      coalesce((case public.current_app_role()
        when 'OWNER' then 100
        when 'PARTNER' then 80
        when 'SENIOR' then 60
        when 'ASSOCIATE' then 40
        when 'VIEWER' then 20
        when 'CONSULTANT' then 40
        when 'CLIENT' then 0
        else 0
      end), 0) >= (case cap
        when 'workspace:view' then 20
        when 'site_portal' then 20
        when 'write' then 40
        when 'project:financials' then 40
        when 'invoice:manage' then 80
        when 'invoice:delete' then 80
        when 'fees:manage' then 80
        when 'finance:ops' then 80
        when 'project:delete' then 80
        when 'hr:manage' then 80
        when 'reports:view' then 80
        when 'cost:approve' then 80
        when 'firm:admin' then 100
        when 'salary:view' then 100
        when 'tenders:view' then 60
        else 999 -- unknown capability: nobody has it
      end)
  end;
$$;

comment on function public.has_capability(text) is
  'Postgres port of can(role, capability) from packages/contracts/src/permissions.ts. Keep both in sync by hand — there is no shared source of truth yet.';
