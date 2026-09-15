-- Multi-tenancy — profile ⇄ firm memberships + active-firm switching.
--
-- Why this exists: a single AORMS Identity (Platform) account can belong to
-- multiple Studios (`platform.studio_memberships` — "many-companies-per-
-- person", already the Platform's own design). Supabase Auth's own
-- `auth.users.email` is unique per project, so one real person can only
-- ever have ONE aorms-web login (one `auth.users`/`profiles` row) — there
-- is no way to give them a second, separate Office Hub account per firm.
--
-- Resolution: keep the single shared login, but let that one profile hold
-- membership in more than one firm. `profiles.firm_id` (0053) becomes "my
-- *currently active* firm" rather than a permanent one-time assignment;
-- `profile_firm_memberships` is the durable list of every firm a profile
-- may switch into. current_firm_id() (0053) is UNCHANGED — it still just
-- reads profiles.firm_id, so every RLS policy already rewritten in
-- batches 1-2 needs no further change; switching firms is exactly one
-- UPDATE to profiles.firm_id/role, gated by a membership row existing.
--
-- profiles.role also becomes per-active-firm: a person can be OWNER of
-- their own studio and, separately, ASSOCIATE (or PENDING, awaiting
-- promotion) in a firm that invited them — switch_active_firm() copies
-- the membership's own role onto profiles.role on every switch.

create table public.profile_firm_memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  firm_id uuid not null references public.firms (id) on delete cascade,
  role public.app_role not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE')),
  created_at timestamptz not null default now(),
  unique (profile_id, firm_id)
);

alter table public.profile_firm_memberships enable row level security;

-- Read-only from the client side — a profile can see its own membership
-- list (to render the studio picker); every write goes through one of the
-- three security-definer RPCs below, never a direct insert/update.
create policy "profile_firm_memberships: read own" on public.profile_firm_memberships
  for select using (profile_id = auth.uid());

-- The studio picker needs to show the *name* of every firm a profile
-- belongs to, not just their currently-active one — but "firms: staff
-- read" (0053) only allows `id = current_firm_id()`, so an embedded
-- `profile_firm_memberships -> firms` read would silently drop every
-- non-active firm. Additive SELECT policy (RLS OR's multiple policies
-- together): a profile may also read the `firms` row for any firm they
-- hold a membership in, active or not. Doesn't weaken the original
-- policy — still exactly as scoped for staff-in-their-active-firm reads.
create policy "firms: member read own memberships" on public.firms
  for select using (id in (select firm_id from public.profile_firm_memberships where profile_id = auth.uid()));

-- Backfill: every profile already carrying a firm_id (batch 1's backfill)
-- gets one matching membership row, so no existing user loses access.
insert into public.profile_firm_memberships (profile_id, firm_id, role)
select id, firm_id, role from public.profiles where firm_id is not null
on conflict (profile_id, firm_id) do nothing;

-- ── provision_firm() ─────────────────────────────────────────────────────
-- Creates a brand-new firm for a Studio that has never reached Office Hub
-- before, makes the calling profile its OWNER, and switches them into it.
-- `firms` has no INSERT RLS policy (by design, unchanged since 0024) — this
-- security-definer RPC is the only way a firms row is ever created, so a
-- caller can never forge platform_studio_public_id to claim someone else's
-- Studio.
create function public.provision_firm(p_company_name text, p_platform_studio_public_id text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_firm_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if exists (
    select 1 from public.firms where platform_studio_public_id = p_platform_studio_public_id
  ) then
    raise exception 'a firm for this Studio already exists — use join_firm() instead';
  end if;

  insert into public.firms (company_name, platform_studio_public_id)
  values (p_company_name, p_platform_studio_public_id)
  returning id into v_firm_id;

  insert into public.profile_firm_memberships (profile_id, firm_id, role)
  values (auth.uid(), v_firm_id, 'OWNER');

  update public.profiles set firm_id = v_firm_id, role = 'OWNER' where id = auth.uid();

  return v_firm_id;
end;
$$;

-- ── join_firm() ──────────────────────────────────────────────────────────
-- A profile's Identity Studio already has a firms row (a teammate signed
-- in first) — record membership as PENDING (an OWNER/PARTNER must promote
-- them via /users, same gate as any other new profile) and, only if this
-- profile has no active firm selected yet, make it their active one so
-- they land somewhere sensible instead of nowhere.
create function public.join_firm(p_firm_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.profile_firm_memberships (profile_id, firm_id, role)
  values (auth.uid(), p_firm_id, 'PENDING')
  on conflict (profile_id, firm_id) do nothing;

  update public.profiles set firm_id = p_firm_id, role = 'PENDING'
  where id = auth.uid() and firm_id is null;
end;
$$;

-- ── switch_active_firm() ─────────────────────────────────────────────────
-- Powers the "which studio do you want to access" picker — only ever
-- switches to a firm the caller already has a membership row for.
create function public.switch_active_firm(p_firm_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select role into v_role from public.profile_firm_memberships
    where profile_id = auth.uid() and firm_id = p_firm_id and status = 'ACTIVE';
  if v_role is null then
    raise exception 'no active membership in that firm';
  end if;

  update public.profiles set firm_id = p_firm_id, role = v_role where id = auth.uid();
end;
$$;

grant execute on function public.provision_firm(text, text) to authenticated;
grant execute on function public.join_firm(uuid) to authenticated;
grant execute on function public.switch_active_firm(uuid) to authenticated;
