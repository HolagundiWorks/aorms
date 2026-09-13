-- Esti AI Model Connectors (2026-09-13) — generic "connect any model over
-- an API" registry, replacing the assumption that Esti only ever talks to
-- one hardcoded provider. Lives in aorms-platform (not aorms-web) per
-- explicit direction: this is system-level infrastructure that also
-- decides *which Studio/individual identity* gets to use which model —
-- an entitlement concern, which is exactly what this project already
-- models (licences, plan_pricing) for everything else. `web/`'s Esti API
-- reads these two tables via the platform service-role key (same dual-
-- project pattern `web/lib/platform/*` already uses for Studio/licence
-- data), not via RLS-scoped browser access.
--
-- One connector kind, not a fixed enum of hardcoded providers baked into
-- the schema — `kind` + `base_url` + `api_key` + `model_name` is enough
-- to describe an OpenAI-compatible endpoint, Anthropic's Messages API, a
-- self-hosted Ollama instance, or this repo's own device-gateway (the
-- Esti Mobile Inference Samsung phone work) uniformly; the adapter code
-- (web/lib/ai/connectors.ts) is what actually knows the wire-format
-- differences per `kind`, not the database.

create table public.ai_model_connectors (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  kind text not null
    check (kind in ('openai_compatible', 'anthropic', 'ollama', 'device_gateway', 'custom_http')),

  base_url text not null,
  -- Plaintext, not hashed — unlike ai_devices.device_secret_hash (only
  -- ever compared, never sent anywhere), this key must be replayed
  -- outbound on every call. Protected purely by RLS (is_platform_admin()
  -- only) plus never being returned to a browser except masked — see
  -- lib/platform/ai-connectors.ts's own comment.
  api_key text,
  model_name text not null,

  enabled boolean not null default true,
  -- A connector with no explicit access grant is unusable unless this is
  -- true — the "give everyone the default model" escape hatch so every
  -- Studio doesn't need its own grant row for the common case.
  default_for_all boolean not null default false,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_model_connectors enable row level security;
create policy "ai_model_connectors: platform admin only" on public.ai_model_connectors
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create or replace function public.touch_ai_model_connectors_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

create trigger ai_model_connectors_touch_updated_at
  before update on public.ai_model_connectors
  for each row execute function public.touch_ai_model_connectors_updated_at();

-- Entitlements: which Studio (company) or which individual Account may
-- use a given connector. A row grants access; there is no separate
-- "deny" row — removing the grant removes the access.
create table public.ai_model_connector_access (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid not null references public.ai_model_connectors (id) on delete cascade,

  scope_type text not null check (scope_type in ('company', 'account')),
  company_id uuid references public.companies (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete cascade,

  created_at timestamptz not null default now(),

  constraint ai_model_connector_access_scope_shape check (
    (scope_type = 'company' and company_id is not null and account_id is null) or
    (scope_type = 'account' and account_id is not null and company_id is null)
  )
);

-- Plain UNIQUE can't be relied on here — Postgres treats two NULLs as
-- distinct for uniqueness purposes, so a naive
-- unique(connector_id, scope_type, company_id, account_id) would happily
-- accept the same (connector, company) grant twice (account_id is NULL
-- both times). Partial indexes on the always-non-null column per
-- scope_type instead.
create unique index ai_model_connector_access_company_uniq
  on public.ai_model_connector_access (connector_id, company_id)
  where scope_type = 'company';
create unique index ai_model_connector_access_account_uniq
  on public.ai_model_connector_access (connector_id, account_id)
  where scope_type = 'account';

alter table public.ai_model_connector_access enable row level security;
create policy "ai_model_connector_access: platform admin only" on public.ai_model_connector_access
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
