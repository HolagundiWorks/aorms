-- Project take-off — adds the ~12 remaining AQC measured-item categories
-- flagged as a follow-up in migration 0027_project_takeoff.sql's header:
-- PCC, earthwork, size-stone masonry (SSM), waterproofing, DPC, coping,
-- screed, VDF, skirting, parapet, plinth protection, and flooring. Same
-- table (takeoff_items), just widening the category check constraint —
-- the generalized jsonb `fields` column needed no schema change at all,
-- exactly the point of choosing that shape in 0027 over one rigid table
-- per category. "Shuttering" is still deliberately not included — AQC
-- computes it only from RCC members, never as a manually-measured category.

alter table public.takeoff_items drop constraint takeoff_items_category_check;
alter table public.takeoff_items add constraint takeoff_items_category_check
  check (category in (
    'MASONRY', 'PLASTER', 'PAINTING', 'DOOR', 'WINDOW',
    'PCC', 'EARTHWORK', 'SSM', 'WATERPROOFING', 'DPC', 'COPING',
    'SCREED', 'VDF', 'SKIRTING', 'PARAPET', 'PLINTH_PROTECTION', 'FLOORING'
  ));
