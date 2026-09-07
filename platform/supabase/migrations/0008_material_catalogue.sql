-- Phase C of the Studio/Company split + Material Catalogue plan — the
-- catalogue itself. A Company (material supplier — see
-- 0007_supplier_companies.sql) owns and operates a list of Products;
-- each Product carries a flexible key-value spec list and structured
-- test-result rows (no file uploads in this pass — confirmed with the
-- user up front). Money follows this codebase's integer-paise
-- convention (see root CLAUDE.md Conventions).
--
-- Readable by any authenticated platform account — catalogue browsing
-- is platform-wide, not membership-gated, same precedent as "companies:
-- authenticated read"/"studios: authenticated read" (0001/0006/0007):
-- a Studio needs to discover suppliers it isn't a member of. Writable
-- by the owning company's OWNER only, reusing is_company_owner().

create table public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  category text not null
    check (category in ('BUILDING_MATERIAL', 'INTERIOR_MATERIAL', 'FINISH', 'OTHER')),
  sku text,
  mrp_paise bigint,
  description text,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create index products_company_id_idx on public.products (company_id);

create policy "products: authenticated read" on public.products
  for select to authenticated using (true);
create policy "products: owner writes" on public.products
  for all using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));

-- ── flexible key-value specs ────────────────────────────────────────────
create table public.product_specifications (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label text not null,
  value text not null,
  created_at timestamptz not null default now()
);

alter table public.product_specifications enable row level security;

create index product_specifications_product_id_idx on public.product_specifications (product_id);

create policy "product_specifications: authenticated read" on public.product_specifications
  for select to authenticated using (true);
create policy "product_specifications: owner writes" on public.product_specifications
  for all using (
    exists (
      select 1 from public.products
      where products.id = product_specifications.product_id
        and public.is_company_owner(products.company_id)
    )
  ) with check (
    exists (
      select 1 from public.products
      where products.id = product_specifications.product_id
        and public.is_company_owner(products.company_id)
    )
  );

-- ── structured test results ─────────────────────────────────────────────
create table public.product_test_results (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  test_name text not null,
  result text not null,
  lab_name text,
  tested_at date,
  created_at timestamptz not null default now()
);

alter table public.product_test_results enable row level security;

create index product_test_results_product_id_idx on public.product_test_results (product_id);

create policy "product_test_results: authenticated read" on public.product_test_results
  for select to authenticated using (true);
create policy "product_test_results: owner writes" on public.product_test_results
  for all using (
    exists (
      select 1 from public.products
      where products.id = product_test_results.product_id
        and public.is_company_owner(products.company_id)
    )
  ) with check (
    exists (
      select 1 from public.products
      where products.id = product_test_results.product_id
        and public.is_company_owner(products.company_id)
    )
  );
