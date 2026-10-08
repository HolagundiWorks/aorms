-- Contractor Portal pending items + AQC-Core billing terms (2026-10-08). See docs/esti/CONTRACTOR-PORTAL.md.
-- Part 1 (meeting/progress/attachments/ra-lines read/bucket) was applied to the live `aorms-web` project first; this file records it.
-- Part 2 (statutory terms + measurement-line RA bills) ports HolagundiWorks/AQC `RunningBill` (lib/billing/ra-bill.ts is the TS twin).

alter table public.contractor_submissions add column if not exists meeting_at timestamptz;
alter table public.contractor_submissions add column if not exists meeting_place text;
alter table public.contractor_submissions add column if not exists milestone_id uuid references public.pmc_milestones (id) on delete set null;
alter table public.contractor_submissions add column if not exists percent_complete integer check (percent_complete between 0 and 100);
alter table public.pmc_ra_bills add column if not exists attachment_key text;
alter table public.pmc_ra_bills add column if not exists attachment_name text;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pmc_ra_lines' and policyname = 'pmc_ra_lines: contractor own read') then
    create policy "pmc_ra_lines: contractor own read" on public.pmc_ra_lines for select
      using (public.current_app_role() = 'CONTRACTOR' and firm_id = public.current_firm_id()
        and bill_id in (select b.id from public.pmc_ra_bills b where b.submitted_by_contractor_id = public.my_contractor_id()));
  end if;
end $$;

insert into storage.buckets (id, name, public) values ('contractor-attachments', 'contractor-attachments', false) on conflict (id) do nothing;

-- AQC statutory terms on the bill (percentages of gross; GST added on top).
alter table public.pmc_ra_bills add column if not exists retention_pct numeric not null default 5;
alter table public.pmc_ra_bills add column if not exists gst_pct numeric not null default 0;
alter table public.pmc_ra_bills add column if not exists tds_pct numeric not null default 0;
alter table public.pmc_ra_bills add column if not exists cess_pct numeric not null default 0;
alter table public.pmc_ra_bills add column if not exists gst_tds_pct numeric not null default 0;
alter table public.pmc_ra_bills add column if not exists gst_paise bigint not null default 0;
alter table public.pmc_ra_bills add column if not exists tds_paise bigint not null default 0;
alter table public.pmc_ra_bills add column if not exists cess_paise bigint not null default 0;
alter table public.pmc_ra_bills add column if not exists gst_tds_paise bigint not null default 0;

-- Measurement-line RA bill: lines are [{description, unit, previous_qty, this_qty, rate_paise}]; amounts and
-- deductions are computed here with the same rounding as the app (Math.round == numeric round for >= 0).
create or replace function public.submit_contractor_ra_bill_lines(p_package uuid, p_bill_no text, p_start date, p_end date, p_narrative text, p_terms jsonb, p_lines jsonb)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_contractor uuid := public.my_contractor_id();
  v_firm uuid := public.current_firm_id();
  v_pk record; v_fy text; v_seq integer; v_id uuid; v_ln jsonb; v_i integer := 0;
  v_gross bigint := 0; v_amt bigint;
  v_ret numeric := greatest(0, coalesce((p_terms->>'retention_pct')::numeric, 5));
  v_gst numeric := greatest(0, coalesce((p_terms->>'gst_pct')::numeric, 0));
  v_tds numeric := greatest(0, coalesce((p_terms->>'tds_pct')::numeric, 0));
  v_cess numeric := greatest(0, coalesce((p_terms->>'cess_pct')::numeric, 0));
  v_gtds numeric := greatest(0, coalesce((p_terms->>'gst_tds_pct')::numeric, 0));
  v_adv bigint := greatest(0, coalesce((p_terms->>'advance_recovery_paise')::bigint, 0));
begin
  if v_contractor is null then raise exception 'not authorized'; end if;
  select * into v_pk from public.pmc_packages where id = p_package and contractor_id = v_contractor and firm_id = v_firm and status in ('AWARDED', 'IN_PROGRESS');
  if not found then raise exception 'That package is not open for billing.'; end if;
  if coalesce(trim(p_bill_no), '') = '' then raise exception 'Bill number is required.'; end if;
  if p_start is null or p_end is null or p_end < p_start then raise exception 'Enter a valid billing period.'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 or jsonb_array_length(p_lines) > 200 then raise exception 'Add between 1 and 200 measurement lines.'; end if;
  if v_ret > 100 or v_gst > 100 or v_tds > 100 or v_cess > 100 or v_gtds > 100 then raise exception 'Percentages must be between 0 and 100.'; end if;
  for v_ln in select * from jsonb_array_elements(p_lines) loop
    v_gross := v_gross + round(greatest(0, (v_ln->>'rate_paise')::numeric) * greatest(0, (v_ln->>'this_qty')::numeric));
  end loop;
  if v_gross <= 0 then raise exception 'Enter the gross amount claimed.'; end if;
  if v_pk.contract_value_paise is not null and v_gross > v_pk.contract_value_paise then raise exception 'A single bill cannot exceed the contract value.'; end if;
  v_fy := public.financial_year(now());
  insert into public.sequences (firm_id, scope, fy, last_value) values (v_firm, 'pmc_ra_bill', v_fy, 1)
  on conflict (firm_id, scope, fy) do update set last_value = public.sequences.last_value + 1
  returning last_value into v_seq;
  insert into public.pmc_ra_bills (project_id, package_id, ref, bill_no, period_start, period_end, status, gross_paise, narrative, submitted_by_contractor_id, submitted_at, firm_id,
    retention_pct, gst_pct, tds_pct, cess_pct, gst_tds_pct, retention_paise, gst_paise, tds_paise, cess_paise, gst_tds_paise, advance_recovery_paise)
  values (v_pk.project_id, v_pk.id, 'RA/' || v_fy || '/' || lpad(v_seq::text, 4, '0'), trim(p_bill_no), p_start, p_end, 'DRAFT', v_gross, left(p_narrative, 2000), v_contractor, now(), v_firm,
    v_ret, v_gst, v_tds, v_cess, v_gtds, round(v_gross * v_ret / 100), round(v_gross * v_gst / 100), round(v_gross * v_tds / 100), round(v_gross * v_cess / 100), round(v_gross * v_gtds / 100), v_adv)
  returning id into v_id;
  for v_ln in select * from jsonb_array_elements(p_lines) loop
    v_amt := round(greatest(0, (v_ln->>'rate_paise')::numeric) * greatest(0, (v_ln->>'this_qty')::numeric));
    insert into public.pmc_ra_lines (bill_id, sort_order, description, unit, previous_qty, this_qty, rate_paise, amount_paise, firm_id)
    values (v_id, v_i, left(coalesce(v_ln->>'description', ''), 300), left(v_ln->>'unit', 20), greatest(0, coalesce((v_ln->>'previous_qty')::double precision, 0)), greatest(0, (v_ln->>'this_qty')::double precision), greatest(0, (v_ln->>'rate_paise')::bigint), v_amt, v_firm);
    v_i := v_i + 1;
  end loop;
  return v_id;
end;
$$;
revoke execute on function public.submit_contractor_ra_bill_lines(uuid, text, date, date, text, jsonb, jsonb) from public, anon;
grant execute on function public.submit_contractor_ra_bill_lines(uuid, text, date, date, text, jsonb, jsonb) to authenticated;
