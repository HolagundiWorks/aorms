-- Client Portal — read-only project visibility + submissions (change
-- requests, feedback, meeting requests, acknowledgements), scoped to the
-- logged-in client's own projects. Port of backend/src/modules/portal/
-- router.ts's shape, trimmed to a first vertical slice: the old router also
-- surfaces running bills, inspections, site visits, tenders, steel certs,
-- RA bills, and a project-wide activity feed — those need either more
-- schema (an activities table) or more cross-cutting work (every existing
-- staff action would need to also write to it) and are flagged as
-- follow-ups, not silently dropped. `respondApproval`/`respondToImpact`
-- (client writes that mutate OTHER tables' rows, e.g. approvals.status)
-- are also deferred — they need a business-rule-guarded RPC, not a broad
-- RLS update policy, and weren't rushed here.
--
-- RLS idiom matches precedent already laid down for this exact portal in
-- migrations 0001 (`clients: own portal read`) and 0006 (`transmittals:
-- own portal read`) — `current_app_role() = 'CLIENT' and project_id in
-- (select po.id from project_offices po where po.client_id = (select
-- client_id from profiles where id = auth.uid()))` — not a new helper
-- function, to stay consistent with what's already live rather than
-- introduce a second convention.
--
-- Every read policy below also enforces the same status/visibility filter
-- the old backend's lib/sync/hubPortal.ts helpers used (portalIssuedInvoices
-- → ISSUED/PAID, portalSentApprovals → status != DRAFT, portalReadyDrawings
-- → READY, listMoms → ISSUED) — at the RLS layer, not just the app-level
-- query, so a client can never read a draft/unissued row by any path.

-- project_offices: client can read their own project's header fields.
create policy "project_offices: own portal read" on public.project_offices
  for select using (
    public.current_app_role() = 'CLIENT'
    and client_id = (select client_id from public.profiles where id = auth.uid())
  );

-- phases: client can read their own project's phases (for the progress strip).
create policy "phases: own portal read" on public.phases
  for select using (
    public.current_app_role() = 'CLIENT'
    and project_id in (
      select po.id from public.project_offices po
      where po.client_id = (select client_id from public.profiles where id = auth.uid())
    )
  );

-- invoices: only ISSUED/PAID are client-visible — DRAFT/CANCELLED stay
-- office-internal (matches portalIssuedInvoices' status filter).
create policy "invoices: own portal read" on public.invoices
  for select using (
    public.current_app_role() = 'CLIENT'
    and status in ('ISSUED', 'PAID')
    and project_id in (
      select po.id from public.project_offices po
      where po.client_id = (select client_id from public.profiles where id = auth.uid())
    )
  );

-- approvals: anything actually sent (not DRAFT) — matches portalSentApprovals.
create policy "approvals: own portal read" on public.approvals
  for select using (
    public.current_app_role() = 'CLIENT'
    and status != 'DRAFT'
    and project_id in (
      select po.id from public.project_offices po
      where po.client_id = (select client_id from public.profiles where id = auth.uid())
    )
  );

-- drawings: only READY (worker-processed) — matches portalReadyDrawings.
create policy "drawings: own portal read" on public.drawings
  for select using (
    public.current_app_role() = 'CLIENT'
    and status = 'READY'
    and project_id in (
      select po.id from public.project_offices po
      where po.client_id = (select client_id from public.profiles where id = auth.uid())
    )
  );

-- moms: only ISSUED — matches the old router's listMoms filter.
create policy "moms: own portal read" on public.moms
  for select using (
    public.current_app_role() = 'CLIENT'
    and status = 'ISSUED'
    and project_id in (
      select po.id from public.project_offices po
      where po.client_id = (select client_id from public.profiles where id = auth.uid())
    )
  );

-- Tighten the pre-existing transmittals client-read policy (migration 0006):
-- it let a client read every transmittal for their project regardless of
-- issue status, but portalIssuedTransmittals only ever showed ones with a
-- non-null date_issued (an unissued/draft transmittal is office-internal,
-- same reasoning as every other domain above). Additive tightening, not a
-- behavior change for anything currently built (no client-portal screen
-- exists yet to have relied on the looser read).
drop policy if exists "transmittals: own portal read" on public.transmittals;
create policy "transmittals: own portal read" on public.transmittals
  for select using (
    public.current_app_role() = 'CLIENT'
    and date_issued is not null
    and project_id in (
      select po.id from public.project_offices po
      where po.client_id = (select client_id from public.profiles where id = auth.uid())
    )
  );

-- A client's own submissions against a project: acknowledgements, change
-- requests, feedback, and meeting requests. One shared table (matching the
-- old backend's esti_portal_submission), not one table per kind.
create table public.portal_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  kind text not null check (kind in ('ACKNOWLEDGEMENT', 'CHANGE_REQUEST', 'FEEDBACK', 'MEETING_REQUEST')),
  object_type text,
  object_id uuid,
  subject text not null,
  body text,
  rating integer check (rating is null or (rating between 1 and 5)),
  status text not null default 'OPEN',
  response_note text,
  revision_category text check (revision_category is null or revision_category in ('MINOR', 'MAJOR', 'CRITICAL')),
  attention_to_id uuid references public.profiles (id) on delete set null,
  ref_drawing_id uuid references public.drawings (id) on delete set null,
  submitted_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portal_submissions enable row level security;

-- Staff see and manage every submission (respond, change status).
create policy "portal_submissions: staff read" on public.portal_submissions
  for select using (public.is_office_staff());
create policy "portal_submissions: staff write" on public.portal_submissions
  for update using (public.has_capability('write')) with check (public.has_capability('write'));

-- A client sees and creates only their own project's submissions.
create policy "portal_submissions: client read own" on public.portal_submissions
  for select using (
    public.current_app_role() = 'CLIENT'
    and client_id = (select client_id from public.profiles where id = auth.uid())
  );
create policy "portal_submissions: client insert own" on public.portal_submissions
  for insert with check (
    public.current_app_role() = 'CLIENT'
    and client_id = (select client_id from public.profiles where id = auth.uid())
    and project_id in (
      select po.id from public.project_offices po
      where po.client_id = (select client_id from public.profiles where id = auth.uid())
    )
  );

-- Shared firm<->client conversation thread on a submission (port of
-- backend/src/lib/submissionThread.ts's esti_submission_message — only the
-- portal_submission_id side is built here; consultant_submission_id /
-- contractor_submission_id columns are added when those portals land, not
-- guessed at now).
create table public.submission_messages (
  id uuid primary key default gen_random_uuid(),
  portal_submission_id uuid references public.portal_submissions (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  author_side text not null check (author_side in ('FIRM', 'CLIENT', 'CONSULTANT', 'CONTRACTOR')),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.submission_messages enable row level security;

create policy "submission_messages: staff read" on public.submission_messages
  for select using (public.is_office_staff());
create policy "submission_messages: staff write" on public.submission_messages
  for insert with check (public.has_capability('write'));

create policy "submission_messages: client read own" on public.submission_messages
  for select using (
    public.current_app_role() = 'CLIENT'
    and portal_submission_id in (
      select id from public.portal_submissions
      where client_id = (select client_id from public.profiles where id = auth.uid())
    )
  );
create policy "submission_messages: client insert own" on public.submission_messages
  for insert with check (
    public.current_app_role() = 'CLIENT'
    and author_side = 'CLIENT'
    and portal_submission_id in (
      select id from public.portal_submissions
      where client_id = (select client_id from public.profiles where id = auth.uid())
    )
  );
