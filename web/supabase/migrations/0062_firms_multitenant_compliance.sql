-- Multi-tenancy, Batch 8/12 -- Compliance & lessons.
-- compliance_far, compliance_setback, compliance_nbc, compliance_fire,
-- compliance_regulation, compliance_docs, lessons_learned. Uniform
-- Pattern A (staff read + write capability/staff write).

alter table public.compliance_far add column firm_id uuid references public.firms (id);
update public.compliance_far set firm_id = (select id from public.firms limit 1);
alter table public.compliance_far
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index compliance_far_firm_id_idx on public.compliance_far (firm_id);
alter policy "compliance_far: staff read" on public.compliance_far
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "compliance_far: write capability" on public.compliance_far
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.compliance_setback add column firm_id uuid references public.firms (id);
update public.compliance_setback set firm_id = (select id from public.firms limit 1);
alter table public.compliance_setback
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index compliance_setback_firm_id_idx on public.compliance_setback (firm_id);
alter policy "compliance_setback: staff read" on public.compliance_setback
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "compliance_setback: write capability" on public.compliance_setback
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.compliance_nbc add column firm_id uuid references public.firms (id);
update public.compliance_nbc set firm_id = (select id from public.firms limit 1);
alter table public.compliance_nbc
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index compliance_nbc_firm_id_idx on public.compliance_nbc (firm_id);
alter policy "compliance_nbc: staff read" on public.compliance_nbc
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "compliance_nbc: write capability" on public.compliance_nbc
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.compliance_fire add column firm_id uuid references public.firms (id);
update public.compliance_fire set firm_id = (select id from public.firms limit 1);
alter table public.compliance_fire
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index compliance_fire_firm_id_idx on public.compliance_fire (firm_id);
alter policy "compliance_fire: staff read" on public.compliance_fire
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "compliance_fire: write capability" on public.compliance_fire
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.compliance_regulation add column firm_id uuid references public.firms (id);
update public.compliance_regulation set firm_id = (select id from public.firms limit 1);
alter table public.compliance_regulation
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index compliance_regulation_firm_id_idx on public.compliance_regulation (firm_id);
alter policy "compliance_regulation: staff read" on public.compliance_regulation
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "compliance_regulation: write capability" on public.compliance_regulation
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.compliance_docs add column firm_id uuid references public.firms (id);
update public.compliance_docs set firm_id = (select id from public.firms limit 1);
alter table public.compliance_docs
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index compliance_docs_firm_id_idx on public.compliance_docs (firm_id);
alter policy "compliance_docs: staff read" on public.compliance_docs
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "compliance_docs: write capability" on public.compliance_docs
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.lessons_learned add column firm_id uuid references public.firms (id);
update public.lessons_learned set firm_id = (select id from public.firms limit 1);
alter table public.lessons_learned
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index lessons_learned_firm_id_idx on public.lessons_learned (firm_id);
alter policy "lessons_learned: staff read" on public.lessons_learned
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "lessons_learned: staff write" on public.lessons_learned
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

