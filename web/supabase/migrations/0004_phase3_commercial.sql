-- Phase 3 — Commercial: proposals, letters, contracts, invoices, purchase orders.
-- Port of backend/src/db/schema/project.ts (proposals/letters/contracts) and
-- backend/src/db/schema/financial.ts (purchase_orders/po_items/invoices).
-- Capability gates per docs/esti/NEXTJS-MIGRATION-PHASE3-AUDIT.md:
--   proposals              -> fees:manage    (read AND write, both gated)
--   invoices                -> invoice:manage (read AND write, both gated)
--   letters/contracts/POs   -> is_office_staff() only (no capability gate today —
--                               matches current backend behaviour; don't tighten
--                               this silently as a side effect of the port)
-- reconciliations (esti_reconcile) deliberately NOT included — depends on the
-- Python worker (Phase 6), out of Commercial scope per the audit.

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  project_id uuid not null references public.project_offices (id),
  status text not null default 'DRAFT',
  revision_no integer not null default 0,
  work_category text not null,
  work_type text not null default 'ARCHITECTURE',
  fee_basis text not null default 'COA_PERCENT' check (fee_basis in ('COA_PERCENT', 'PER_SQM', 'LUMPSUM')),
  cost_of_works_paise bigint not null default 0,
  fee_paise bigint not null default 0,
  built_up_area_sqm double precision,
  rate_per_sqm_paise bigint,
  doc_comm_pct integer not null default 10,
  coa_minimum_paise bigint not null default 0,
  below_minimum boolean not null default false,
  override_reason text,
  scope text,
  notes text,
  -- Project OS client-approval gate — a distinct state machine from `status` above.
  client_approval_status text not null default 'PENDING',
  client_approved_at timestamptz,
  approval_notes text,
  pdf_key text,
  pdf_status text not null default 'NONE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.proposals enable row level security;
create policy "proposals: fees:manage read" on public.proposals
  for select using (public.has_capability('fees:manage'));
create policy "proposals: fees:manage write" on public.proposals
  for all using (public.has_capability('fees:manage')) with check (public.has_capability('fees:manage'));

create table public.letters (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  project_id uuid references public.project_offices (id),
  recipient text not null,
  subject text not null,
  body text not null,
  date_letter date,
  pdf_key text,
  pdf_status text not null default 'NONE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.letters enable row level security;
create policy "letters: staff read" on public.letters
  for select using (public.is_office_staff());
create policy "letters: staff write" on public.letters
  for all using (public.is_office_staff()) with check (public.is_office_staff());

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  project_id uuid references public.project_offices (id),
  title text not null,
  party text not null,
  contract_type text not null default 'CLIENT',
  value_paise bigint not null default 0,
  start_date date,
  end_date date,
  status text not null default 'DRAFT',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contracts enable row level security;
create policy "contracts: staff read" on public.contracts
  for select using (public.is_office_staff());
create policy "contracts: staff write" on public.contracts
  for all using (public.is_office_staff()) with check (public.is_office_staff());

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  project_id uuid not null references public.project_offices (id),
  vendor text,
  title text,
  status text not null default 'DRAFT',
  date_po date,
  notes text,
  total_paise bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.purchase_orders enable row level security;
create policy "purchase_orders: staff read" on public.purchase_orders
  for select using (public.is_office_staff());
create policy "purchase_orders: staff write" on public.purchase_orders
  for all using (public.is_office_staff()) with check (public.is_office_staff());

create table public.po_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders (id) on delete cascade,
  description text not null,
  unit text,
  qty double precision not null default 0,
  rate_paise bigint not null default 0,
  amount_paise bigint not null default 0,
  sort_order integer not null default 0
  -- spec_item_id / catalog_item_id FKs deferred until the Library/Spec (Phase 9)
  -- and Knowledge Bank catalogue tables exist.
);

alter table public.po_items enable row level security;
create policy "po_items: staff read" on public.po_items
  for select using (public.is_office_staff());
create policy "po_items: staff write" on public.po_items
  for all using (public.is_office_staff()) with check (public.is_office_staff());

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  project_id uuid not null references public.project_offices (id),
  phase_id uuid references public.phases (id),
  client_id uuid references public.clients (id),
  status text not null default 'DRAFT',
  gst_system text not null,
  document_kind text not null,
  sac text,
  inter_state boolean not null default false,
  place_of_supply_state text,
  tds_applicable boolean not null default true,
  is_advance boolean not null default false,
  taxable_paise bigint not null default 0,
  cgst_paise bigint not null default 0,
  sgst_paise bigint not null default 0,
  igst_paise bigint not null default 0,
  gst_total_paise bigint not null default 0,
  composition_levy_paise bigint not null default 0,
  tds_paise bigint not null default 0,
  grand_total_paise bigint not null default 0,
  net_receivable_paise bigint not null default 0,
  paid_paise bigint not null default 0,
  date_invoice date,
  notes text,
  pdf_key text,
  pdf_status text not null default 'NONE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invoices enable row level security;
create policy "invoices: invoice:manage read" on public.invoices
  for select using (public.has_capability('invoice:manage'));
create policy "invoices: invoice:manage write" on public.invoices
  for all using (public.has_capability('invoice:manage')) with check (public.has_capability('invoice:manage'));
