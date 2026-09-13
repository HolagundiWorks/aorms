-- Esti Mobile Inference — device registry (2026-09-13), per
-- docs/esti/AORMS-ESTI-MOBILE-INFERENCE (the attached development guide,
-- § 7 Device Registry). Phase A of that guide's own "Platform team"
-- implementation order: registry + monitoring UI before the actual WSS
-- gateway/device-client wiring goes live.
--
-- Tracks every phone (or future inference node) that can serve Esti
-- requests — status, model, runtime, last heartbeat. Deliberately NOT a
-- source of project data itself (see the guide's own § 13 RAG Boundary/
-- § 18 Samsung A10s Runtime — "should not host ... project authorization
-- ... business logic"); this table only ever describes the *device*.
--
-- RLS: staff can read (so the monitoring page works for any signed-in
-- office user, matching ai_runs' own "is_office_staff() for select"
-- precedent — migration 0010). Deliberately NO staff write policy at
-- all: every write (registration, heartbeat, status change) comes from
-- the device gateway service using the service-role key, which bypasses
-- RLS entirely — a browser client should never be able to directly
-- claim "this device is online" or forge a heartbeat.
create table public.ai_devices (
  id uuid primary key default gen_random_uuid(),

  device_id text unique not null,
  device_name text,
  device_type text not null default 'android',

  -- Per-device credential (guide § 8 — explicitly NOT a shared API key).
  -- Only the sha256 hash is ever stored; the plaintext secret is shown
  -- once at registration time (see registerAiDevice in
  -- lib/actions/ai-devices.ts) and copied onto the device by hand, the
  -- same "shown once, never retrievable again" pattern most API-key
  -- issuance flows use.
  device_secret_hash text not null,

  status text not null default 'offline'
    check (status in ('online', 'offline', 'connecting', 'busy', 'error')),

  model_name text,
  runtime text,
  capabilities jsonb not null default '{}'::jsonb,
  app_version text,

  -- Health Monitoring (guide § 36) — cheap running counters the gateway
  -- increments on each connect/request, not a separate metrics table;
  -- fine at this scale (a handful of devices, per the guide's own
  -- "~0.5B-1.5B prototype" framing, not a fleet).
  connection_count integer not null default 0,
  inference_count integer not null default 0,
  successful_requests integer not null default 0,
  failed_requests integer not null default 0,
  average_latency_ms numeric,

  last_seen_at timestamptz,
  last_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_devices enable row level security;
create policy "ai_devices: staff read" on public.ai_devices
  for select using (public.is_office_staff());

-- Registering/removing a device is a staff decision (see
-- lib/actions/ai-devices.ts's own header comment for why registration
-- isn't a phone self-service flow) — insert/delete only, deliberately no
-- staff UPDATE policy: once a device exists, its live status/heartbeat/
-- counters are the device gateway's own domain (service-role writes,
-- bypassing RLS), never something a staff member edits by hand.
create policy "ai_devices: staff insert" on public.ai_devices
  for insert with check (public.is_office_staff());
create policy "ai_devices: staff delete" on public.ai_devices
  for delete using (public.is_office_staff());

-- Keep updated_at honest on every gateway write, same convention already
-- used elsewhere in this schema (e.g. decisions/approvals' own
-- updated_at columns) rather than trusting the caller to set it.
create or replace function public.touch_ai_devices_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

create trigger ai_devices_touch_updated_at
  before update on public.ai_devices
  for each row execute function public.touch_ai_devices_updated_at();
