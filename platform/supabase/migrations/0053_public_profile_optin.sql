-- Public verified profile (roadmap P2): strictly opt-in. Default false; the Server Action
-- only lets an account with a verified AORMS Identity switch it on, and the public page
-- re-checks both conditions on every render (so losing verification hides the page).
alter table public.account_profile_details
  add column if not exists public_profile boolean not null default false;
