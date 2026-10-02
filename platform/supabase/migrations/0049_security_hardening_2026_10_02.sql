-- Security audit 2026-10-02 (docs/esti/SECURITY-AUDIT-2026-10-02.md). APPLIED live to
-- `aorms-platform`. The three secret-handling SECURITY DEFINER RPCs (tenant DB secret
-- read, Drive and WhatsApp token store) check owner/admin internally but were executable
-- by `anon`; revoked from PUBLIC/anon (signed-in owners keep access). Three trigger/id
-- helpers had a mutable search_path; pinned.
revoke execute on function public.get_tenant_db_secret(uuid, text) from public, anon;
revoke execute on function public.store_drive_connection(uuid, text, text) from public, anon;
revoke execute on function public.store_whatsapp_connection(uuid, text, text, text, text) from public, anon;
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('new_public_id','touch_ai_model_connectors_updated_at','set_whatsapp_connections_updated_at')
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;
end $$;
