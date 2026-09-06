-- document_issues.entity_id was NOT NULL (from whichever earlier migration
-- created the table), which blocks the manual "log an issue" entry point
-- built for it (Phase 4's flagged gap — the register's automatic wiring
-- from every issuing action across the app is a separate, still-open
-- cross-cutting follow-up, so a manual entry is what actually ships first).
-- A manual log entry legitimately may have no real linked row to point at
-- (an externally-issued document, a historical revision predating this
-- register) — caught live when the first real insert attempt failed with
-- a NOT NULL violation; fixed by relaxing the constraint, not by forcing
-- every manual entry through an entity picker that doesn't exist yet.

alter table public.document_issues alter column entity_id drop not null;
