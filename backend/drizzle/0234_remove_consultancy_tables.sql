-- Remove the AORMS-Consultancy engineering module (2026-09) — AORMS is a
-- pure architectural consultancy product now; this module's whole domain
-- (engagements, RACI reliance chain, TQ register, fee stages, timesheets,
-- variations, risk/opportunity register, phase gates, closeout — lessons/
-- NC/MoM/WIP review/contract review) is retired. See CLAUDE.md § Removed.
--
-- CASCADE drops each table's own indexes/constraints and any FK constraint
-- on another table that references it; no other kept table has such an FK
-- (verified: these 24 tables only ever referenced OUT to clients/users/
-- projectOffices/invoices, never the reverse), so nothing outside this list
-- is affected.
DROP TABLE IF EXISTS "esti_cons_review_comment" CASCADE;
DROP TABLE IF EXISTS "esti_cons_review_step" CASCADE;
DROP TABLE IF EXISTS "esti_cons_deliverable" CASCADE;
DROP TABLE IF EXISTS "esti_cons_variation" CASCADE;
DROP TABLE IF EXISTS "esti_cons_fee_stage" CASCADE;
DROP TABLE IF EXISTS "esti_cons_timesheet" CASCADE;
DROP TABLE IF EXISTS "esti_cons_rate_card" CASCADE;
DROP TABLE IF EXISTS "esti_cons_risk" CASCADE;
DROP TABLE IF EXISTS "esti_cons_insurance" CASCADE;
DROP TABLE IF EXISTS "esti_cons_reliance_letter" CASCADE;
DROP TABLE IF EXISTS "esti_cons_input_pack" CASCADE;
DROP TABLE IF EXISTS "esti_cons_calc_package" CASCADE;
DROP TABLE IF EXISTS "esti_cons_field_report" CASCADE;
DROP TABLE IF EXISTS "esti_cons_tq" CASCADE;
DROP TABLE IF EXISTS "esti_cons_lesson" CASCADE;
DROP TABLE IF EXISTS "esti_cons_nc" CASCADE;
DROP TABLE IF EXISTS "esti_cons_mom" CASCADE;
DROP TABLE IF EXISTS "esti_cons_wip_review" CASCADE;
DROP TABLE IF EXISTS "esti_cons_contract_review" CASCADE;
DROP TABLE IF EXISTS "esti_cons_opportunity" CASCADE;
DROP TABLE IF EXISTS "esti_cons_phase_gate" CASCADE;
DROP TABLE IF EXISTS "esti_cons_engagement_phase" CASCADE;
DROP TABLE IF EXISTS "esti_cons_enquiry" CASCADE;
DROP TABLE IF EXISTS "esti_cons_engagement" CASCADE;
