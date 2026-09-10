-- ConnectDeX Partners — gated onboarding pipeline (2026-09-10), replacing
-- Company's instant self-serve creation entirely (explicit direction: a
-- connect form, admin-reviewed invite, an onboarding form, manual admin
-- verification, then a flat Razorpay onboarding fee, before a Company
-- becomes ACTIVE). Same precedent as 0011_licence_payment_gate.sql
-- closing Studio's own self-serve licence bypass.
--
-- Joining an ALREADY-ACTIVE company as a team member (company_memberships
-- via joinCompany) is untouched — this migration gates *creating* a new
-- Company, not joining an existing one.

-- ── 1. Close the instant self-serve creation bypass ─────────────────────
-- Every new companies row from here on is created by an admin's invite
-- action (service-role), never directly by a user's own insert.
drop policy "companies: self insert" on public.companies;

-- ── 2. Company onboarding status ─────────────────────────────────────────
-- Default 'ACTIVE' so the check constraint needs no backfill (no real
-- company rows exist yet, dev-only) — every row the new pipeline creates
-- explicitly sets 'PENDING_ONBOARDING' on insert instead.
alter table public.companies add column status text not null default 'ACTIVE'
  check (status in ('PENDING_ONBOARDING', 'PENDING_VERIFICATION', 'PENDING_PAYMENT', 'ACTIVE'));
alter table public.companies add column verified_at timestamptz;
alter table public.companies add column verified_by_id uuid references public.accounts (id);

-- ── 3. connectdex_applications — the public, pre-account submission ─────
-- No auth exists at submission time, so this table grants zero
-- authenticated write policies — the public Server Action and every
-- admin action both go through the platform service-role client, same
-- "no policy, service-role only" precedent as payments (0010_payments.sql).
create table public.connectdex_applications (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  city text,
  state text,
  category text not null check (category in ('BUILDING_MATERIAL', 'INTERIOR_MATERIAL', 'FINISH', 'OTHER')),
  message text,
  status text not null default 'PENDING' check (status in ('PENDING', 'INVITED', 'REJECTED')),
  invited_account_id uuid references public.accounts (id),
  reviewed_at timestamptz,
  reviewed_by_id uuid references public.accounts (id),
  created_at timestamptz not null default now()
);

alter table public.connectdex_applications enable row level security;

create policy "connectdex_applications: admin read" on public.connectdex_applications
  for select using (public.is_platform_admin());

-- ── 4. connectdex_payments — the flat onboarding fee ─────────────────────
-- Mirrors `payments` (Studio) exactly, kept as a genuinely separate table
-- rather than a nullable-either-fk on payments, matching this schema's
-- established Studio/Company separation principle.
create table public.connectdex_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  account_id uuid not null references public.accounts (id),
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null default 'INR',
  razorpay_order_id text unique not null,
  razorpay_payment_id text,
  status text not null default 'CREATED' check (status in ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.connectdex_payments enable row level security;

create policy "connectdex_payments: company members read" on public.connectdex_payments
  for select using (
    exists (
      select 1 from public.company_memberships
      where company_id = connectdex_payments.company_id
        and account_id = auth.uid()
        and status = 'ACTIVE'
    )
  );
create policy "connectdex_payments: admin read" on public.connectdex_payments
  for select using (public.is_platform_admin());
-- Zero insert/update policies — service-role only, same reasoning as
-- payments' own header comment: a payment record must stay an accurate
-- mirror of what Razorpay actually reports.

-- ── 5. connectdex_settings — the flat fee, admin-editable ────────────────
-- Singleton-row table (the `id boolean primary key default true check
-- (id)` trick guarantees exactly one row ever exists).
create table public.connectdex_settings (
  id boolean primary key default true check (id),
  onboarding_fee_paise bigint not null check (onboarding_fee_paise > 0),
  updated_at timestamptz not null default now()
);

alter table public.connectdex_settings enable row level security;

-- PLACEHOLDER: ₹4,999 flat onboarding fee. Review and set the real number
-- on /admin/connectdex before relying on this for real revenue — same
-- posture as plan_pricing's own seeded placeholders (0010_payments.sql).
insert into public.connectdex_settings (id, onboarding_fee_paise) values (true, 499900);

create policy "connectdex_settings: authenticated read" on public.connectdex_settings
  for select to authenticated using (true);
create policy "connectdex_settings: admin write" on public.connectdex_settings
  for update using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ── 6. Activity log — extend to cover Company/ConnectDeX events too ──────
-- platform_activity_log (0012_activity_log.sql) only ever carried
-- studio_id — extending it with company_id rather than building a
-- parallel log table, so /admin/logs stays the one place to look.
alter table public.platform_activity_log add column company_id uuid references public.companies (id) on delete set null;

-- CREATE OR REPLACE with a new trailing default-null parameter — backward
-- compatible with every existing call site (log_licence_update,
-- log_payment_insert, etc.) that doesn't pass it.
create or replace function public.log_platform_activity(
  p_event_type text,
  p_account_id uuid,
  p_studio_id uuid,
  p_detail jsonb,
  p_company_id uuid default null
)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.platform_activity_log (event_type, account_id, studio_id, detail, company_id)
  values (p_event_type, p_account_id, p_studio_id, p_detail, p_company_id);
end;
$$;

create function public.log_connectdex_application_insert()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.log_platform_activity(
    'CONNECTDEX_APPLICATION_SUBMITTED', null, null,
    jsonb_build_object('application_id', new.id, 'company_name', new.company_name, 'email', new.email)
  );
  return new;
end;
$$;

create trigger after_connectdex_application_insert_log
  after insert on public.connectdex_applications
  for each row execute function public.log_connectdex_application_insert();

create function public.log_connectdex_application_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status <> old.status then
    perform public.log_platform_activity(
      case new.status when 'INVITED' then 'CONNECTDEX_APPLICATION_INVITED' when 'REJECTED' then 'CONNECTDEX_APPLICATION_REJECTED' else 'CONNECTDEX_APPLICATION_STATUS_CHANGED' end,
      new.reviewed_by_id, null,
      jsonb_build_object('application_id', new.id, 'from_status', old.status, 'to_status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger after_connectdex_application_update_log
  after update on public.connectdex_applications
  for each row execute function public.log_connectdex_application_update();

create function public.log_company_status_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status <> old.status then
    perform public.log_platform_activity(
      'CONNECTDEX_COMPANY_STATUS_CHANGED', null, null,
      jsonb_build_object('from_status', old.status, 'to_status', new.status, 'verified_by_id', new.verified_by_id),
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger after_company_status_update_log
  after update on public.companies
  for each row execute function public.log_company_status_update();

create function public.log_connectdex_payment_insert()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.log_platform_activity(
    'CONNECTDEX_PAYMENT_CREATED', new.account_id, null,
    jsonb_build_object('amount_paise', new.amount_paise, 'razorpay_order_id', new.razorpay_order_id),
    new.company_id
  );
  return new;
end;
$$;

create trigger after_connectdex_payment_insert_log
  after insert on public.connectdex_payments
  for each row execute function public.log_connectdex_payment_insert();

create function public.log_connectdex_payment_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status <> old.status then
    perform public.log_platform_activity(
      case new.status
        when 'CAPTURED' then 'CONNECTDEX_PAYMENT_CAPTURED'
        when 'FAILED' then 'CONNECTDEX_PAYMENT_FAILED'
        when 'REFUNDED' then 'CONNECTDEX_PAYMENT_REFUNDED'
        else 'CONNECTDEX_PAYMENT_STATUS_CHANGED'
      end,
      new.account_id, null,
      jsonb_build_object('from_status', old.status, 'to_status', new.status, 'razorpay_payment_id', new.razorpay_payment_id),
      new.company_id
    );
  end if;
  return new;
end;
$$;

create trigger after_connectdex_payment_update_log
  after update on public.connectdex_payments
  for each row execute function public.log_connectdex_payment_update();
