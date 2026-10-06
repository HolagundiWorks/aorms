-- Materials catalogue: SQL-side nearest-first ranking + paging (2026-10-06, roadmap P1).
-- Replaces the app-side "fetch the 500 newest matches, rank in JS" window: ranking (same city → same
-- state → rest, newest first inside each tier), the name/category filters and OFFSET/LIMIT paging now
-- happen in the database, so every matching product is reachable and the page size is the only cap.
-- `total_count` is the full match count (window function) so the page can render "page N of M".
-- Service-role only (called from the Materials Server Component); the catalogue stays platform-wide read.
create or replace function connectdex.search_products(
  p_q text,
  p_category text,
  p_city text,
  p_state text,
  p_limit integer,
  p_offset integer
)
returns table (
  id uuid,
  name text,
  category text,
  sku text,
  mrp_paise bigint,
  company_id uuid,
  company_name text,
  company_public_id text,
  company_city text,
  company_state text,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id, p.name, p.category, p.sku, p.mrp_paise,
    c.id, c.name, c.public_id, c.city, c.state,
    count(*) over ()
  from connectdex.products p
  left join connectdex.companies c on c.id = p.company_id
  where (coalesce(p_q, '') = ''
         or p.name ilike '%' || replace(replace(replace(p_q, '\', '\\'), '%', '\%'), '_', '\_') || '%')
    and (coalesce(p_category, '') = '' or p.category = p_category)
  order by
    case
      when coalesce(p_city, '') <> '' and lower(c.city) = lower(p_city) then 0
      when coalesce(p_state, '') <> '' and lower(c.state) = lower(p_state) then 1
      else 2
    end,
    p.created_at desc,
    p.id
  limit greatest(coalesce(p_limit, 24), 1)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

revoke all on function connectdex.search_products(text, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function connectdex.search_products(text, text, text, text, integer, integer) to service_role;
