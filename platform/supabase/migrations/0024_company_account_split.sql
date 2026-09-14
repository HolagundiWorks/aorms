-- 2026-09-14 — Company/ConnectDeX identity split: the third table in the
-- Identity/Admin/Company separation (platform_staff, migrations 0022-0023,
-- did the first two). Explicit user direction: "the admin users and staff
-- should be separate from aorms hub users, and should be separate from
-- company users, three separate tables, and dont conсile everyusers in
-- single platform." Confirmed via a clarifying question first — this
-- directly conflicts with AORMS-PLATFORM-ARCHITECTURE.md's documented "one
-- portable AORMS-U- handle across every studio AND company" design — and
-- the user's explicit answer was "Split Company users too, accept the
-- tradeoff." A person can no longer use one login across both Studio/
-- Identity and Company/ConnectDeX contexts; two separate accounts (two
-- separate auth.users rows, two separate emails) are needed going forward.
--
-- Design: company_accounts mirrors accounts's own shape (id -> auth.users,
-- full_name, public_id, created_at) but mints AORMS-CU- handles (distinct
-- from accounts's AORMS-U-). It's populated ONLY via the ConnectDeX admin-
-- invite path (adminInviteConnectDexApplication, web/lib/actions/
-- connectdex.ts) — there's no public self-serve Company signup today, so
-- that's the one and only place a company_accounts row gets minted.
--
-- Mutual exclusion is enforced by construction, not a separate check:
-- handle_new_platform_account() (the one trigger on every auth.users
-- insert) branches on new.raw_user_meta_data ->> 'account_kind' — 'company'
-- creates a company_accounts row, anything else (the default, unchanged for
-- every existing caller) creates an accounts row. Every auth.users row gets
-- exactly one of the two, decided permanently at signup/invite time — no
-- code path creates both for the same new user.

create table public.company_accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  public_id text not null unique,
  created_at timestamptz not null default now()
);

alter table public.company_accounts enable row level security;

create policy "company_accounts: self read" on public.company_accounts
  for select using (id = auth.uid());

-- Admin tooling (SysDeX's ConnectDeX review pages etc.) needs to see
-- company-side identities too — same "staff read all" shape as
-- platform_staff's own policy (migration 0022).
create policy "company_accounts: staff read all" on public.company_accounts
  for select using (public.is_platform_admin());

-- No authenticated write policy — matches accounts's own precedent (no
-- self-profile-edit feature exists for either identity table yet). Writes
-- are app-code + service-role only (the invite trigger below, and any
-- future admin tooling), same discipline as platform_staff.

-- Backfill: exactly one pre-existing row across the whole platform project
-- needs a company_accounts row before the FKs below are repointed — the
-- seeded "Demo Materials Co" (AORMS-C-QYQY), owned by the "AORMS Demo"
-- account, created back when Company had instant self-serve creation
-- (migration 0007), predating ConnectDeX's admin-invite gating entirely.
-- Grandfathered in with a fresh AORMS-CU- handle so existing demo data
-- doesn't orphan — the one deliberate exception to "one auth.users row,
-- one identity table" this migration creates, kept only because forcing a
-- retroactive split onto seed data isn't worth breaking it.
insert into public.company_accounts (id, full_name, public_id)
select a.id, a.full_name, public.new_public_id('AORMS-CU-', 'company_accounts')
from public.accounts a
where a.id in (select owner_id from public.companies)
   or a.id in (select account_id from public.company_memberships)
on conflict (id) do nothing;

-- Repoint every company-side identity FK from accounts to company_accounts.
alter table public.companies drop constraint companies_owner_id_fkey1;
alter table public.companies add constraint companies_owner_id_fkey1
  foreign key (owner_id) references public.company_accounts (id);

alter table public.company_memberships drop constraint company_memberships_account_id_fkey;
alter table public.company_memberships add constraint company_memberships_account_id_fkey
  foreign key (account_id) references public.company_accounts (id) on delete cascade;

alter table public.connectdex_applications drop constraint connectdex_applications_invited_account_id_fkey;
alter table public.connectdex_applications add constraint connectdex_applications_invited_account_id_fkey
  foreign key (invited_account_id) references public.company_accounts (id);

alter table public.connectdex_payments drop constraint connectdex_payments_account_id_fkey;
alter table public.connectdex_payments add constraint connectdex_payments_account_id_fkey
  foreign key (account_id) references public.company_accounts (id);

-- companies.verified_by_id and connectdex_applications.reviewed_by_id are
-- deliberately NOT touched — both are set from
-- getCurrentPlatformSessionAccount().id, an ADMIN's own Identity/Studio
-- account (every real admin today is an Identity/Studio user with a
-- platform_staff grant layered on top, not a Company identity). Those two
-- stay pointed at accounts.

create or replace function public.handle_new_platform_account()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'account_kind', 'identity') = 'company' then
    insert into public.company_accounts (id, full_name, public_id)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', ''),
      public.new_public_id('AORMS-CU-', 'company_accounts')
    );
  else
    insert into public.accounts (id, full_name, public_id)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', ''),
      public.new_public_id('AORMS-U-', 'accounts')
    );
  end if;
  return new;
end;
$$;
