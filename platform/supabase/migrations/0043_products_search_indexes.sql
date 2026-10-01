-- Platform audit R5/P1 (docs/esti/PLATFORMS-AUDIT-2026-10-01.md): the Materials
-- directory searches `products.name ilike '%q%'`, which cannot use a btree index.
-- A trigram GIN index makes substring search index-assisted as the catalogue grows;
-- the composite index serves per-company category counts (Base Line cap) and
-- category filtering. APPLIED 2026-10-01 to the live `aorms-platform` project.
create extension if not exists pg_trgm with schema extensions;
create index if not exists products_name_trgm_idx on connectdex.products using gin (name extensions.gin_trgm_ops);
create index if not exists products_company_category_idx on connectdex.products (company_id, category);
