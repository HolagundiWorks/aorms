-- Multi-tenancy, Batch 5/12 — Delivery & tenders.
-- contractors, contractor_submissions, approvals, tenders,
-- tender_invitations, tender_bids. Several CONTRACTOR-portal policies here
-- (Pattern B) — firm_id added as a top-level AND on every one, including
-- write-path policies (insert/update), not just reads.

alter table public.contractors add column firm_id uuid references public.firms (id);
update public.contractors set firm_id = (select id from public.firms limit 1);
alter table public.contractors
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index contractors_firm_id_idx on public.contractors (firm_id);
alter policy "contractors: staff read" on public.contractors
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "contractors: staff write" on public.contractors
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "contractors: own portal read" on public.contractors
  using (public.current_app_role() = 'CONTRACTOR'
         and firm_id = public.current_firm_id()
         and id = (select profiles.contractor_id from public.profiles where profiles.id = auth.uid()));

alter table public.contractor_submissions add column firm_id uuid references public.firms (id);
update public.contractor_submissions set firm_id = (select id from public.firms limit 1);
alter table public.contractor_submissions
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index contractor_submissions_firm_id_idx on public.contractor_submissions (firm_id);
alter policy "contractor_submissions: staff read" on public.contractor_submissions
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "contractor_submissions: staff write" on public.contractor_submissions
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

alter table public.approvals add column firm_id uuid references public.firms (id);
update public.approvals set firm_id = (select id from public.firms limit 1);
alter table public.approvals
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index approvals_firm_id_idx on public.approvals (firm_id);
alter policy "approvals: staff read" on public.approvals
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "approvals: staff write" on public.approvals
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "approvals: own portal read" on public.approvals
  using (public.current_app_role() = 'CLIENT'
         and firm_id = public.current_firm_id()
         and status <> 'DRAFT'
         and project_id in (select po.id from public.project_offices po
                              where po.client_id = (select profiles.client_id from public.profiles where profiles.id = auth.uid())));

alter table public.tenders add column firm_id uuid references public.firms (id);
update public.tenders set firm_id = (select id from public.firms limit 1);
alter table public.tenders
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index tenders_firm_id_idx on public.tenders (firm_id);
alter policy "tenders: staff read" on public.tenders
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "tenders: write capability" on public.tenders
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());
alter policy "tenders: own portal read" on public.tenders
  using (public.current_app_role() = 'CONTRACTOR'
         and firm_id = public.current_firm_id()
         and id in (select ti.tender_id from public.tender_invitations ti
                      where ti.contractor_id = (select profiles.contractor_id from public.profiles where profiles.id = auth.uid())));

alter table public.tender_invitations add column firm_id uuid references public.firms (id);
update public.tender_invitations set firm_id = (select id from public.firms limit 1);
alter table public.tender_invitations
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index tender_invitations_firm_id_idx on public.tender_invitations (firm_id);
alter policy "tender_invitations: staff read" on public.tender_invitations
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "tender_invitations: write capability" on public.tender_invitations
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());
alter policy "tender_invitations: own portal read" on public.tender_invitations
  using (public.current_app_role() = 'CONTRACTOR'
         and firm_id = public.current_firm_id()
         and contractor_id = (select profiles.contractor_id from public.profiles where profiles.id = auth.uid()));
alter policy "tender_invitations: own portal update status" on public.tender_invitations
  using (public.current_app_role() = 'CONTRACTOR'
         and firm_id = public.current_firm_id()
         and contractor_id = (select profiles.contractor_id from public.profiles where profiles.id = auth.uid()))
  with check (firm_id = public.current_firm_id()
              and contractor_id = (select profiles.contractor_id from public.profiles where profiles.id = auth.uid())
              and status = any (array['VIEWED', 'DECLINED', 'SUBMITTED']));

alter table public.tender_bids add column firm_id uuid references public.firms (id);
update public.tender_bids set firm_id = (select id from public.firms limit 1);
alter table public.tender_bids
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index tender_bids_firm_id_idx on public.tender_bids (firm_id);
alter policy "tender_bids: staff read" on public.tender_bids
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "tender_bids: write capability" on public.tender_bids
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());
alter policy "tender_bids: own portal read" on public.tender_bids
  using (public.current_app_role() = 'CONTRACTOR'
         and firm_id = public.current_firm_id()
         and invitation_id in (select ti.id from public.tender_invitations ti
                                 where ti.contractor_id = (select profiles.contractor_id from public.profiles where profiles.id = auth.uid())));
alter policy "tender_bids: own portal insert" on public.tender_bids
  with check (public.current_app_role() = 'CONTRACTOR'
              and firm_id = public.current_firm_id()
              and invitation_id in (select ti.id from public.tender_invitations ti
                                      where ti.contractor_id = (select profiles.contractor_id from public.profiles where profiles.id = auth.uid())));
alter policy "tender_bids: own portal update" on public.tender_bids
  using (public.current_app_role() = 'CONTRACTOR'
         and firm_id = public.current_firm_id()
         and invitation_id in (select ti.id from public.tender_invitations ti
                                 where ti.contractor_id = (select profiles.contractor_id from public.profiles where profiles.id = auth.uid())))
  with check (firm_id = public.current_firm_id()
              and invitation_id in (select ti.id from public.tender_invitations ti
                                      where ti.contractor_id = (select profiles.contractor_id from public.profiles where profiles.id = auth.uid())));
