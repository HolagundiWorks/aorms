-- ConnectDeX differentiator #1 (roadmap P2): Studio → supplier quote requests.
-- APPLIED 2026-10-01 to the live `aorms-platform` project; insert + trigger verified in a
-- rolled-back block.
--  * Inserts only via the Server Action (service role) — no INSERT policy on purpose.
--  * Requester can read their own requests; a company OWNER can read requests for their
--    company and respond. The owner's UPDATE is restricted by a COLUMN-level grant to
--    status/reply/replied_at, so RLS-allowed rows can't have requester/message rewritten.
--  * Creation is logged to platform_activity_log (CONNECTDEX_QUOTE_REQUESTED).
create table if not exists connectdex.quote_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references connectdex.products (id) on delete cascade,
  company_id uuid not null references connectdex.companies (id) on delete cascade,
  requester_id uuid not null references public.accounts (id) on delete cascade,
  studio_id uuid references public.studios (id) on delete set null,
  quantity text,
  message text not null check (char_length(message) between 1 and 2000),
  status text not null default 'NEW' check (status in ('NEW', 'READ', 'REPLIED', 'CLOSED')),
  reply text check (reply is null or char_length(reply) <= 2000),
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists quote_requests_company_idx on connectdex.quote_requests (company_id, created_at desc);
create index if not exists quote_requests_requester_idx on connectdex.quote_requests (requester_id, created_at desc);
create index if not exists quote_requests_product_idx on connectdex.quote_requests (product_id);
create index if not exists quote_requests_studio_idx on connectdex.quote_requests (studio_id);

alter table connectdex.quote_requests enable row level security;
create policy "quote_requests: requester read" on connectdex.quote_requests
  for select using (requester_id = (select auth.uid()));
create policy "quote_requests: company owner read" on connectdex.quote_requests
  for select using (connectdex.is_company_owner(company_id));
create policy "quote_requests: company owner respond" on connectdex.quote_requests
  for update using (connectdex.is_company_owner(company_id)) with check (connectdex.is_company_owner(company_id));

grant select on connectdex.quote_requests to authenticated;
grant update (status, reply, replied_at) on connectdex.quote_requests to authenticated;
grant all on connectdex.quote_requests to service_role;

create or replace function connectdex.log_quote_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.log_platform_activity('CONNECTDEX_QUOTE_REQUESTED', new.requester_id, new.studio_id,
    jsonb_build_object('product_id', new.product_id), new.company_id, null);
  return new;
end; $$;
create trigger after_quote_request_insert_log after insert on connectdex.quote_requests
  for each row execute function connectdex.log_quote_request();
revoke execute on function connectdex.log_quote_request() from public, anon, authenticated;
