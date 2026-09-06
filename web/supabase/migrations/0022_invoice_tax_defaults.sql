-- Tax engine wiring (Phase 3's own flagged gap: "invoices don't compute GST
-- — DRAFT with a taxable amount only"). Every GST/TDS column already exists
-- on `invoices` (migration 0002) — this only adds the one missing firm-level
-- default the old backend's createInvoice.ts read (`firm.tdsApplicableDefault`)
-- and never had a Supabase column for.

alter table public.firm
  add column tds_applicable_default boolean not null default true;
