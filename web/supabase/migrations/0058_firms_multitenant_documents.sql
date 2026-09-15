-- Multi-tenancy, Batch 4/12 — Documents.
-- spec_sheets, spec_items, transmittals, transmittal_items, drawings,
-- document_issues, office_templates, moms, mom_actions. Portal (Pattern B)
-- policies here (drawings/moms/transmittals/transmittal_items) get the
-- firm_id check as a top-level AND, same discipline as batches 1-2.

alter table public.spec_sheets add column firm_id uuid references public.firms (id);
update public.spec_sheets set firm_id = (select id from public.firms limit 1);
alter table public.spec_sheets
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index spec_sheets_firm_id_idx on public.spec_sheets (firm_id);
alter policy "spec_sheets: staff read" on public.spec_sheets
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "spec_sheets: staff write" on public.spec_sheets
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

alter table public.spec_items add column firm_id uuid references public.firms (id);
update public.spec_items set firm_id = (select id from public.firms limit 1);
alter table public.spec_items
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index spec_items_firm_id_idx on public.spec_items (firm_id);
alter policy "spec_items: staff read" on public.spec_items
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "spec_items: staff write" on public.spec_items
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

alter table public.transmittals add column firm_id uuid references public.firms (id);
update public.transmittals set firm_id = (select id from public.firms limit 1);
alter table public.transmittals
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index transmittals_firm_id_idx on public.transmittals (firm_id);
alter policy "transmittals: staff read" on public.transmittals
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "transmittals: staff write" on public.transmittals
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "transmittals: own portal read" on public.transmittals
  using (public.current_app_role() = 'CLIENT'
         and firm_id = public.current_firm_id()
         and date_issued is not null
         and project_id in (select po.id from public.project_offices po
                              where po.client_id = (select profiles.client_id from public.profiles where profiles.id = auth.uid())));
alter policy "transmittals: consultant portal read" on public.transmittals
  using (public.current_app_role() = 'CONSULTANT'
         and firm_id = public.current_firm_id()
         and date_issued is not null
         and project_id in (select e.project_id from public.engagements e
                              where e.consultant_id = (select profiles.consultant_id from public.profiles where profiles.id = auth.uid())));

alter table public.transmittal_items add column firm_id uuid references public.firms (id);
update public.transmittal_items set firm_id = (select id from public.firms limit 1);
alter table public.transmittal_items
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index transmittal_items_firm_id_idx on public.transmittal_items (firm_id);
alter policy "transmittal_items: staff read" on public.transmittal_items
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "transmittal_items: staff write" on public.transmittal_items
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "transmittal_items: own portal read" on public.transmittal_items
  using (public.current_app_role() = 'CLIENT'
         and firm_id = public.current_firm_id()
         and transmittal_id in (select t.id from public.transmittals t join public.project_offices po on po.id = t.project_id
                                  where po.client_id = (select profiles.client_id from public.profiles where profiles.id = auth.uid())));

alter table public.drawings add column firm_id uuid references public.firms (id);
update public.drawings set firm_id = (select id from public.firms limit 1);
alter table public.drawings
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index drawings_firm_id_idx on public.drawings (firm_id);
alter policy "drawings: staff read" on public.drawings
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "drawings: staff write" on public.drawings
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "drawings: own portal read" on public.drawings
  using (public.current_app_role() = 'CLIENT'
         and firm_id = public.current_firm_id()
         and status = 'READY'
         and project_id in (select po.id from public.project_offices po
                              where po.client_id = (select profiles.client_id from public.profiles where profiles.id = auth.uid())));
alter policy "drawings: consultant portal read" on public.drawings
  using (public.current_app_role() = 'CONSULTANT'
         and firm_id = public.current_firm_id()
         and status = 'READY'
         and project_id in (select e.project_id from public.engagements e
                              where e.consultant_id = (select profiles.consultant_id from public.profiles where profiles.id = auth.uid())));

alter table public.document_issues add column firm_id uuid references public.firms (id);
update public.document_issues set firm_id = (select id from public.firms limit 1);
alter table public.document_issues
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index document_issues_firm_id_idx on public.document_issues (firm_id);
alter policy "document_issues: staff read" on public.document_issues
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "document_issues: staff insert" on public.document_issues
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

alter table public.office_templates add column firm_id uuid references public.firms (id);
update public.office_templates set firm_id = (select id from public.firms limit 1);
alter table public.office_templates
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index office_templates_firm_id_idx on public.office_templates (firm_id);
alter policy "office_templates: staff read" on public.office_templates
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "office_templates: staff write" on public.office_templates
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

alter table public.moms add column firm_id uuid references public.firms (id);
update public.moms set firm_id = (select id from public.firms limit 1);
alter table public.moms
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index moms_firm_id_idx on public.moms (firm_id);
alter policy "moms: staff read" on public.moms
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "moms: staff write" on public.moms
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "moms: own portal read" on public.moms
  using (public.current_app_role() = 'CLIENT'
         and firm_id = public.current_firm_id()
         and status = 'ISSUED'
         and project_id in (select po.id from public.project_offices po
                              where po.client_id = (select profiles.client_id from public.profiles where profiles.id = auth.uid())));

alter table public.mom_actions add column firm_id uuid references public.firms (id);
update public.mom_actions set firm_id = (select id from public.firms limit 1);
alter table public.mom_actions
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index mom_actions_firm_id_idx on public.mom_actions (firm_id);
alter policy "mom_actions: staff read" on public.mom_actions
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "mom_actions: staff write" on public.mom_actions
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());
