-- Multi-tenancy, Batch 2/12 — Commercial.
--
-- firm_id + RLS for proposals/letters/contracts/purchase_orders/po_items/
-- invoices, plus the `sequences`/`next_ref()` special case (0003): its
-- uniqueness key becomes (firm_id, scope, fy) so every firm gets its own
-- independent document numbering starting at 1, and next_ref() resolves
-- the firm internally rather than trusting a caller-supplied value.
--
-- Also fixes a real bug this batch would otherwise introduce: proposals/
-- letters/contracts/purchase_orders/invoices each declared `ref text not
-- null unique` — globally unique. Once two firms both call next_ref() for
-- the same scope in the same FY, they'd generate the same ref string
-- (e.g. both "PRP/2026-27/0001") and the second firm's insert would fail
-- on that global uniqueness. Each becomes `unique (firm_id, ref)` instead.
-- Constraint names below are Postgres's default naming for an inline
-- `unique` column constraint (`<table>_<column>_key`) — already confirmed
-- correct for `firm_singleton_key` in the prior batch's schema.

-- ── sequences / next_ref() ──────────────────────────────────────────────
alter table public.sequences add column firm_id uuid references public.firms (id);
update public.sequences set firm_id = (select id from public.firms limit 1);
alter table public.sequences
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id(),
  drop constraint sequences_scope_fy_key,
  add constraint sequences_firm_scope_fy_key unique (firm_id, scope, fy);

alter policy "sequences: staff read" on public.sequences
  using (public.is_office_staff() and firm_id = public.current_firm_id());

create or replace function public.next_ref(p_scope text, p_default_prefix text, p_at timestamptz default now())
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fy text := public.financial_year(p_at);
  v_firm_id uuid := public.current_firm_id();
  v_seq integer;
  v_prefix text;
  v_padding integer;
begin
  if v_firm_id is null then
    raise exception 'next_ref(): no resolvable firm for the current session';
  end if;

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

  insert into public.sequences (firm_id, scope, fy, last_value)
  values (v_firm_id, p_scope, v_fy, 1)
  on conflict (firm_id, scope, fy)
  do update set last_value = sequences.last_value + 1
  returning last_value into v_seq;

  return v_prefix || '/' || v_fy || '/' || lpad(v_seq::text, v_padding, '0');
end;
$$;

comment on function public.next_ref(text, text, timestamptz) is
  'Per-firm gap-free numbering — resolves the firm from the caller''s own session via current_firm_id(), raises if none. Firm-level numberingPatterns overrides not yet ported.';

-- ── proposals ────────────────────────────────────────────────────────────
alter table public.proposals add column firm_id uuid references public.firms (id);
update public.proposals set firm_id = (select id from public.firms limit 1);
alter table public.proposals
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id(),
  drop constraint proposals_ref_key,
  add constraint proposals_firm_id_ref_key unique (firm_id, ref);
create index proposals_firm_id_idx on public.proposals (firm_id);

alter policy "proposals: fees:manage read" on public.proposals
  using (public.has_capability('fees:manage') and firm_id = public.current_firm_id());
alter policy "proposals: fees:manage write" on public.proposals
  using (public.has_capability('fees:manage') and firm_id = public.current_firm_id())
  with check (public.has_capability('fees:manage') and firm_id = public.current_firm_id());

-- ── letters ──────────────────────────────────────────────────────────────
alter table public.letters add column firm_id uuid references public.firms (id);
update public.letters set firm_id = (select id from public.firms limit 1);
alter table public.letters
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id(),
  drop constraint letters_ref_key,
  add constraint letters_firm_id_ref_key unique (firm_id, ref);
create index letters_firm_id_idx on public.letters (firm_id);

alter policy "letters: staff read" on public.letters
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "letters: staff write" on public.letters
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

-- ── contracts ────────────────────────────────────────────────────────────
alter table public.contracts add column firm_id uuid references public.firms (id);
update public.contracts set firm_id = (select id from public.firms limit 1);
alter table public.contracts
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id(),
  drop constraint contracts_ref_key,
  add constraint contracts_firm_id_ref_key unique (firm_id, ref);
create index contracts_firm_id_idx on public.contracts (firm_id);

alter policy "contracts: staff read" on public.contracts
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "contracts: staff write" on public.contracts
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

-- ── purchase_orders ──────────────────────────────────────────────────────
alter table public.purchase_orders add column firm_id uuid references public.firms (id);
update public.purchase_orders set firm_id = (select id from public.firms limit 1);
alter table public.purchase_orders
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id(),
  drop constraint purchase_orders_ref_key,
  add constraint purchase_orders_firm_id_ref_key unique (firm_id, ref);
create index purchase_orders_firm_id_idx on public.purchase_orders (firm_id);

alter policy "purchase_orders: staff read" on public.purchase_orders
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "purchase_orders: staff write" on public.purchase_orders
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

-- ── po_items ─────────────────────────────────────────────────────────────
alter table public.po_items add column firm_id uuid references public.firms (id);
update public.po_items set firm_id = (select id from public.firms limit 1);
alter table public.po_items
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index po_items_firm_id_idx on public.po_items (firm_id);

alter policy "po_items: staff read" on public.po_items
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "po_items: staff write" on public.po_items
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

-- ── invoices ─────────────────────────────────────────────────────────────
alter table public.invoices add column firm_id uuid references public.firms (id);
update public.invoices set firm_id = (select id from public.firms limit 1);
alter table public.invoices
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id(),
  drop constraint invoices_ref_key,
  add constraint invoices_firm_id_ref_key unique (firm_id, ref);
create index invoices_firm_id_idx on public.invoices (firm_id);

alter policy "invoices: invoice:manage read" on public.invoices
  using (public.has_capability('invoice:manage') and firm_id = public.current_firm_id());
alter policy "invoices: invoice:manage write" on public.invoices
  using (public.has_capability('invoice:manage') and firm_id = public.current_firm_id())
  with check (public.has_capability('invoice:manage') and firm_id = public.current_firm_id());
alter policy "invoices: own portal read" on public.invoices
  using (public.current_app_role() = 'CLIENT'
         and firm_id = public.current_firm_id()
         and status = any (array['ISSUED', 'PAID'])
         and project_id in (select po.id from public.project_offices po
                              where po.client_id = (select profiles.client_id from public.profiles where profiles.id = auth.uid())));
