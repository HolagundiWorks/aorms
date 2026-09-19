-- Tenant database registry (2026-09-19) — first step of the database-per-
-- tenant pivot: each Studio's AORMS Office Hub business data (clients,
-- projects, tasks, invoices, etc. — the ~98 tables in web/supabase/
-- migrations/) is meant to move into its own dedicated database, one per
-- firm/company. Identity, licensing (sysdex), support (helpdex), and
-- platform admin/activity data all stay here in aorms-platform, unchanged.
--
-- This migration only adds the REGISTRY — where a Studio's tenant
-- database lives and how to reach it. It does not move any data and does
-- not change how the web app resolves its Supabase connection yet; see
-- docs/esti/DATABASE-PER-TENANT-ARCHITECTURE.md for the staged rollout
-- plan and why flipping live connection routing is a separate, later step.
--
-- Connection secrets (anon/service-role keys or a raw Postgres password)
-- are never stored in plaintext — every secret column is a
-- vault.secrets.id; only get_tenant_db_secret() can read the decrypted
-- value, and only for the studio's own OWNER or platform staff.

create table public.tenant_databases (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id),
  provider text not null default 'supabase' check (provider in ('supabase', 'self_hosted_postgres')),
  status text not null default 'PENDING' check (status in ('PENDING', 'PROVISIONING', 'READY', 'ERROR')),
  api_url text,                     -- e.g. https://<ref>.supabase.co, or a self-hosted PostgREST URL
  db_host text,                     -- raw Postgres host, for the migration runner
  db_port integer not null default 5432,
  db_name text not null default 'postgres',
  anon_key_secret_id uuid references vault.secrets(id),
  service_role_key_secret_id uuid references vault.secrets(id),
  db_password_secret_id uuid references vault.secrets(id),
  schema_version text,              -- highest web/supabase/migrations/*.sql file applied, e.g. '0068'
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studio_id)
);

create index tenant_databases_studio_id_idx on public.tenant_databases (studio_id);

alter table public.tenant_databases enable row level security;

create policy "tenant_databases: owner/staff read metadata"
  on public.tenant_databases for select
  using (is_studio_owner(studio_id) or is_platform_admin());

create policy "tenant_databases: staff write"
  on public.tenant_databases for all
  using (is_platform_admin())
  with check (is_platform_admin());

create function public.set_tenant_databases_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tenant_databases_set_updated_at
  before update on public.tenant_databases
  for each row execute function public.set_tenant_databases_updated_at();

-- Decrypted secret access — gated the same way the row itself is (studio's
-- own OWNER, or platform staff), never exposed to a plain member. Callers
-- outside RLS (service-role provisioning scripts) don't need this function
-- at all — they can read vault.decrypted_secrets directly.
create function public.get_tenant_db_secret(p_studio_id uuid, p_secret_kind text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_value text;
begin
  if not (public.is_studio_owner(p_studio_id) or public.is_platform_admin()) then
    raise exception 'not authorized';
  end if;

  select case p_secret_kind
    when 'anon_key' then anon_key_secret_id
    when 'service_role_key' then service_role_key_secret_id
    when 'db_password' then db_password_secret_id
    else null
  end into v_secret_id
  from public.tenant_databases
  where studio_id = p_studio_id;

  if v_secret_id is null then
    return null;
  end if;

  select decrypted_secret into v_value from vault.decrypted_secrets where id = v_secret_id;
  return v_value;
end;
$$;
