-- Formalizes the 3 connector modes from the lightweight-architecture
-- direction (2026-09-20) — see docs/esti/EVENTS-AND-CONNECTOR-MODES.md.
-- Every Studio implicitly runs Mode A (no row here at all — the shared,
-- RLS-scoped aorms-web project, migrations 0053-0068) unless it has an
-- explicit row choosing Mode B or C. A row can also explicitly record
-- Mode A, for Settings-page visibility ("Database: AORMS Supabase,
-- Connected") rather than only inferring it from absence.
--
--   Mode A — aorms_managed:    shared aorms-web, RLS-scoped (default)
--   Mode B — customer_supabase: dedicated Supabase project, migrated via
--                                provision-tenant-db.mjs (built 2026-09-19)
--   Mode C — customer_api:      customer's own API sits in front of their
--                                own database; AORMS never talks Postgres
--                                to it directly. Schema-ready only — no
--                                code path calls out to a customer API
--                                yet, same "reserved, not wired" status as
--                                studios.subdomain_slug.
--   self_hosted_postgres:       planned per DATABASE-PER-TENANT-
--                                ARCHITECTURE.md's hosting options; no
--                                migration runner written for it yet.

alter table public.tenant_databases
  drop constraint tenant_databases_provider_check;

alter table public.tenant_databases
  add constraint tenant_databases_provider_check
  check (provider in ('aorms_managed', 'customer_supabase', 'customer_api', 'self_hosted_postgres'));

alter table public.tenant_databases
  alter column provider set default 'customer_supabase';

alter table public.tenant_databases
  add column api_base_url text,
  add column api_auth_secret_id uuid references vault.secrets(id);

comment on column public.tenant_databases.provider is
  'Connector mode — see this migration''s header comment for the 4 values and what each means.';
comment on column public.tenant_databases.api_base_url is
  'customer_api mode only. Not yet read by any code path.';
comment on column public.tenant_databases.api_auth_secret_id is
  'customer_api mode only — vault.secrets id for the auth token/key. Not yet read by any code path.';
