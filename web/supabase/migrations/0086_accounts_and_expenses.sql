-- Office Expenses / Cash Book (2026-09-24) — live QA found ROADMAP.md
-- claiming "reconciliation, cash book" were already live in web/ when
-- neither existed at all (/accounts 404s, no matching route/table
-- anywhere). Both existed once in the OLD backend/worker stack (dead,
-- not redeployed from this repo — see CLAUDE.md's "Dev / verify loop"
-- callout) — this is a faithful port of that proven business logic into
-- web/'s own conventions (Supabase RLS, Server Actions, Carbon), not a
-- from-scratch design. Follows the same firm-scoped RLS shape every
-- other tenant table uses (public.is_office_staff() / public.has_capability(...)
-- + firm_id = public.current_firm_id() — see migration 0080's own header
-- comment for the precedent this copies), and the same ref-minting
-- convention as drawings/letters/etc. (public.next_ref, migration 0003 —
-- 'expense' -> 'EXP' is already hardcoded there).

-- ── accounts ─────────────────────────────────────────────────────────────
-- Chart of accounts. System-seeded only (public.ensure_default_accounts,
-- security definer below) — no direct insert/update/delete policy, so a
-- caller can never write an arbitrary account row for their firm or any
-- other firm.
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) default public.current_firm_id(),
  code text not null,
  name text not null,
  kind text not null check (kind in ('OPERATING', 'EXPENSE', 'CASH')),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (firm_id, code)
);

create index accounts_firm_id_idx on public.accounts (firm_id);

alter table public.accounts enable row level security;

create policy "accounts: staff read" on public.accounts
  for select using (public.is_office_staff() and firm_id = public.current_firm_id());
-- No write policy — system-seeded only, via ensure_default_accounts().

-- Seeds a firm's default chart of accounts the first time it's needed
-- (called from createExpenseRecord() when a firm's account count is
-- zero, so a firm never 500s recording its first expense). `p_firm_id`
-- is deliberately NOT trusted as-is: this function is security definer
-- (bypasses RLS to write a table with no insert policy at all), so
-- without pinning it to the caller's own current_firm_id() a signed-in
-- user from any firm could call ensure_default_accounts(<other firm's
-- id>) and write rows into a firm they don't belong to — the exact
-- privilege-escalation class CLAUDE.md's own RLS postmortems call out.
-- The parameter still exists (rather than dropping it and reading
-- current_firm_id() alone) because it's clearer at the call site and
-- gives a cheap consistency check for free.
create function public.ensure_default_accounts(p_firm_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_firm_id is distinct from public.current_firm_id() then
    raise exception 'ensure_default_accounts: p_firm_id must match the caller''s current firm';
  end if;

  insert into public.accounts (firm_id, code, name, kind, is_system)
  values
    (p_firm_id, 'MAIN', 'Main Operating Account', 'OPERATING', true),
    (p_firm_id, 'OFFICE_EXPENSE', 'Office Expenses', 'EXPENSE', true),
    (p_firm_id, 'CASH', 'Cash', 'CASH', true),
    (p_firm_id, 'PROJECT_EXPENSE', 'Project Expenses', 'EXPENSE', true)
  on conflict (firm_id, code) do nothing;
end;
$$;

grant execute on function public.ensure_default_accounts(uuid) to authenticated;

-- ── expenses ─────────────────────────────────────────────────────────────
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) default public.current_firm_id(),
  ref text not null,
  scope text not null check (scope in ('OFFICE', 'PROJECT')),
  project_id uuid references public.project_offices (id),
  billing_class text not null default 'NON_BILLABLE' check (billing_class in ('BILLABLE', 'NON_BILLABLE')),
  category text not null check (category in ('TRAVEL', 'FOOD', 'ACCOMMODATION', 'MISC', 'INVOICING_COST')),
  payment_method text not null check (payment_method in ('CASH', 'BANK', 'CARD', 'UPI')),
  account_id uuid not null references public.accounts (id),
  amount_paise bigint not null,
  expense_date date not null,
  payee text,
  description text,
  receipt_key text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SUBMITTED', 'AUDITED', 'REJECTED', 'CLOSED')),
  recovery_status text not null default 'NA' check (recovery_status in ('NA', 'PENDING', 'INVOICED', 'WRITTEN_OFF')),
  recovered_on_invoice_id uuid references public.invoices (id),
  submitted_by_id uuid references public.profiles (id),
  audited_by_id uuid references public.profiles (id),
  closed_by_id uuid references public.profiles (id),
  audited_at timestamptz,
  closed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, ref),
  constraint expenses_scope_project_id_check
    check ((scope = 'OFFICE' and project_id is null) or (scope = 'PROJECT' and project_id is not null))
);

create index expenses_firm_id_idx on public.expenses (firm_id);
create index expenses_project_id_idx on public.expenses (project_id);
create index expenses_status_idx on public.expenses (status);

alter table public.expenses enable row level security;

create policy "expenses: staff read" on public.expenses
  for select using (public.is_office_staff() and firm_id = public.current_firm_id());

create policy "expenses: staff create draft" on public.expenses
  for insert with check (
    public.has_capability('write') and firm_id = public.current_firm_id() and status = 'DRAFT'
  );

-- A plain `with check` mirroring the `using` clause exactly (capability +
-- firm only, no status constraint) would let any "write"-tier caller
-- PATCH a DRAFT row's status straight to AUDITED/CLOSED/REJECTED — or
-- flip recovery_status/recovered_on_invoice_id — via a direct PostgREST
-- call, bypassing the finance-only submit/audit/close/mark-recovered
-- gate entirely. This is exactly the "using constrains the old row, but
-- with check leaves the new row's key columns unconstrained" bug class
-- CLAUDE.md's own membership-update postmortem calls out — so the with
-- check here is intentionally narrower than a literal mirror of `using`:
-- it still lets any write-tier staff member freely edit a DRAFT expense
-- (nothing else about that changes) and advance it exactly one step to
-- SUBMITTED (what createExpenseRecord/submitExpense need), but a caller
-- without finance:ops can never jump straight to AUDITED/REJECTED/CLOSED
-- this way — that transition only exists on the "finance approve" policy
-- below.
create policy "expenses: staff update draft" on public.expenses
  for update using (
    public.has_capability('write') and firm_id = public.current_firm_id() and status = 'DRAFT'
  )
  with check (
    public.has_capability('write') and firm_id = public.current_firm_id() and status in ('DRAFT', 'SUBMITTED')
  );

-- Covers the SUBMITTED->AUDITED/REJECTED, AUDITED->CLOSED, and
-- CLOSED->recovery_status transitions (all UPDATEs from the app's own
-- already role-gated Server Actions — see lib/actions/expenses.ts's
-- FINANCE_OPS_ROLES). `with check` mirrors `using` exactly here: unlike
-- the policy above, both sides already require finance:ops AND firm
-- match on the (single) row being touched, so there is no unconstrained
-- column a lower-privileged caller could reach through this policy — a
-- finance:ops caller staying within their own firm can freely move
-- status/recovery fields, which is the intended breadth of what "finance
-- approve" means.
create policy "expenses: finance approve" on public.expenses
  for update using (
    public.has_capability('finance:ops') and firm_id = public.current_firm_id()
  )
  with check (
    public.has_capability('finance:ops') and firm_id = public.current_firm_id()
  );
