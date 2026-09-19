-- 0034_tenant_databases.sql's set_tenant_databases_updated_at() was
-- created without `set search_path = ''`, unlike every other function
-- this session has written — caught by the security advisor sweep
-- (2026-09-20). Low practical risk here (the function body references no
-- unqualified table/function names), but fixing it for consistency with
-- the established pattern rather than leaving an inconsistent exception.
-- Confirmed the trigger still fires correctly afterward via a real
-- insert/update/delete round trip.
create or replace function public.set_tenant_databases_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.set_tenant_databases_updated_at() from anon, authenticated;
