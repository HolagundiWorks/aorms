-- Revision cost delta (2026-09-15) — closes a real landing-page/product
-- gap found by cross-verification: the marketing site's Revision
-- Management showcase shows a per-revision ₹ cost-delta figure ("Cost
-- delta on this revision"), but the real `decisions` table (migration
-- 0034) had no such column at all — that figure was a hardcoded
-- illustrative constant in the landing page's own RevisionLifecyclePanel.
-- tsx, with nothing behind it in the real product.
--
-- Nullable, signed (paise, same unit convention as invoices/proposals
-- elsewhere in this schema) — a revision that adds scope carries a
-- positive value, one that removes scope can carry a negative one; most
-- revisions simply leave it null (not every decision has a cost impact
-- worth quantifying, and forcing a number on every row would just
-- produce noise).

alter table public.decisions
  add column cost_delta_paise bigint;

comment on column public.decisions.cost_delta_paise is
  'Optional signed cost impact of this revision, in paise — positive for added scope/fee, negative for a concession. Null when the revision has no quantified cost impact.';
