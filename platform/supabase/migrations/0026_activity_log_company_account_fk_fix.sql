-- 2026-09-14 — Regression fix, found during the portal-completion audit's
-- "detailed testing of every item" pass (explicit user request), NOT a
-- pre-existing bug: migration 0024 (Company/ConnectDeX identity split)
-- repointed `connectdex_payments.account_id` from `accounts` to the new
-- `connectdex.company_accounts` table, but never checked
-- `log_connectdex_payment_insert`/`log_connectdex_payment_update` — both
-- pass `new.account_id` straight into `log_platform_activity()`'s
-- `p_account_id` parameter, which inserts it into
-- `platform_activity_log.account_id`, a column with a hard FK to
-- `accounts(id)`. For the one pre-existing grandfathered identity (the
-- demo account that legitimately has rows in both tables) this silently
-- worked and hid the bug; verified live with a genuinely fresh
-- company-only identity (no `accounts` row at all — the normal case for
-- every real ConnectDeX Partner going forward) that it does not: the
-- trigger raises `platform_activity_log_account_id_fkey` and aborts the
-- whole transaction, meaning **every real ConnectDeX payment — order
-- creation, capture, and failure — has been completely broken since
-- migration 0024 landed**, caught here before any real Company user hit
-- it (the platform has zero real ConnectDeX payments yet).
--
-- Fix: platform_activity_log already carries one nullable FK column per
-- possible actor/context (account_id, studio_id, company_id) rather than
-- a single polymorphic column — extending that same established pattern
-- with a fourth, company_account_id, rather than introducing a new
-- discriminator-column convention. log_platform_activity() gains a
-- trailing p_company_account_id parameter (default null, so every
-- existing 4- and 5-arg call site is unaffected); only the two
-- connectdex-payment log functions are updated to pass their Company
-- actor through the new parameter instead of the old one.

alter table public.platform_activity_log
  add column company_account_id uuid references connectdex.company_accounts (id) on delete set null;

-- CREATE OR REPLACE does NOT replace the original 5-arg signature here —
-- Postgres treats a different argument count as a distinct overload, not
-- a replacement (the exact same mistake already made once this session
-- with new_public_id, migration 0025 — and made again here, caught live
-- by the portal-completion audit's own verification step: every 4-arg
-- caller, including log_account_created(), the trigger on EVERY new
-- accounts row, became ambiguous the moment both overloads existed,
-- breaking every new signup on the whole platform). Drop the stale 5-arg
-- version first, or a fresh apply of this migration reproduces the same
-- outage a hand-patch already had to fix live.
drop function if exists public.log_platform_activity(text, uuid, uuid, jsonb, uuid);

create or replace function public.log_platform_activity(
  p_event_type text,
  p_account_id uuid,
  p_studio_id uuid,
  p_detail jsonb,
  p_company_id uuid default null,
  p_company_account_id uuid default null
)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.platform_activity_log (event_type, account_id, studio_id, detail, company_id, company_account_id)
  values (p_event_type, p_account_id, p_studio_id, p_detail, p_company_id, p_company_account_id);
end;
$$;

create or replace function connectdex.log_connectdex_payment_insert()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.log_platform_activity(
    'CONNECTDEX_PAYMENT_CREATED', null, null,
    jsonb_build_object('amount_paise', new.amount_paise, 'razorpay_order_id', new.razorpay_order_id),
    new.company_id, new.account_id
  );
  return new;
end;
$$;

create or replace function connectdex.log_connectdex_payment_update()
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
      null, null,
      jsonb_build_object('from_status', old.status, 'to_status', new.status, 'razorpay_payment_id', new.razorpay_payment_id),
      new.company_id, new.account_id
    );
  end if;
  return new;
end;
$$;
