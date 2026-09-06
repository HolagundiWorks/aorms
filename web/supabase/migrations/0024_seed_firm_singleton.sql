-- The live project's `firm` table (a Postgres singleton — `UNIQUE
-- (singleton)` + `CHECK (singleton)`, at most one row can ever exist) had
-- zero rows: nobody had ever saved a firm profile, and there's no INSERT
-- RLS policy on it (only "firm: owner/partner update" and "firm: staff
-- read") — by design, edits only ever UPDATE the one row, which means it
-- has to be seeded once, here, rather than created through the app.
-- Surfaced while wiring the invoice tax engine (every firm-level default —
-- GST system, state, GSTIN, TDS default — was silently falling back to
-- code defaults with no real firm row to read). Every other column already
-- has its own sensible column default (company_name='', firm_type='SOLO',
-- gst_type='REGULAR', tds_applicable_default=true) — relying on those
-- rather than guessing real firm details; the settings page this migration
-- unblocks is where an OWNER/PARTNER actually fills them in.

insert into public.firm (singleton) values (true);
