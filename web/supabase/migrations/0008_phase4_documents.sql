-- Phase 4 — Documents: the unified document-issue register, reusable office
-- templates, and meeting minutes. Lands last in Phase 4 per the audit's
-- landing order — its register read model depends on Phase 3
-- (letters/contracts/proposals) and this phase's spec sheets/transmittals,
-- all of which now exist.
--
-- NOT ported here: listDocumentRegister()/registerExportRows() (the fan-in
-- read model normalizing letters/contracts/proposals/transmittals/
-- inspections/spec_sheets/moms into one row shape) — that's a Server
-- Component query, not schema. numberingPatterns/setNumberingPatterns
-- (per-scope prefix/padding override, OWNER-only) deferred until
-- org_settings/firm settings exists — same deferral noted in 0003_numbering.

create table public.document_issues (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in (
    'LETTER', 'CONTRACT', 'PROPOSAL', 'TRANSMITTAL', 'INSPECTION',
    'SPEC_SHEET', 'MOOD_BOARD', 'MOM', 'FEE_PROPOSAL'
  )),
  -- Polymorphic reference (no FK — entity_type selects which table entity_id
  -- points into), same shape as the current esti_document_issue.
  entity_id uuid not null,
  project_id uuid references public.project_offices (id),
  ref text not null,
  version_no integer not null default 1,
  revision_note text,
  impact_note text,
  issued_at timestamptz not null default now(),
  issued_by_id uuid references public.profiles (id),
  pdf_key text,
  created_at timestamptz not null default now()
);

alter table public.document_issues enable row level security;
create policy "document_issues: staff read" on public.document_issues
  for select using (public.is_office_staff());
create policy "document_issues: staff insert" on public.document_issues
  for insert with check (public.is_office_staff());
-- No update/delete policy — immutable per-version issue record, append-only
-- by construction, same pattern as Phase 2's audit_log.

create table public.office_templates (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('LETTER', 'SCOPE', 'COA', 'CONTRACT', 'MOM')),
  title text not null,
  body text not null,
  tags text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.office_templates enable row level security;
create policy "office_templates: staff read" on public.office_templates
  for select using (public.is_office_staff());
create policy "office_templates: staff write" on public.office_templates
  for all using (public.is_office_staff()) with check (public.is_office_staff());
-- No special delete guard — matches current permissiveness (unlike almost
-- everything else in Phases 2-4, template delete has no retention check
-- in the existing backend either).

create table public.moms (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  project_id uuid not null references public.project_offices (id),
  title text not null,
  meeting_date date,
  venue text,
  attendees text,
  minutes text not null default '',
  version_no integer not null default 1,
  status text not null default 'DRAFT',
  pdf_key text,
  pdf_status text not null default 'NONE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.moms enable row level security;
create policy "moms: staff read" on public.moms
  for select using (public.is_office_staff());
create policy "moms: staff write" on public.moms
  for all using (public.is_office_staff()) with check (public.is_office_staff());

create table public.mom_actions (
  id uuid primary key default gen_random_uuid(),
  mom_id uuid not null references public.moms (id) on delete cascade,
  description text not null,
  assignee_name text,
  due_date date,
  status text not null default 'OPEN',
  -- Set by convertActionToTask() when this action is promoted to a real task.
  task_id uuid references public.tasks (id),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.mom_actions enable row level security;
create policy "mom_actions: staff read" on public.mom_actions
  for select using (public.is_office_staff());
create policy "mom_actions: staff write" on public.mom_actions
  for all using (public.is_office_staff()) with check (public.is_office_staff());
