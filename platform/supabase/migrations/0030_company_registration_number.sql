-- 2026-09-14 — Company registration number (CIN/LLPIN), a real gap found
-- while re-checking the Company (ConnectDeX supplier) profile against the
-- Identity Portal's new professional-profile feature: the company profile
-- already carries GSTIN (tax registration), PAN (tax ID), and each board
-- member's DIN (Director Identification Number, an individual's MCA ID) —
-- but nothing identifies the *company itself* on the Ministry of Corporate
-- Affairs register. A Pvt Ltd/OPC's CIN or an LLP's LLPIN is the company-
-- level counterpart to a director's own DIN, and is routinely asked for in
-- vendor KYC/onboarding alongside GSTIN/PAN — a real, missing requirement,
-- not a cosmetic addition.
--
-- Nullable and untyped-by-structure deliberately: a proprietorship or
-- partnership has no CIN/LLPIN at all (no MCA registration), so this must
-- stay optional rather than required, same as gstin/pan already are.
-- Single free-text column (not split CIN vs LLPIN) because a company only
-- ever has one applicable identifier for its own structure — a label field
-- would be over-engineering for a value nobody edits more than once.
alter table connectdex.companies
  add column cin text;

comment on column connectdex.companies.cin is
  'Corporate Identification Number (Pvt Ltd/OPC) or LLPIN (LLP) — the company''s own MCA registration number. Null for proprietorships/partnerships, which have neither.';
