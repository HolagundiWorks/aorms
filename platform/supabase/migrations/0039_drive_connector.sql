-- Google Drive connector, relocated (originally 2026-09-20 as
-- web/supabase/migrations/0073_google_drive_connector.sql, firm_id-keyed
-- on aorms-web — corrected same-day per explicit direction: WhatsApp/
-- Drive/AI-agent/DB connector configuration all belong on the identity
-- platform, studio_id-keyed, same as tenant_databases (0034) and
-- whatsapp_connections (0038), not on the Office Hub. Only the
-- CONNECTION (the refresh token + which Google account) moves here —
-- `public.documents` (file metadata: which project, which document type,
-- which revision) stays on aorms-web, genuinely project-scoped business
-- data, unlike the credential itself.
--
-- One Drive connection per Studio — a refresh token, always via
-- vault.secrets, same pattern platform.tenant_databases already uses for
-- connection secrets. get_drive_refresh_token() is the one sanctioned way
-- to read it back, service-role only (for whatever job later syncs a
-- firm's documents against its Studio's Drive) — never exposed to a
-- plain member or even the studio owner directly, same as
-- get_whatsapp_access_token().

create table public.drive_connections (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id),
  google_account_email text,
  refresh_token_secret_id uuid references vault.secrets(id),
  connected_by uuid references public.accounts(id),
  status text not null default 'CONNECTED' check (status in ('CONNECTED', 'DISCONNECTED', 'ERROR')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studio_id)
);

alter table public.drive_connections enable row level security;

create policy "drive_connections: owner/staff read"
  on public.drive_connections for select
  using (is_studio_owner(studio_id) or is_platform_admin());

create policy "drive_connections: owner/staff write"
  on public.drive_connections for all
  using (is_studio_owner(studio_id) or is_platform_admin())
  with check (is_studio_owner(studio_id) or is_platform_admin());

create function public.set_drive_connections_updated_at()
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

create trigger drive_connections_set_updated_at
  before update on public.drive_connections
  for each row execute function public.set_drive_connections_updated_at();

revoke execute on function public.set_drive_connections_updated_at() from public, anon, authenticated;

-- Written by the OAuth callback via the connecting owner's own session
-- client (RLS-checked through is_studio_owner, not a service-role
-- bypass) — same secure pattern the original web/lib/drive oauth
-- callback already established, just re-targeted at this project.
create function public.store_drive_connection(
  p_studio_id uuid,
  p_refresh_token text,
  p_google_account_email text
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

  select vault.create_secret(p_refresh_token, 'drive-refresh-token-' || p_studio_id::text) into v_secret_id;

  insert into public.drive_connections (studio_id, google_account_email, refresh_token_secret_id, connected_by, status)
  values (p_studio_id, p_google_account_email, v_secret_id, auth.uid(), 'CONNECTED')
  on conflict (studio_id) do update set
    google_account_email = excluded.google_account_email,
    refresh_token_secret_id = excluded.refresh_token_secret_id,
    connected_by = excluded.connected_by,
    status = 'CONNECTED',
    error_message = null;
end;
$$;

revoke execute on function public.store_drive_connection(uuid, text, text) from public, anon;
grant execute on function public.store_drive_connection(uuid, text, text) to authenticated, service_role;

create function public.get_drive_refresh_token(p_studio_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_value text;
begin
  select refresh_token_secret_id into v_secret_id from public.drive_connections where studio_id = p_studio_id;
  if v_secret_id is null then
    return null;
  end if;
  select decrypted_secret into v_value from vault.decrypted_secrets where id = v_secret_id;
  return v_value;
end;
$$;

revoke execute on function public.get_drive_refresh_token(uuid) from public, anon, authenticated;
grant execute on function public.get_drive_refresh_token(uuid) to service_role;
