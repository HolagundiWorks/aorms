-- AORMS Platform — a platform-wide activity log for the new admin back
-- office (/admin/logs). Distinct from web/'s own per-firm audit_log
-- (office-hub actions within one firm) — this covers the platform itself:
-- account signups, studio creation, membership changes, licence changes,
-- payment lifecycle.
--
-- Populated exclusively by trigger functions (security definer), never by
-- application code calling an insert directly. This is a deliberate
-- choice over an app-level logActivity() helper sprinkled through Server
-- Actions: a trigger fires no matter which code path performed the
-- underlying write (including a future one nobody remembers to
-- instrument), so the log stays a trustworthy record of what actually
-- happened in the database rather than of which call sites remembered to
-- report it.
create table public.platform_activity_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts (id) on delete set null,
  studio_id uuid references public.studios (id) on delete set null,
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.platform_activity_log enable row level security;

create policy "platform_activity_log: admin read" on public.platform_activity_log
  for select using (public.is_platform_admin());

-- No insert/update/delete policy for `authenticated` at all — every row
-- comes from a security-definer trigger function below, which runs with
-- the privileges of the function owner regardless of RLS on this table.

-- ── shared helper ────────────────────────────────────────────────────────
-- Every trigger function below delegates the actual insert here, so each
-- one stays focused on deciding *what* happened rather than repeating the
-- same insert statement five times.
create function public.log_platform_activity(
  p_event_type text,
  p_account_id uuid,
  p_studio_id uuid,
  p_detail jsonb
)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.platform_activity_log (event_type, account_id, studio_id, detail)
  values (p_event_type, p_account_id, p_studio_id, p_detail);
end;
$$;

-- ── accounts: signup ─────────────────────────────────────────────────────
create function public.log_account_created()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.log_platform_activity('ACCOUNT_CREATED', new.id, null, jsonb_build_object('public_id', new.public_id));
  return new;
end;
$$;

create trigger after_account_insert_log
  after insert on public.accounts
  for each row execute function public.log_account_created();

-- ── studios: creation ────────────────────────────────────────────────────
create function public.log_studio_created()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.log_platform_activity(
    'STUDIO_CREATED', new.owner_id, new.id,
    jsonb_build_object('name', new.name, 'public_id', new.public_id)
  );
  return new;
end;
$$;

create trigger after_studio_insert_log
  after insert on public.studios
  for each row execute function public.log_studio_created();

-- ── studio_memberships: invited/joined/left/role change ─────────────────
create function public.log_studio_membership_insert()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.log_platform_activity(
    case when new.status = 'ACTIVE' then 'MEMBER_JOINED' else 'MEMBER_INVITED' end,
    new.account_id, new.studio_id,
    jsonb_build_object('role', new.role, 'status', new.status)
  );
  return new;
end;
$$;

create trigger after_studio_membership_insert_log
  after insert on public.studio_memberships
  for each row execute function public.log_studio_membership_insert();

create function public.log_studio_membership_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status <> old.status then
    perform public.log_platform_activity(
      case new.status
        when 'LEFT' then 'MEMBER_LEFT'
        when 'ACTIVE' then 'MEMBER_JOINED'
        else 'MEMBER_STATUS_CHANGED'
      end,
      new.account_id, new.studio_id,
      jsonb_build_object('from_status', old.status, 'to_status', new.status)
    );
  elsif new.role <> old.role then
    perform public.log_platform_activity(
      'MEMBER_ROLE_CHANGED', new.account_id, new.studio_id,
      jsonb_build_object('from_role', old.role, 'to_role', new.role)
    );
  end if;
  return new;
end;
$$;

create trigger after_studio_membership_update_log
  after update on public.studio_memberships
  for each row execute function public.log_studio_membership_update();

-- ── licences: plan/seats/expiry changes ──────────────────────────────────
create function public.log_licence_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.log_platform_activity(
    'LICENCE_CHANGED', null, new.studio_id,
    jsonb_build_object(
      'from_plan', old.plan, 'to_plan', new.plan,
      'from_seats', old.seats, 'to_seats', new.seats,
      'from_expires_at', old.expires_at, 'to_expires_at', new.expires_at
    )
  );
  return new;
end;
$$;

create trigger after_licence_update_log
  after update on public.licences
  for each row execute function public.log_licence_update();

-- ── payments: created + status transitions ───────────────────────────────
create function public.log_payment_insert()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.log_platform_activity(
    'PAYMENT_CREATED', new.account_id, new.studio_id,
    jsonb_build_object('plan', new.plan, 'seats', new.seats, 'amount_paise', new.amount_paise, 'razorpay_order_id', new.razorpay_order_id)
  );
  return new;
end;
$$;

create trigger after_payment_insert_log
  after insert on public.payments
  for each row execute function public.log_payment_insert();

create function public.log_payment_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status <> old.status then
    perform public.log_platform_activity(
      case new.status
        when 'CAPTURED' then 'PAYMENT_CAPTURED'
        when 'FAILED' then 'PAYMENT_FAILED'
        when 'REFUNDED' then 'PAYMENT_REFUNDED'
        when 'AUTHORIZED' then 'PAYMENT_AUTHORIZED'
        else 'PAYMENT_STATUS_CHANGED'
      end,
      new.account_id, new.studio_id,
      jsonb_build_object('from_status', old.status, 'to_status', new.status, 'razorpay_payment_id', new.razorpay_payment_id)
    );
  end if;
  return new;
end;
$$;

create trigger after_payment_update_log
  after update on public.payments
  for each row execute function public.log_payment_update();
