-- Site Inspection Reports (2026-09-19) — new feature, added for the
-- Android Pulse widget/app's "Create Site Inspection Report" action.
-- Nothing under this name existed anywhere in web/ before this migration
-- (the old VPS backend's `inspections` tRPC namespace is dead code — see
-- CLAUDE.md's "Dev / verify loop" callout — and was never ported). Follows
-- the same firm-scoped RLS shape every other tenant table in this schema
-- uses (public.is_office_staff() + firm_id = public.current_firm_id()),
-- and the same ref-minting convention as drawings/letters/etc.
-- (public.next_ref, migration 0003/0030/0054).
--
-- Renumbered 0069 -> 0080 on merge (2026-09-20) — originally built and
-- applied live on a separate cloud-agent branch (claude/android-aorms-
-- widget-tv2zvr) that predated main's own 0069_events.sql, a genuine
-- migration-number collision at merge time, not a duplicate. Content
-- unchanged from the original; confirmed still live on aorms-web with
-- both tables, all indexes/RLS policies, and the `esti-site-inspections`
-- storage bucket (private, 10MB limit, image/jpeg|png|webp allowlist —
-- created via the Storage API on that branch, not SQL, so no bucket-
-- creation statement appears in this file) exactly as documented in that
-- branch's own follow-up commit. This backend has no caller yet in the
-- native Android app that shipped since (which uses progress_reports for
-- its Site Reports screen) — kept as ready, uncalled infrastructure
-- rather than discarded, same as this session's own precedent for
-- building a sanctioned surface ahead of its first caller.

create table public.site_inspection_reports (
  id uuid primary key default gen_random_uuid(),
  ref text not null,
  firm_id uuid not null references public.firms (id) default public.current_firm_id(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  inspector_id uuid references public.profiles (id) default auth.uid(),
  visit_date date not null default current_date,
  weather text,
  summary text not null,
  issues_found boolean not null default false,
  follow_up_required boolean not null default false,
  follow_up_notes text,
  gps_lat double precision,
  gps_lng double precision,
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED', 'REVIEWED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, ref)
);

create index site_inspection_reports_firm_id_idx on public.site_inspection_reports (firm_id);
create index site_inspection_reports_project_id_idx on public.site_inspection_reports (project_id);
create index site_inspection_reports_visit_date_idx on public.site_inspection_reports (visit_date);

alter table public.site_inspection_reports enable row level security;

create policy "site_inspection_reports: staff read" on public.site_inspection_reports
  for select using (public.is_office_staff() and firm_id = public.current_firm_id());
create policy "site_inspection_reports: staff write" on public.site_inspection_reports
  for all using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

-- Photos are their own child rows (not a jsonb array on the report) so the
-- mobile app can upload each shot as its own request and keep a per-photo
-- caption/timestamp — the same shape a future web gallery would want too.
-- Storage object itself is written by the service-role route
-- (app/api/mobile/inspections/route.ts), same pattern as
-- lib/drawings/upload.ts's DRAWINGS_BUCKET — this table just records the
-- storage key against the report.
create table public.site_inspection_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.site_inspection_reports (id) on delete cascade,
  storage_key text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index site_inspection_photos_report_id_idx on public.site_inspection_photos (report_id);

alter table public.site_inspection_photos enable row level security;

create policy "site_inspection_photos: staff read" on public.site_inspection_photos
  for select using (
    exists (
      select 1 from public.site_inspection_reports r
      where r.id = report_id
        and public.is_office_staff()
        and r.firm_id = public.current_firm_id()
    )
  );
create policy "site_inspection_photos: staff write" on public.site_inspection_photos
  for all using (
    exists (
      select 1 from public.site_inspection_reports r
      where r.id = report_id
        and public.is_office_staff()
        and r.firm_id = public.current_firm_id()
    )
  )
  with check (
    exists (
      select 1 from public.site_inspection_reports r
      where r.id = report_id
        and public.is_office_staff()
        and r.firm_id = public.current_firm_id()
    )
  );
