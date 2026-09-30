-- Task sequencing: a library entry can "run after" another entry, so generated
-- tasks chain (plans -> sections -> details) instead of all starting together.
-- Generated tasks record the actual prerequisite in the existing
-- tasks.depends_on_id (0001); this column is only the library-level rule.
alter table public.task_templates add column if not exists depends_on_code text;

-- Starter-library defaults (only fills entries that have no rule yet).
update public.task_templates t set depends_on_code = d.dep
from (values
  ('CON-PLAN','CON-BRIEF'),('CON-PRES','CON-PLAN'),('DD-PLAN','CON-PLAN'),('DD-3D','DD-PLAN'),
  ('STAT-PLAN','DD-PLAN'),('WD-PLAN','DD-PLAN'),('WD-FURN','WD-PLAN'),('WD-ELEC','WD-PLAN'),
  ('WD-SEC','WD-PLAN'),('WD-DET','WD-SEC'),('WD-SCHED','WD-DET'),('WD-COORD','WD-PLAN'),('TND-PKG','WD-SCHED')
) as d(code, dep)
where t.code = d.code and t.depends_on_code is null;
