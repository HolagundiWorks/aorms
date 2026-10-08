-- Contractor Portal: current projects (2026-10-08). See docs/esti/CONTRACTOR-PORTAL.md.
-- APPLIED 2026-10-08 to the live `aorms-web` project (created in pieces through the SQL tool).
-- A contractor's "current projects" are those where they hold an awarded package (pmc_packages) or an awarded tender.
-- Reads are RLS-scoped; the two writes that need more than a row check go through security-definer functions.

alter table public.pmc_ra_bills add column if not exists submitted_by_contractor_id uuid references public.contractors (id) on delete set null;
alter table public.pmc_ra_bills add column if not exists submitted_at timestamptz;
alter table public.submission_messages add column if not exists contractor_submission_id uuid references public.contractor_submissions (id) on delete cascade;

create or replace function public.my_contractor_id()
returns uuid language sql stable security definer set search_path = ''
as $$ select p.contractor_id from public.profiles p where p.id = auth.uid() and p.role = 'CONTRACTOR' $$;

create or replace function public.my_contractor_project_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select pk.project_id from public.pmc_packages pk
  where pk.contractor_id = public.my_contractor_id() and pk.firm_id = public.current_firm_id() and pk.status in ('AWARDED', 'IN_PROGRESS', 'COMPLETE')
  union
  select t.project_id from public.tenders t
  where t.awarded_contractor_id = public.my_contractor_id() and t.firm_id = public.current_firm_id()
$$;
revoke execute on function public.my_contractor_id() from public, anon;
revoke execute on function public.my_contractor_project_ids() from public, anon;
grant execute on function public.my_contractor_id() to authenticated;
grant execute on function public.my_contractor_project_ids() to authenticated;

create policy "drawings: contractor portal read" on public.drawings for select
  using (current_app_role() = 'CONTRACTOR' and firm_id = current_firm_id() and status = 'READY' and project_id in (select public.my_contractor_project_ids()));
create policy "pmc_packages: contractor own read" on public.pmc_packages for select
  using (current_app_role() = 'CONTRACTOR' and firm_id = current_firm_id() and contractor_id = public.my_contractor_id());
create policy "pmc_milestones: contractor portal read" on public.pmc_milestones for select
  using (current_app_role() = 'CONTRACTOR' and firm_id = current_firm_id() and project_id in (select public.my_contractor_project_ids()));
create policy "pmc_ra_bills: contractor own read" on public.pmc_ra_bills for select
  using (current_app_role() = 'CONTRACTOR' and firm_id = current_firm_id() and package_id in (select id from public.pmc_packages where contractor_id = public.my_contractor_id()));
create policy "contractor_submissions: contractor own read" on public.contractor_submissions for select
  using (current_app_role() = 'CONTRACTOR' and firm_id = current_firm_id() and contractor_id = public.my_contractor_id());
create policy "contractor_submissions: contractor own insert" on public.contractor_submissions for insert
  with check (current_app_role() = 'CONTRACTOR' and firm_id = current_firm_id() and contractor_id = public.my_contractor_id() and project_id in (select public.my_contractor_project_ids()) and submitted_by_id = auth.uid());
create policy "submission_messages: contractor read own" on public.submission_messages for select
  using (current_app_role() = 'CONTRACTOR' and firm_id = current_firm_id() and contractor_submission_id in (select id from public.contractor_submissions where contractor_id = public.my_contractor_id()));
create policy "submission_messages: contractor insert own" on public.submission_messages for insert
  with check (current_app_role() = 'CONTRACTOR' and firm_id = current_firm_id() and author_side = 'CONTRACTOR' and contractor_submission_id in (select id from public.contractor_submissions where contractor_id = public.my_contractor_id()));

create or replace function public.my_contractor_projects()
returns table (project_id uuid, project_ref text, project_title text, project_status text, city text, package_id uuid, package_ref text, package_title text, trade text, package_status text, contract_value_paise bigint)
language sql stable security definer set search_path = ''
as $$
  select po.id, po.ref, po.title, po.status, po.city, pk.id, pk.ref, pk.title, pk.trade, pk.status, pk.contract_value_paise
  from public.project_offices po
  left join public.pmc_packages pk on pk.project_id = po.id and pk.contractor_id = public.my_contractor_id()
  where po.id in (select public.my_contractor_project_ids()) and po.firm_id = public.current_firm_id()
  order by po.created_at desc
$$;
revoke execute on function public.my_contractor_projects() from public, anon;
grant execute on function public.my_contractor_projects() to authenticated;

create or replace function public.submit_contractor_ra_bill(p_package uuid, p_bill_no text, p_start date, p_end date, p_gross bigint, p_narrative text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_contractor uuid := public.my_contractor_id();
  v_firm uuid := public.current_firm_id();
  v_pk record; v_fy text; v_seq integer; v_id uuid;
begin
  if v_contractor is null then raise exception 'not authorized'; end if;
  select * into v_pk from public.pmc_packages where id = p_package and contractor_id = v_contractor and firm_id = v_firm and status in ('AWARDED', 'IN_PROGRESS');
  if not found then raise exception 'That package is not open for billing.'; end if;
  if coalesce(trim(p_bill_no), '') = '' then raise exception 'Bill number is required.'; end if;
  if p_start is null or p_end is null or p_end < p_start then raise exception 'Enter a valid billing period.'; end if;
  if p_gross is null or p_gross <= 0 then raise exception 'Enter the gross amount claimed.'; end if;
  if v_pk.contract_value_paise is not null and p_gross > v_pk.contract_value_paise then raise exception 'A single bill cannot exceed the contract value.'; end if;
  v_fy := public.financial_year(now());
  insert into public.sequences (firm_id, scope, fy, last_value) values (v_firm, 'pmc_ra_bill', v_fy, 1)
  on conflict (firm_id, scope, fy) do update set last_value = public.sequences.last_value + 1
  returning last_value into v_seq;
  insert into public.pmc_ra_bills (project_id, package_id, ref, bill_no, period_start, period_end, status, gross_paise, narrative, submitted_by_contractor_id, submitted_at, firm_id)
  values (v_pk.project_id, v_pk.id, 'RA/' || v_fy || '/' || lpad(v_seq::text, 4, '0'), trim(p_bill_no), p_start, p_end, 'DRAFT', p_gross, left(p_narrative, 2000), v_contractor, now(), v_firm)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.submit_contractor_ra_bill(uuid, text, date, date, bigint, text) from public, anon;
grant execute on function public.submit_contractor_ra_bill(uuid, text, date, date, bigint, text) to authenticated;

-- Demo data for these (seed_portal_demo_f / _g, wired into seed_portal_demo_data(); idempotent upserts, no deletes).
-- See docs/esti/CONTRACTOR-PORTAL.md for what they create; the function bodies live in the database.
