-- Studio↔Company (roadmap P2): an account saves supplier Companies from the Material
-- Catalogue to find them again. Own-rows only: the account reads and deletes its own
-- saves through its session; inserts go through the Server Action (service role) after
-- validating the company exists, so there is deliberately no INSERT policy.
create table if not exists connectdex.saved_vendors (
  account_id uuid not null references public.accounts (id) on delete cascade,
  company_id uuid not null references connectdex.companies (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (account_id, company_id)
);
create index if not exists saved_vendors_company_idx on connectdex.saved_vendors (company_id);

alter table connectdex.saved_vendors enable row level security;
create policy "saved_vendors: own read" on connectdex.saved_vendors
  for select using (account_id = (select auth.uid()));
create policy "saved_vendors: own delete" on connectdex.saved_vendors
  for delete using (account_id = (select auth.uid()));

grant select, delete on connectdex.saved_vendors to authenticated;
grant all on connectdex.saved_vendors to service_role;
