-- Estimate markups cascade — the user flagged that Rate Books/Estimation
-- don't match HolagundiWorks/AQC's reference implementation. AQC's
-- EstimateMarkups/EstimateMarkupBreakdown (BBSApp/Services/EstimateMarkups.cs)
-- applies four cascading percentage add-ons on an estimate's base total
-- (civil + materials + steel in AQC; rate-book items here) — Electrical,
-- Plumbing, Escalation (on base+E+P), and Consulting Fee (on base+E+P+Esc)
-- — which this repo's `estimates` table never had at all (only
-- contingency_pct + gst_pct, applied flat, not cascaded). Defaults match
-- AQC's own EstimateMarkups.Reset() values (8/6/5/3), a real DSR-abstract
-- convention, not arbitrary.

alter table public.estimates
  add column electrical_pct double precision not null default 8,
  add column plumbing_pct double precision not null default 6,
  add column escalation_pct double precision not null default 5,
  add column consulting_fee_pct double precision not null default 3;
