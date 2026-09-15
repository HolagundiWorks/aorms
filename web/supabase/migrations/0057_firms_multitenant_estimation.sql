-- Multi-tenancy, Batch 3/12 — Estimation & takeoff.
-- rate_books, rate_book_items, estimates, estimate_items,
-- estimate_measurements, spec_catalog_versions, spec_catalog_items,
-- takeoff_items — all Pattern A (capability-gated staff-only, no portal
-- policies in this batch), same firm_id + RLS treatment as batches 1-2.

alter table public.rate_books add column firm_id uuid references public.firms (id);
update public.rate_books set firm_id = (select id from public.firms limit 1);
alter table public.rate_books
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index rate_books_firm_id_idx on public.rate_books (firm_id);
alter policy "rate_books: fees:manage read" on public.rate_books
  using (public.has_capability('fees:manage') and firm_id = public.current_firm_id());
alter policy "rate_books: fees:manage write" on public.rate_books
  using (public.has_capability('fees:manage') and firm_id = public.current_firm_id())
  with check (public.has_capability('fees:manage') and firm_id = public.current_firm_id());

alter table public.rate_book_items add column firm_id uuid references public.firms (id);
update public.rate_book_items set firm_id = (select id from public.firms limit 1);
alter table public.rate_book_items
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index rate_book_items_firm_id_idx on public.rate_book_items (firm_id);
alter policy "rate_book_items: fees:manage read" on public.rate_book_items
  using (public.has_capability('fees:manage') and firm_id = public.current_firm_id());
alter policy "rate_book_items: fees:manage write" on public.rate_book_items
  using (public.has_capability('fees:manage') and firm_id = public.current_firm_id())
  with check (public.has_capability('fees:manage') and firm_id = public.current_firm_id());

alter table public.estimates add column firm_id uuid references public.firms (id);
update public.estimates set firm_id = (select id from public.firms limit 1);
alter table public.estimates
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index estimates_firm_id_idx on public.estimates (firm_id);
alter policy "estimates: fees:manage read" on public.estimates
  using (public.has_capability('fees:manage') and firm_id = public.current_firm_id());
alter policy "estimates: fees:manage write" on public.estimates
  using (public.has_capability('fees:manage') and firm_id = public.current_firm_id())
  with check (public.has_capability('fees:manage') and firm_id = public.current_firm_id());

alter table public.estimate_items add column firm_id uuid references public.firms (id);
update public.estimate_items set firm_id = (select id from public.firms limit 1);
alter table public.estimate_items
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index estimate_items_firm_id_idx on public.estimate_items (firm_id);
alter policy "estimate_items: fees:manage read" on public.estimate_items
  using (public.has_capability('fees:manage') and firm_id = public.current_firm_id());
alter policy "estimate_items: fees:manage write" on public.estimate_items
  using (public.has_capability('fees:manage') and firm_id = public.current_firm_id())
  with check (public.has_capability('fees:manage') and firm_id = public.current_firm_id());

alter table public.estimate_measurements add column firm_id uuid references public.firms (id);
update public.estimate_measurements set firm_id = (select id from public.firms limit 1);
alter table public.estimate_measurements
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index estimate_measurements_firm_id_idx on public.estimate_measurements (firm_id);
alter policy "estimate_measurements: fees:manage read" on public.estimate_measurements
  using (public.has_capability('fees:manage') and firm_id = public.current_firm_id());
alter policy "estimate_measurements: fees:manage write" on public.estimate_measurements
  using (public.has_capability('fees:manage') and firm_id = public.current_firm_id())
  with check (public.has_capability('fees:manage') and firm_id = public.current_firm_id());

alter table public.spec_catalog_versions add column firm_id uuid references public.firms (id);
update public.spec_catalog_versions set firm_id = (select id from public.firms limit 1);
alter table public.spec_catalog_versions
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index spec_catalog_versions_firm_id_idx on public.spec_catalog_versions (firm_id);
alter policy "spec_catalog_versions: staff read" on public.spec_catalog_versions
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "spec_catalog_versions: staff write" on public.spec_catalog_versions
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

alter table public.spec_catalog_items add column firm_id uuid references public.firms (id);
update public.spec_catalog_items set firm_id = (select id from public.firms limit 1);
alter table public.spec_catalog_items
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index spec_catalog_items_firm_id_idx on public.spec_catalog_items (firm_id);
alter policy "spec_catalog_items: staff read" on public.spec_catalog_items
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "spec_catalog_items: staff write" on public.spec_catalog_items
  using (public.is_office_staff() and firm_id = public.current_firm_id())
  with check (public.is_office_staff() and firm_id = public.current_firm_id());

alter table public.takeoff_items add column firm_id uuid references public.firms (id);
update public.takeoff_items set firm_id = (select id from public.firms limit 1);
alter table public.takeoff_items
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index takeoff_items_firm_id_idx on public.takeoff_items (firm_id);
alter policy "takeoff_items: staff read" on public.takeoff_items
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "takeoff_items: write capability" on public.takeoff_items
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());
