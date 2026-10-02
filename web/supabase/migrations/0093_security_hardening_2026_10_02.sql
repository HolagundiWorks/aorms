-- Security audit 2026-10-02 (docs/esti/SECURITY-AUDIT-2026-10-02.md). APPLIED live to
-- `aorms-web` the same day. Four independent hardening changes:
--
-- 1. SECURITY DEFINER functions were executable by `anon` (Supabase's default grants).
--    Each checks the caller internally and so failed for anon anyway, but an
--    unauthenticated caller should not reach them at all. Revoked from PUBLIC/anon;
--    `authenticated` keeps EXECUTE (portal + staff flows call them with a session).
--    The RLS helper predicates (current_app_role, current_firm_id, has_capability,
--    is_office_staff) are deliberately left alone — policies evaluate them for every role.
-- 2. Nine functions had a mutable search_path; pinned to `public, pg_temp`.
-- 3. Storage bucket limits (defence in depth — the upload code already enforces size,
--    type and magic bytes): receipts 10MB images/PDF, covers 5MB images, reconcile 10MB.
-- 4. CROSS-TENANT LEAK: `ai_devices` had no firm_id, and its policies only checked
--    is_office_staff(), so staff of ANY firm could list and delete every firm's AI
--    devices (incl. device_secret_hash). Added firm_id (default current_firm_id(),
--    backfilled), and scoped all three policies. NOTE: a duplicate SELECT policy
--    "ai_devices: firm read" exists live from a retried apply (the MCP blocked the
--    DROP awaiting confirmation); it is identical to "staff read" and harmless —
--    drop it when convenient.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('acknowledge_transmittal','emit_event','ensure_default_accounts','ensure_my_calendar_feed_token','join_firm','mark_event_processed','next_ref','respond_to_approval','respond_to_decision','rotate_my_calendar_feed_token','settle_reconcile_batch','switch_active_firm','update_my_full_name','provision_firm','store_drive_refresh_token')
  loop
    execute format('revoke execute on function %s from public, anon', r.sig);
  end loop;
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('financial_year','shape_for_unit','measurement_quantity','assert_estimate_editable','recompute_estimate_item_from_measurements','recompute_estimate_item_amount','assert_cost_approve_for_certify','touch_ai_devices_updated_at','search_esti_embeddings')
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;
end $$;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;

update storage.buckets set file_size_limit = 10485760, allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf'] where id = 'esti-receipts';
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'] where id = 'project-covers';
update storage.buckets set file_size_limit = 10485760 where id = 'esti-reconcile';

alter table public.ai_devices add column if not exists firm_id uuid references public.firms (id) on delete cascade default public.current_firm_id();
update public.ai_devices set firm_id = (select id from public.firms order by created_at limit 1) where firm_id is null;
alter table public.ai_devices alter column firm_id set not null;
create index if not exists ai_devices_firm_id_idx on public.ai_devices (firm_id);
alter policy "ai_devices: staff read" on public.ai_devices using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "ai_devices: staff delete" on public.ai_devices using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "ai_devices: staff insert" on public.ai_devices with check (public.is_office_staff() and firm_id = public.current_firm_id());
