-- Project take-off — closes the "auto-derivation from geometry" gap the
-- user flagged when comparing this repo's Estimation against
-- HolagundiWorks/AQC's real BOQ engine. AQC's actual architecture (read in
-- full this session — BBSApp/Services/{TakeoffModels,ProjectStore,
-- CivilBoqCalculator,MaterialsCalculator}.cs — not just Model.h's structs
-- as an earlier pass assumed) is NOT a 3D building/room/wall graph; it's a
-- flat, per-category measured-item list (masonry/plaster/paint/PCC/
-- earthwork/flooring/etc., ~18 categories) where each row's *quantity* is
-- computed from its own dimension fields + a deduction rule against linked
-- door/window openings — not typed in directly, the way this repo's
-- existing estimate_items always has been. That's the real gap: computed
-- quantity vs. typed quantity, not a missing 3D model.
--
-- This migration ports the single most valuable, most classic instance of
-- that pattern — IS 1200 wall measurement (masonry/plaster/painting) with
-- door/window opening deductions — not the full ~18-category system
-- (PCC/earthwork/SSM/shuttering/flooring/waterproofing/dpc/coping/screed/
-- vdf/skirting/parapet/plinth-protection all follow the same shape and are
-- a deliberate, flagged follow-up, not attempted here).
--
-- One generalized table (category + jsonb fields), not five rigid ones —
-- a faithful port of AQC's own Dictionary<string,string> row shape, and it
-- means adding the follow-up categories later needs zero new migrations.
-- RLS matches BBS (migration 0019): read is_office_staff(), write
-- has_capability('write').

create table public.takeoff_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  -- MASONRY/PLASTER/PAINTING are wall-face measurements (length × height,
  -- deducted by openings on the same wall_mark); DOOR/WINDOW are the
  -- opening schedule itself (width × height × nos) that those deduct
  -- against — wall_mark on a DOOR/WINDOW row names which wall it belongs to.
  category text not null check (category in ('MASONRY', 'PLASTER', 'PAINTING', 'DOOR', 'WINDOW')),
  mark text not null,
  wall_mark text,
  -- Category-specific dimension fields (length_mm, height_mm, thickness_mm,
  -- mortar_mix, unit_type, block_size, deduct_rule, add_jambs, faces,
  -- width_mm, nos, deduct_from_wall, paint_type, coats, etc.) — ported as
  -- a flat jsonb bag rather than rigid columns, matching AQC's own row
  -- shape; web/lib/takeoff/formulas.ts's zod schemas are the actual
  -- per-category contract, this column just stores whatever they validated.
  fields jsonb not null default '{}'::jsonb,
  notes text,
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.takeoff_items enable row level security;
create policy "takeoff_items: staff read" on public.takeoff_items
  for select using (public.is_office_staff());
create policy "takeoff_items: write capability" on public.takeoff_items
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create index takeoff_items_project_id_idx on public.takeoff_items (project_id);
-- Deduction lookups filter by (project, wall_mark) — every MASONRY/PLASTER/
-- PAINTING row's deduction sums DOOR/WINDOW rows sharing its wall_mark.
create index takeoff_items_wall_mark_idx on public.takeoff_items (project_id, wall_mark);
