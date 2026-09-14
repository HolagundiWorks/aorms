-- 2026-09-14 — AORMS Identity professional profile (explicit user
-- request): editable info (nickname, degree, qualification, COA
-- registration number, additional qualifications, photo), uploadable
-- degree certificates + software certifications, and an auto-generated
-- work history — the last one needs no new schema at all, since
-- `studio_memberships` (created_at/activated_at/left_at/role) already
-- carries everything needed to compute "which studios, what dates, what
-- role" without a single manual entry; see web/lib/actions/
-- account-profile.ts's own read query for that part.
--
-- Kept as tables separate from `accounts` (same "lean core identity +
-- separate details" shape already used for aorms-web's own profiles/
-- team_members split) rather than bloating `accounts` with optional
-- profile columns most rows won't have set.

create table public.account_profile_details (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  nickname text,
  degree text,
  qualification text,
  coa_number text,
  additional_qualifications text,
  photo_key text,
  updated_at timestamptz not null default now()
);

alter table public.account_profile_details enable row level security;

-- Self-manage (read/insert/update/delete all in one policy — there's no
-- write path that isn't also a legitimate read for the owner), plus
-- staff visibility for admin tooling. Learned the hard way earlier this
-- session (`accounts` itself has no UPDATE policy at all) — this table
-- gets a real one from the start.
create policy "account_profile_details: self manage" on public.account_profile_details
  for all using (account_id = auth.uid()) with check (account_id = auth.uid());
create policy "account_profile_details: staff read all" on public.account_profile_details
  for select using (public.is_platform_admin());

-- Certificates — degree certificates AND software/other certifications
-- in one table (same "kind" discriminator shape used elsewhere in this
-- schema, e.g. connectdex_applications.category), each optionally
-- carrying an uploaded file (account-documents Storage bucket, service-
-- role access only — same "app-code authorization, not storage RLS"
-- precedent as aorms-web's own esti-documents bucket).
create table public.account_certificates (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  kind text not null check (kind in ('DEGREE', 'SOFTWARE', 'OTHER')),
  title text not null,
  issuer text,
  issued_on date,
  file_key text,
  created_at timestamptz not null default now()
);

alter table public.account_certificates enable row level security;

create policy "account_certificates: self manage" on public.account_certificates
  for all using (account_id = auth.uid()) with check (account_id = auth.uid());
create policy "account_certificates: staff read all" on public.account_certificates
  for select using (public.is_platform_admin());

create index account_certificates_account_id_idx on public.account_certificates (account_id);
