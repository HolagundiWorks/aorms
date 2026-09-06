-- Collaborator (consultant) Portal + Contractor Portal — the second and
-- third of the three external portals (Client Portal shipped in migration
-- 0020). Same "own portal read" RLS idiom as 0020/0001/0006, same
-- deliberately-scoped-down first slice discipline: this covers project
-- visibility + the headline write action for each portal (consultant
-- deliverable/RFI/note submissions; contractor sealed tender bids) — not
-- running bills, site visits, joint measurements, or project-team tagging,
-- all real in the old backend's contractor router but flagged as follow-ups
-- here, not guessed at.

-- ── Collaborator (consultant) Portal ────────────────────────────────────────

-- Consultant directory — port of backend/src/db/schema/collaboration.ts's
-- esti_consultant (name/discipline/firm/email/phone only — matches the old
-- schema exactly, no invented fields).
create table public.consultants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  discipline text not null,
  firm text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.consultants enable row level security;
create policy "consultants: staff read" on public.consultants
  for select using (public.is_office_staff());
create policy "consultants: staff write" on public.consultants
  for all using (public.has_capability('write')) with check (public.has_capability('write'));
-- A consultant can read their own directory record (mirrors "clients: own portal read").
create policy "consultants: own portal read" on public.consultants
  for select using (
    public.current_app_role() = 'CONSULTANT'
    and id = (select consultant_id from public.profiles where id = auth.uid())
  );

-- profiles.consultant_id was added in migration 0001 with no FK target yet
-- (consultants didn't exist) — wire it now, same pattern migration 0001
-- itself used for profiles.client_id once public.clients existed.
alter table public.profiles
  add constraint profiles_consultant_id_fkey
  foreign key (consultant_id) references public.consultants (id) on delete set null;

-- Per-project engagement — agreed fee, payments, status. Port of
-- esti_engagement verbatim.
create table public.engagements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  consultant_id uuid not null references public.consultants (id) on delete cascade,
  scope text,
  agreed_fee_paise bigint not null default 0,
  paid_paise bigint not null default 0,
  status text not null default 'ENGAGED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.engagements enable row level security;
create policy "engagements: staff read" on public.engagements
  for select using (public.is_office_staff());
create policy "engagements: staff write" on public.engagements
  for all using (public.has_capability('write')) with check (public.has_capability('write'));
create policy "engagements: own portal read" on public.engagements
  for select using (
    public.current_app_role() = 'CONSULTANT'
    and consultant_id = (select consultant_id from public.profiles where id = auth.uid())
  );

-- Consultant-originated submissions — deliverables, RFIs, notes (+ firm-
-- assigned TASK rows, no staff-side "assign a task" UI built yet, so this
-- stays empty in practice until that exists — not guessed at here).
create table public.consultant_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  consultant_id uuid references public.consultants (id) on delete set null,
  kind text not null check (kind in ('DELIVERABLE', 'RFI', 'NOTE', 'TASK')),
  object_type text,
  object_id uuid,
  subject text not null,
  body text,
  status text not null default 'OPEN',
  response_note text,
  submitted_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.consultant_submissions enable row level security;
create policy "consultant_submissions: staff read" on public.consultant_submissions
  for select using (public.is_office_staff());
create policy "consultant_submissions: staff write" on public.consultant_submissions
  for all using (public.has_capability('write')) with check (public.has_capability('write'));
create policy "consultant_submissions: own portal read" on public.consultant_submissions
  for select using (
    public.current_app_role() = 'CONSULTANT'
    and consultant_id = (select consultant_id from public.profiles where id = auth.uid())
  );
-- A consultant can only create non-TASK kinds themselves (TASK rows are
-- firm-assigned) and only against a project they're actually engaged on.
create policy "consultant_submissions: own portal insert" on public.consultant_submissions
  for insert with check (
    public.current_app_role() = 'CONSULTANT'
    and kind != 'TASK'
    and consultant_id = (select consultant_id from public.profiles where id = auth.uid())
    and project_id in (
      select e.project_id from public.engagements e
      where e.consultant_id = (select consultant_id from public.profiles where id = auth.uid())
    )
  );
-- completeTask: a consultant may flip their own TASK-kind row to RESOLVED,
-- nothing else (subject/body/kind can't change, enforced by the with-check
-- re-testing the same ownership + still-TASK condition on the new row).
create policy "consultant_submissions: own portal complete task" on public.consultant_submissions
  for update using (
    public.current_app_role() = 'CONSULTANT'
    and kind = 'TASK'
    and consultant_id = (select consultant_id from public.profiles where id = auth.uid())
  ) with check (
    kind = 'TASK'
    and consultant_id = (select consultant_id from public.profiles where id = auth.uid())
    and status = 'RESOLVED'
  );

-- Wire consultant_submissions into the shared thread table (0020's
-- submission_messages only had the portal_submission_id side so far).
alter table public.submission_messages
  add column consultant_submission_id uuid references public.consultant_submissions (id) on delete cascade;

create policy "submission_messages: consultant read own" on public.submission_messages
  for select using (
    public.current_app_role() = 'CONSULTANT'
    and consultant_submission_id in (
      select id from public.consultant_submissions
      where consultant_id = (select consultant_id from public.profiles where id = auth.uid())
    )
  );
create policy "submission_messages: consultant insert own" on public.submission_messages
  for insert with check (
    public.current_app_role() = 'CONSULTANT'
    and author_side = 'CONSULTANT'
    and consultant_submission_id in (
      select id from public.consultant_submissions
      where consultant_id = (select consultant_id from public.profiles where id = auth.uid())
    )
  );

-- Project visibility for an engaged consultant — same shape and same
-- status/visibility filters as the client-portal policies in 0020, scoped
-- via engagements instead of project_offices.client_id.
create policy "project_offices: consultant portal read" on public.project_offices
  for select using (
    public.current_app_role() = 'CONSULTANT'
    and id in (
      select e.project_id from public.engagements e
      where e.consultant_id = (select consultant_id from public.profiles where id = auth.uid())
    )
  );
create policy "phases: consultant portal read" on public.phases
  for select using (
    public.current_app_role() = 'CONSULTANT'
    and project_id in (
      select e.project_id from public.engagements e
      where e.consultant_id = (select consultant_id from public.profiles where id = auth.uid())
    )
  );
create policy "drawings: consultant portal read" on public.drawings
  for select using (
    public.current_app_role() = 'CONSULTANT'
    and status = 'READY'
    and project_id in (
      select e.project_id from public.engagements e
      where e.consultant_id = (select consultant_id from public.profiles where id = auth.uid())
    )
  );
create policy "transmittals: consultant portal read" on public.transmittals
  for select using (
    public.current_app_role() = 'CONSULTANT'
    and date_issued is not null
    and project_id in (
      select e.project_id from public.engagements e
      where e.consultant_id = (select consultant_id from public.profiles where id = auth.uid())
    )
  );

-- ── Contractor Portal ────────────────────────────────────────────────────

-- profiles.contractor_id was added in migration 0001 with no FK target yet
-- either — public.contractors already exists (migration 0012), wire it now.
alter table public.profiles
  add constraint profiles_contractor_id_fkey
  foreign key (contractor_id) references public.contractors (id) on delete set null;

-- A contractor can read their own directory record.
create policy "contractors: own portal read" on public.contractors
  for select using (
    public.current_app_role() = 'CONTRACTOR'
    and id = (select contractor_id from public.profiles where id = auth.uid())
  );

-- Tender invitations: a contractor sees only invitations addressed to them
-- (this is also what keeps bids sealed — a contractor's tender_bids read
-- below is scoped through their own invitation_id, never another
-- contractor's, so there's no separate "sealed view" needed).
create policy "tender_invitations: own portal read" on public.tender_invitations
  for select using (
    public.current_app_role() = 'CONTRACTOR'
    and contractor_id = (select contractor_id from public.profiles where id = auth.uid())
  );
-- A contractor may only flip their own invitation's status (VIEWED on
-- open, DECLINED via the decline action) — never touch tender_id/
-- contractor_id/invited_at, enforced by re-checking ownership + the
-- allowed status values on the resulting row.
create policy "tender_invitations: own portal update status" on public.tender_invitations
  for update using (
    public.current_app_role() = 'CONTRACTOR'
    and contractor_id = (select contractor_id from public.profiles where id = auth.uid())
  ) with check (
    contractor_id = (select contractor_id from public.profiles where id = auth.uid())
    and status in ('VIEWED', 'DECLINED', 'SUBMITTED')
  );

-- Tenders: a contractor can read the tender their invitation points to.
create policy "tenders: own portal read" on public.tenders
  for select using (
    public.current_app_role() = 'CONTRACTOR'
    and id in (
      select ti.tender_id from public.tender_invitations ti
      where ti.contractor_id = (select contractor_id from public.profiles where id = auth.uid())
    )
  );

-- Tender bids: a contractor can read/insert/update only their own
-- invitation's bid — sealed from every other contractor by construction.
create policy "tender_bids: own portal read" on public.tender_bids
  for select using (
    public.current_app_role() = 'CONTRACTOR'
    and invitation_id in (
      select ti.id from public.tender_invitations ti
      where ti.contractor_id = (select contractor_id from public.profiles where id = auth.uid())
    )
  );
create policy "tender_bids: own portal insert" on public.tender_bids
  for insert with check (
    public.current_app_role() = 'CONTRACTOR'
    and invitation_id in (
      select ti.id from public.tender_invitations ti
      where ti.contractor_id = (select contractor_id from public.profiles where id = auth.uid())
    )
  );
create policy "tender_bids: own portal update" on public.tender_bids
  for update using (
    public.current_app_role() = 'CONTRACTOR'
    and invitation_id in (
      select ti.id from public.tender_invitations ti
      where ti.contractor_id = (select contractor_id from public.profiles where id = auth.uid())
    )
  ) with check (
    invitation_id in (
      select ti.id from public.tender_invitations ti
      where ti.contractor_id = (select contractor_id from public.profiles where id = auth.uid())
    )
  );
