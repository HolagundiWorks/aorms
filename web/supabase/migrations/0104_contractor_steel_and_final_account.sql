-- Contractor Portal: steel reconciliation read access (2026-10-08). Applied live to `aorms-web`.
-- Final account and the joint-measurement abstract are derived views over existing rows (pmc_ra_bills / pmc_ra_lines /
-- pmc_variations) and need no schema. Steel certs are visible to the contractor once certified.
create policy "pmc_steel_certs: contractor own read" on public.pmc_steel_certs for select
  using (public.current_app_role() = 'CONTRACTOR' and firm_id = public.current_firm_id()
    and status in ('CERTIFIED', 'SENT_TO_CLIENT', 'CLOSED')
    and package_id in (select pk.id from public.pmc_packages pk where pk.contractor_id = public.my_contractor_id()));

-- Demo steel certificates for the Lakeview project; re-applied nightly at 21:52 UTC. Idempotent.
create or replace function public.seed_contractor_steel_demo() returns void language sql security definer set search_path = '' as $$
  insert into public.pmc_steel_certs (id, firm_id, project_id, package_id, ref, period_start, period_end, status, issued_kg, consumed_kg, wastage_pct, narrative)
  select md5('demo-steel-' || d.n)::uuid, pk.firm_id, pk.project_id, pk.id, 'STL-DEMO-0' || d.n, d.s, d.e, 'CLOSED', d.i, d.c, round(((d.i - d.c) / d.i * 100)::numeric, 2), d.t
  from public.pmc_packages pk,
    (values (1, date '2026-08-01', date '2026-08-31', 4200.0, 4090.0, 'Footing reinforcement, Fe500D'), (2, date '2026-09-01', date '2026-09-30', 5600.0, 5310.0, 'Plinth beam and column starters')) as d(n, s, e, i, c, t)
  where pk.project_id = '8072d05b-bff6-4090-ac93-8907ab434ed2' and pk.contractor_id is not null
  on conflict (id) do nothing;
$$;
revoke execute on function public.seed_contractor_steel_demo() from public, anon, authenticated;
select cron.schedule('seed-contractor-steel-demo', '52 21 * * *', 'select public.seed_contractor_steel_demo()');
