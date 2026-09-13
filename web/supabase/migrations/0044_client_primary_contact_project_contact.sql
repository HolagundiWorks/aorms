-- 2026-09-14 — two related, distinct contact-info gaps flagged directly:
--
-- 1. `clients` has no way to name a specific person to reach at a
--    COMPANY/ARCHITECT_FIRM client — `name` is the organization's own
--    name, and `email`/`phone` are that organization's general contact
--    details, not a named point of contact. For an INDIVIDUAL client
--    this doesn't matter (the client IS the contact), but for the other
--    two kinds it's a real gap. `contact_person` mirrors the exact
--    column name/shape `contractors.contact_person` already uses
--    (migration 0001) for the same "who do I actually call" need.
--
-- 2. `project_offices` has no contact info of its own at all — a
--    project's day-to-day communication (site coordination, drawing
--    issue notices, etc.) often goes to a different email/phone than
--    the client record's own default, even though the project still
--    reads the client's name/other info via `client_id` as before.
--    `contact_email`/`contact_phone` are a per-project override, kept
--    deliberately independent of `clients.email`/`clients.phone` rather
--    than replacing them — both may legitimately differ.
--
-- Both nullable, no backfill needed (net-new optional fields, not a
-- required-going-forward change) — existing rows are unaffected.

alter table public.clients
  add column contact_person text;

alter table public.project_offices
  add column contact_email text,
  add column contact_phone text;
