-- 2026-09-14, explicit request ("remove the demo for demo projects, and
-- demo prefixes, everywhere") — every seeded demo record's human-visible
-- name/title/subject carries a literal "Demo — " prefix (e.g. "Demo —
-- Aurelia Residences Phase 2", "Demo — Ananya & Kabir Menon"), added by
-- migrations 0035/0041/0042 specifically so seeded rows were visually
-- unmistakable from anything a real user might later create by hand.
-- That job is done; this strips the prefix wherever it's still present.
--
-- Deliberately data-only (no schema change) and deliberately scoped to
-- just the "Demo — " display-name prefix, not the separate "DEMO-"
-- reference-code prefix several tables' own `ref` columns carry (e.g.
-- project_offices.ref = 'DEMO-PRJ-05', invoices.ref = 'DEMO-INV-01') —
-- those are unique, sequence-derived identifiers next_ref() and similar
-- helpers generate and other code may format/parse assuming a prefix
-- shape; changing them is a materially different, riskier change than
-- relabeling a name a person actually reads, and wasn't unambiguously
-- what was asked. Flagged as a separate decision if it's wanted too.
--
-- Scans every text/character varying column in the public schema rather
-- than a hand-maintained list of "every table the demo seed touched" —
-- correct by construction (nothing to miss or mistype) and inherently
-- safe regardless of table: the regex only ever touches a row whose
-- value actually starts with the literal prefix, so a real, non-demo row
-- that happens to live in the same table is never touched.
do $$
declare
  r record;
  affected int;
  total int := 0;
begin
  for r in
    select c.table_name, c.column_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.data_type in ('text', 'character varying')
      and t.table_type = 'BASE TABLE' -- excludes views (e.g. tender_bids_sealed) — not directly updatable
  loop
    execute format(
      'update public.%I set %I = regexp_replace(%I, ''^Demo — '', '''') where %I ~ ''^Demo — ''',
      r.table_name, r.column_name, r.column_name, r.column_name
    );
    get diagnostics affected = row_count;
    if affected > 0 then
      raise notice '%.%: % row(s) updated', r.table_name, r.column_name, affected;
      total := total + affected;
    end if;
  end loop;
  raise notice 'Total rows updated: %', total;
end $$;
