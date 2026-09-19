-- WhatsApp channel (originally 2026-09-20 as web/supabase/migrations/0077,
-- firm_id-keyed on aorms-web — corrected same-day per explicit direction:
-- WhatsApp/Drive/AI-agent/DB connector configuration all belong on the
-- identity platform, studio_id-keyed, same as tenant_databases (0034),
-- not on the Office Hub. The 0077 version was applied and live-verified
-- but never committed to git, then dropped from aorms-web outright — this
-- is a clean first build here, not a data migration.
--
-- "WhatsApp is a channel, not the system of record" (docs/esti/AORMS-V2-
-- DEVELOPER-GUIDELINES.md § 17-19): inbound messages become events on
-- whichever Office Hub firm the connected Studio maps to (via
-- firms.platform_studio_public_id), outbound sends go through the same
-- access-token-per-studio pattern tenant_databases already established.
-- One Meta App serves every Studio's own WhatsApp Business phone number
-- (WHATSAPP_APP_SECRET/WHATSAPP_WEBHOOK_VERIFY_TOKEN stay platform-level
-- env vars, wherever the webhook route ends up living) — this table is
-- what routes an inbound webhook (keyed by Meta's own phone_number_id)
-- back to the right Studio.

create table public.whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id),
  phone_number_id text not null unique,
  waba_id text,
  display_phone_number text,
  access_token_secret_id uuid references vault.secrets(id),
  connected_by uuid references public.accounts(id),
  status text not null default 'CONNECTED' check (status in ('CONNECTED', 'DISCONNECTED', 'ERROR')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studio_id)
);

create index whatsapp_connections_phone_number_id_idx on public.whatsapp_connections (phone_number_id);

alter table public.whatsapp_connections enable row level security;

create policy "whatsapp_connections: owner/staff read"
  on public.whatsapp_connections for select
  using (is_studio_owner(studio_id) or is_platform_admin());

create policy "whatsapp_connections: owner/staff write"
  on public.whatsapp_connections for all
  using (is_studio_owner(studio_id) or is_platform_admin())
  with check (is_studio_owner(studio_id) or is_platform_admin());

create function public.set_whatsapp_connections_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger whatsapp_connections_set_updated_at
  before update on public.whatsapp_connections
  for each row execute function public.set_whatsapp_connections_updated_at();

-- Trigger functions get the same PUBLIC-execute grant gap as everything
-- else here (Supabase grants EXECUTE to PUBLIC/anon/authenticated on
-- function creation, independent of RLS) — revoke all three, not just
-- PUBLIC, per the established 0037/web-0072/0074 methodology.
revoke execute on function public.set_whatsapp_connections_updated_at() from public, anon, authenticated;

-- Webhook path (service-role, no session — Meta calls this directly) needs
-- to resolve studio_id from phone_number_id and read the access token back
-- without a session's auth.uid(). Both gated to service_role only: a live
-- user session should never need either.

create function public.resolve_studio_by_whatsapp_phone_number_id(p_phone_number_id text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select studio_id from public.whatsapp_connections where phone_number_id = p_phone_number_id and status = 'CONNECTED';
$$;

revoke execute on function public.resolve_studio_by_whatsapp_phone_number_id(text) from public, anon, authenticated;
grant execute on function public.resolve_studio_by_whatsapp_phone_number_id(text) to service_role;

create function public.get_whatsapp_access_token(p_studio_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_value text;
begin
  select access_token_secret_id into v_secret_id from public.whatsapp_connections where studio_id = p_studio_id;
  if v_secret_id is null then
    return null;
  end if;
  select decrypted_secret into v_value from vault.decrypted_secrets where id = v_secret_id;
  return v_value;
end;
$$;

revoke execute on function public.get_whatsapp_access_token(uuid) from public, anon, authenticated;
grant execute on function public.get_whatsapp_access_token(uuid) to service_role;

create function public.store_whatsapp_connection(
  p_studio_id uuid,
  p_phone_number_id text,
  p_waba_id text,
  p_display_phone_number text,
  p_access_token text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
begin
  if not (public.is_studio_owner(p_studio_id) or public.is_platform_admin()) then
    raise exception 'not authorized';
  end if;

  select vault.create_secret(p_access_token, 'whatsapp-token-' || p_studio_id::text) into v_secret_id;

  insert into public.whatsapp_connections (studio_id, phone_number_id, waba_id, display_phone_number, access_token_secret_id, connected_by, status)
  values (p_studio_id, p_phone_number_id, p_waba_id, p_display_phone_number, v_secret_id, auth.uid(), 'CONNECTED')
  on conflict (studio_id) do update set
    phone_number_id = excluded.phone_number_id,
    waba_id = excluded.waba_id,
    display_phone_number = excluded.display_phone_number,
    access_token_secret_id = excluded.access_token_secret_id,
    connected_by = excluded.connected_by,
    status = 'CONNECTED',
    error_message = null;
end;
$$;

revoke execute on function public.store_whatsapp_connection(uuid, text, text, text, text) from public, anon;
grant execute on function public.store_whatsapp_connection(uuid, text, text, text, text) to authenticated, service_role;
