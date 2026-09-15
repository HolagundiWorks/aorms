-- Multi-tenancy, Batch 10/12 — Portals.
-- portal_submissions, submission_messages, consultants, engagements,
-- consultant_submissions. The densest batch of portal (Pattern B) policies
-- in the schema — every CLIENT/CONSULTANT policy gets firm_id as a
-- top-level AND on its own table's row, independent of how trustworthy
-- any nested join/subquery is (same discipline as every prior batch).

alter table public.consultants add column firm_id uuid references public.firms (id);
update public.consultants set firm_id = (select id from public.firms limit 1);
alter table public.consultants
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index consultants_firm_id_idx on public.consultants (firm_id);
alter policy "consultants: staff read" on public.consultants
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "consultants: staff write" on public.consultants
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());
alter policy "consultants: own portal read" on public.consultants
  using (public.current_app_role() = 'CONSULTANT'
         and firm_id = public.current_firm_id()
         and id = (select profiles.consultant_id from public.profiles where profiles.id = auth.uid()));

alter table public.engagements add column firm_id uuid references public.firms (id);
update public.engagements set firm_id = (select id from public.firms limit 1);
alter table public.engagements
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index engagements_firm_id_idx on public.engagements (firm_id);
alter policy "engagements: staff read" on public.engagements
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "engagements: staff write" on public.engagements
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());
alter policy "engagements: own portal read" on public.engagements
  using (public.current_app_role() = 'CONSULTANT'
         and firm_id = public.current_firm_id()
         and consultant_id = (select profiles.consultant_id from public.profiles where profiles.id = auth.uid()));

alter table public.consultant_submissions add column firm_id uuid references public.firms (id);
update public.consultant_submissions set firm_id = (select id from public.firms limit 1);
alter table public.consultant_submissions
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index consultant_submissions_firm_id_idx on public.consultant_submissions (firm_id);
alter policy "consultant_submissions: staff read" on public.consultant_submissions
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "consultant_submissions: staff write" on public.consultant_submissions
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());
alter policy "consultant_submissions: own portal read" on public.consultant_submissions
  using (public.current_app_role() = 'CONSULTANT'
         and firm_id = public.current_firm_id()
         and consultant_id = (select profiles.consultant_id from public.profiles where profiles.id = auth.uid()));
alter policy "consultant_submissions: own portal insert" on public.consultant_submissions
  with check (public.current_app_role() = 'CONSULTANT'
              and firm_id = public.current_firm_id()
              and kind <> 'TASK'
              and consultant_id = (select profiles.consultant_id from public.profiles where profiles.id = auth.uid())
              and project_id in (select e.project_id from public.engagements e
                                   where e.consultant_id = (select profiles.consultant_id from public.profiles where profiles.id = auth.uid())));
alter policy "consultant_submissions: own portal complete task" on public.consultant_submissions
  using (public.current_app_role() = 'CONSULTANT'
         and firm_id = public.current_firm_id()
         and kind = 'TASK'
         and consultant_id = (select profiles.consultant_id from public.profiles where profiles.id = auth.uid()))
  with check (firm_id = public.current_firm_id()
              and kind = 'TASK'
              and consultant_id = (select profiles.consultant_id from public.profiles where profiles.id = auth.uid())
              and status = 'RESOLVED');

alter table public.portal_submissions add column firm_id uuid references public.firms (id);
update public.portal_submissions set firm_id = (select id from public.firms limit 1);
alter table public.portal_submissions
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index portal_submissions_firm_id_idx on public.portal_submissions (firm_id);
alter policy "portal_submissions: staff read" on public.portal_submissions
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "portal_submissions: staff write" on public.portal_submissions
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());
alter policy "portal_submissions: client read own" on public.portal_submissions
  using (public.current_app_role() = 'CLIENT'
         and firm_id = public.current_firm_id()
         and client_id = (select profiles.client_id from public.profiles where profiles.id = auth.uid()));
alter policy "portal_submissions: client insert own" on public.portal_submissions
  with check (public.current_app_role() = 'CLIENT'
              and firm_id = public.current_firm_id()
              and client_id = (select profiles.client_id from public.profiles where profiles.id = auth.uid())
              and project_id in (select po.id from public.project_offices po
                                   where po.client_id = (select profiles.client_id from public.profiles where profiles.id = auth.uid())));

alter table public.submission_messages add column firm_id uuid references public.firms (id);
update public.submission_messages set firm_id = (select id from public.firms limit 1);
alter table public.submission_messages
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index submission_messages_firm_id_idx on public.submission_messages (firm_id);
alter policy "submission_messages: staff read" on public.submission_messages
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "submission_messages: staff write" on public.submission_messages
  with check (public.has_capability('write') and firm_id = public.current_firm_id());
alter policy "submission_messages: client read own" on public.submission_messages
  using (public.current_app_role() = 'CLIENT'
         and firm_id = public.current_firm_id()
         and portal_submission_id in (select portal_submissions.id from public.portal_submissions
                                        where portal_submissions.client_id = (select profiles.client_id from public.profiles where profiles.id = auth.uid())));
alter policy "submission_messages: client insert own" on public.submission_messages
  with check (public.current_app_role() = 'CLIENT'
              and firm_id = public.current_firm_id()
              and author_side = 'CLIENT'
              and portal_submission_id in (select portal_submissions.id from public.portal_submissions
                                             where portal_submissions.client_id = (select profiles.client_id from public.profiles where profiles.id = auth.uid())));
alter policy "submission_messages: consultant read own" on public.submission_messages
  using (public.current_app_role() = 'CONSULTANT'
         and firm_id = public.current_firm_id()
         and consultant_submission_id in (select consultant_submissions.id from public.consultant_submissions
                                            where consultant_submissions.consultant_id = (select profiles.consultant_id from public.profiles where profiles.id = auth.uid())));
alter policy "submission_messages: consultant insert own" on public.submission_messages
  with check (public.current_app_role() = 'CONSULTANT'
              and firm_id = public.current_firm_id()
              and author_side = 'CONSULTANT'
              and consultant_submission_id in (select consultant_submissions.id from public.consultant_submissions
                                                 where consultant_submissions.consultant_id = (select profiles.consultant_id from public.profiles where profiles.id = auth.uid())));
