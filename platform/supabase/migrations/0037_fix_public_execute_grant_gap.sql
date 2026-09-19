-- Same gap as aorms-web's 0072: revoking from anon/authenticated alone
-- doesn't close PUBLIC's default EXECUTE grant, which anon/authenticated
-- inherit through regardless. Target PUBLIC directly. Re-verified live:
-- only postgres/service_role retain EXECUTE afterward.
revoke execute on function public.set_tenant_databases_updated_at() from public;
