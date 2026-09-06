-- Spec Catalog (Library → Specification) — CLAUDE.md's own module map names
-- this ("specCatalog — specification material catalogue") and a real page,
-- `SpecCatalogLibrary.tsx` (`/libraries/spec-catalog`), in the old frontend
-- — genuinely missing from `web/` entirely (confirmed via a full
-- information_schema.tables sweep, not assumed). Distinct from `spec_sheets`
-- (already live) — that's a project's own spec documents; this is the
-- firm's versioned reference catalogue those documents pick items from.
-- Verbatim port of backend/src/db/schema/spec-catalog.ts's
-- esti_spec_catalog_version/esti_spec_catalog_item.

create table public.spec_catalog_versions (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  description text,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

-- At most one active version at a time (port of the old router's
-- setActiveVersion: set every row false, then the target true) — enforced
-- at the DB layer too via a partial unique index, not just trusted to the
-- app's two-step update.
create unique index spec_catalog_versions_one_active
  on public.spec_catalog_versions (active)
  where active;

alter table public.spec_catalog_versions enable row level security;
create policy "spec_catalog_versions: staff read" on public.spec_catalog_versions
  for select using (public.is_office_staff());
create policy "spec_catalog_versions: staff write" on public.spec_catalog_versions
  for all using (public.is_office_staff()) with check (public.is_office_staff());

create table public.spec_catalog_items (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.spec_catalog_versions (id) on delete cascade,
  category text,
  item text not null,
  make text,
  specification text,
  finish text,
  remarks text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.spec_catalog_items enable row level security;
create policy "spec_catalog_items: staff read" on public.spec_catalog_items
  for select using (public.is_office_staff());
create policy "spec_catalog_items: staff write" on public.spec_catalog_items
  for all using (public.is_office_staff()) with check (public.is_office_staff());
