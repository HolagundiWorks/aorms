-- Google Drive document layer (2026-09-20, phase 7 of docs/esti/
-- LIGHTWEIGHT-ARCHITECTURE-PLAN.md) — AORMS stores structured metadata
-- only: where a file lives, what project it belongs to, its type/
-- revision/status. The actual file bytes stay in the firm's own Google
-- Drive, never uploaded through AORMS's own storage.
--
-- One Drive connection per firm (drive_connections) — a refresh token,
-- always via vault.secrets, same pattern platform.tenant_databases
-- already uses for connection secrets. get_drive_refresh_token() is the
-- one sanctioned way to read it back, gated to staff with write access
-- (the same tier that can reconnect/disconnect Drive), never exposed to
-- a plain member.

create table public.drive_connections (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) default public.current_firm_id(),
  google_account_email text,
  refresh_token_secret_id uuid references vault.secrets(id),
  connected_by uuid references public.profiles(id),
  status text not null default 'CONNECTED' check (status in ('CONNECTED', 'DISCONNECTED', 'ERROR')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id)
);

alter table public.drive_connections enable row level security;

create policy "drive_connections: staff read"
  on public.drive_connections for select
  using (is_office_staff() and firm_id = current_firm_id());

create policy "drive_connections: write capability"
  on public.drive_connections for all
  using (has_capability('write') and firm_id = current_firm_id())
  with check (has_capability('write') and firm_id = current_firm_id());

create function public.set_updated_at_generic()
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
  for each row execute function public.set_updated_at_generic();

revoke execute on function public.set_updated_at_generic() from public;

create function public.get_drive_refresh_token(p_firm_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_value text;
begin
  if not (has_capability('write') and p_firm_id = current_firm_id()) then
    raise exception 'not authorized';
  end if;

  select refresh_token_secret_id into v_secret_id
  from public.drive_connections
  where firm_id = p_firm_id;

  if v_secret_id is null then
    return null;
  end if;

  select decrypted_secret into v_value from vault.decrypted_secrets where id = v_secret_id;
  return v_value;
end;
$$;

revoke execute on function public.get_drive_refresh_token(uuid) from public;
grant execute on function public.get_drive_refresh_token(uuid) to authenticated, service_role;

-- Metadata only — no file bytes. AORMS answers "where is the file, what
-- project, what type, what version, who uploaded it, what's happened to
-- it, what AI processing has occurred" without becoming a storage company.
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) default public.current_firm_id(),
  project_id uuid references public.project_offices(id),
  provider text not null default 'google_drive' check (provider in ('google_drive')),
  provider_file_id text not null,
  provider_folder_id text,
  name text not null,
  mime_type text,
  size_bytes bigint,
  document_type text,
  discipline text,
  revision text,
  version integer not null default 1,
  uploaded_by uuid references public.profiles(id),
  ai_indexed boolean not null default false,
  ai_processed boolean not null default false,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ARCHIVED', 'DELETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, provider, provider_file_id)
);

create index documents_firm_id_idx on public.documents (firm_id);
create index documents_project_id_idx on public.documents (project_id);

alter table public.documents enable row level security;

create policy "documents: staff read"
  on public.documents for select
  using (is_office_staff() and firm_id = current_firm_id());

create policy "documents: write capability"
  on public.documents for all
  using (has_capability('write') and firm_id = current_firm_id())
  with check (has_capability('write') and firm_id = current_firm_id());

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at_generic();
