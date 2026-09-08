-- Per-scope numbering overrides — the one piece migration 0003's own
-- header comment flagged as deferred: "NOT ported here: per-firm
-- numbering overrides (org settings' numberingPatterns, which can
-- override prefix/padding per scope)." Port of backend/src/modules/
-- document/router.ts's numberingPatterns/setNumberingPatterns +
-- packages/contracts/src/document.ts's NumberingPattern shape
-- ({prefix?, padding?}), stored as one row per scope here instead of a
-- single JSON blob on a settings singleton — this repo already prefers
-- real tables over JSON-blob settings elsewhere (see `firm`'s own plain
-- columns), and a real table lets RLS actually enforce the OWNER-only
-- write the old router's `ownerProcedure` gate required, which a JSON
-- column on `firm` couldn't: `firm`'s own RLS is OWNER **or PARTNER**
-- ("firm: owner/partner update", migration 0001) — narrower than that,
-- so this needs its own policy, not a column riding on firm's.
--
-- No check constraint on `scope` — next_ref()'s own CASE statement (see
-- below) only names 11 known scopes, but callers pass ad-hoc scopes too
-- (e.g. estimates.ts's `next_ref('estimate', 'EST')`, which falls through
-- to p_default_prefix since 'estimate' isn't in that CASE) — an override
-- must be settable for any of those too, not just the 11 named ones.

create table public.numbering_patterns (
  id uuid primary key default gen_random_uuid(),
  scope text not null unique,
  prefix text,
  padding integer check (padding is null or (padding >= 2 and padding <= 8)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.numbering_patterns enable row level security;

create policy "numbering_patterns: staff read" on public.numbering_patterns
  for select using (public.is_office_staff());
create policy "numbering_patterns: owner write" on public.numbering_patterns
  for all using (public.current_app_role() = 'OWNER') with check (public.current_app_role() = 'OWNER');

-- next_ref() itself, extended to look up an override before falling back
-- to its existing hardcoded CASE/default — everything else about the
-- function (FY computation, the gap-free sequences table, the return
-- shape) is unchanged from migration 0003.
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
  v_override_prefix text;
  v_override_padding integer;
begin
  select prefix, padding into v_override_prefix, v_override_padding
  from public.numbering_patterns
  where scope = p_scope;

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

  if v_override_prefix is not null then
    v_prefix := v_override_prefix;
  end if;
  if v_override_padding is not null then
    v_padding := v_override_padding;
  end if;

  insert into public.sequences (scope, fy, last_value)
  values (p_scope, v_fy, 1)
  on conflict (scope, fy)
  do update set last_value = sequences.last_value + 1
  returning last_value into v_seq;

  return v_prefix || '/' || v_fy || '/' || lpad(v_seq::text, v_padding, '0');
end;
$$;

comment on function public.next_ref(text, text, timestamptz) is
  'Port of backend/src/lib/numbering.ts nextRef(), now including the firm-level numberingPatterns override migration 0003 deferred — see numbering_patterns table.';
