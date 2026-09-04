-- Gap-free per-(scope, financial-year) document numbering.
-- Port of backend/src/lib/numbering.ts's nextRef() + packages/contracts/src/fy.ts's
-- financialYear(). India FY: Apr 1 - Mar 31, computed in IST (Asia/Kolkata).
--
-- NOT ported here: per-firm numbering overrides (org settings' numberingPatterns,
-- which can override prefix/padding per scope). This function always uses the
-- DEFAULT_NUMBERING_SCOPES prefix/padding from packages/contracts/src/document.ts.
-- Firm-level overrides need firm/org_settings to exist first — deferred until
-- that table is ported.

create table public.sequences (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  fy text not null,
  last_value integer not null default 0,
  unique (scope, fy)
);

alter table public.sequences enable row level security;

create policy "sequences: staff read" on public.sequences
  for select using (public.is_office_staff());
-- No direct write policy — only next_ref() (security definer) may write.

create or replace function public.financial_year(at timestamptz default now())
returns text
language sql
stable
as $$
  select case
    when extract(month from (at at time zone 'Asia/Kolkata')) >= 4
      then extract(year from (at at time zone 'Asia/Kolkata'))::text
           || '-' || lpad(((extract(year from (at at time zone 'Asia/Kolkata'))::int + 1) % 100)::text, 2, '0')
    else (extract(year from (at at time zone 'Asia/Kolkata'))::int - 1)::text
           || '-' || lpad((extract(year from (at at time zone 'Asia/Kolkata'))::int % 100)::text, 2, '0')
  end;
$$;

create or replace function public.next_ref(p_scope text, p_default_prefix text, p_at timestamptz default now())
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fy text := public.financial_year(p_at);
  v_seq integer;
  v_prefix text;
  v_padding integer;
begin
  select case p_scope
    when 'letter'      then 'LTR'
    when 'contract'    then 'CTR'
    when 'transmittal' then 'TRN'
    when 'inspection'  then 'SIR'
    when 'specsheet'   then 'SPC'
    when 'moodboard'   then 'MOOD'
    when 'proposal'    then 'PRP'
    when 'feeproposal' then 'FEE'
    when 'mom'         then 'MOM'
    when 'expense'     then 'EXP'
    when 'tender'      then 'TND'
    else p_default_prefix
  end into v_prefix;
  v_padding := 4;

  insert into public.sequences (scope, fy, last_value)
  values (p_scope, v_fy, 1)
  on conflict (scope, fy)
  do update set last_value = sequences.last_value + 1
  returning last_value into v_seq;

  return v_prefix || '/' || v_fy || '/' || lpad(v_seq::text, v_padding, '0');
end;
$$;

comment on function public.next_ref(text, text, timestamptz) is
  'Port of backend/src/lib/numbering.ts nextRef(). Firm-level numberingPatterns overrides not yet ported — see migration header comment.';
