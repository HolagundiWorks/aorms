-- Demo account showcase for the Kanban board + task libraries (0088).
-- reset_demo_data() wipes and rebuilds 'Demo — ' rows nightly, so the
-- showcase lives in its own function and is hooked onto the end of
-- reset_demo_data() (patched mechanically, same technique as 0068).

create or replace function public.seed_demo_task_showcase(p_firm_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_owner uuid; v_partner uuid; v_senior uuid; v_associate uuid;
begin
  select p.id into v_owner from public.profiles p join auth.users u on u.id = p.id where u.email = 'aditi.rao@aorms.in' limit 1;
  select p.id into v_partner from public.profiles p join auth.users u on u.id = p.id where u.email = 'vikram.shah@aorms.in' limit 1;
  select p.id into v_senior from public.profiles p join auth.users u on u.id = p.id where u.email = 'akash.mehta@aorms.in' limit 1;
  select p.id into v_associate from public.profiles p join auth.users u on u.id = p.id where u.email = 'priya.nair@aorms.in' limit 1;
  if v_owner is null or v_partner is null or v_senior is null or v_associate is null then return; end if;

  -- Starter task library (kept across resets; firm may have edited entries).
  insert into public.task_templates (firm_id, code, title, bundle, scope, area_basis, base_hours, hours_per_100sqm, min_hours, max_hours, work_type, classification, difficulty_coefficient, sequence) values
    (p_firm_id,'CON-BRIEF','Site study & brief analysis','Concept design','PROJECT','SITE',8,0.5,8,40,'DESIGN_DEVELOPMENT',null,3,10),
    (p_firm_id,'CON-PLAN','Concept plan & massing','Concept design','PROJECT','BUILT_UP',16,1.5,16,120,'DESIGN_DEVELOPMENT',null,4,20),
    (p_firm_id,'CON-PRES','Client concept presentation','Concept design','PROJECT','NONE',8,0,null,null,'DESIGN_COMMUNICATION',null,3,30),
    (p_firm_id,'DD-PLAN','Design development — floor plan','Design development','PER_FLOOR','FLOOR',6,2.5,6,80,'DESIGN_DEVELOPMENT',null,3,40),
    (p_firm_id,'DD-3D','3D views & elevations','Design development','PROJECT','BUILT_UP',12,1,12,80,'DESIGN_COMMUNICATION',null,3,50),
    (p_firm_id,'STAT-PLAN','Sanction drawing set','Statutory approvals','PROJECT','BUILT_UP',14,1.2,14,90,'TECHNICAL_PRODUCTION',null,3,60),
    (p_firm_id,'WD-PLAN','Working drawing — floor plan','Working drawings','PER_FLOOR','FLOOR',8,3,8,120,'TECHNICAL_PRODUCTION',null,3,70),
    (p_firm_id,'WD-FURN','Working drawing — furniture & finish layout','Working drawings','PER_FLOOR','FLOOR',4,1.5,4,60,'TECHNICAL_PRODUCTION',null,3,80),
    (p_firm_id,'WD-ELEC','Working drawing — electrical & lighting layout','Working drawings','PER_FLOOR','FLOOR',4,1.2,4,50,'TECHNICAL_PRODUCTION',null,3,90),
    (p_firm_id,'WD-SEC','Sections & elevations','Working drawings','PROJECT','BUILT_UP',12,1.4,12,100,'TECHNICAL_PRODUCTION',null,4,100),
    (p_firm_id,'WD-DET','Construction details (stair, toilet, façade)','Working drawings','PROJECT','BUILT_UP',16,1,16,100,'TECHNICAL_PRODUCTION',null,4,110),
    (p_firm_id,'WD-SCHED','Door / window / finish schedules','Working drawings','PROJECT','BUILT_UP',6,0.5,6,40,'TECHNICAL_PRODUCTION',null,3,120),
    (p_firm_id,'WD-COORD','Consultant coordination (structure / MEP)','Working drawings','PROJECT','BUILT_UP',8,0.6,8,60,'DESIGN_COMMUNICATION','COLLABORATION',3,130),
    (p_firm_id,'TND-PKG','Tender package & BOQ review','Tender & construction support','PROJECT','BUILT_UP',10,0.5,10,50,'CONSTRUCTION_SUPPORT',null,3,140),
    (p_firm_id,'SITE-VISIT','Site visit & inspection report','Tender & construction support','PROJECT','NONE',6,0,null,null,'CONSTRUCTION_SUPPORT',null,3,150)
  on conflict (firm_id, code) do nothing;

  -- Project scale (projects are recreated every reset, so set it every time).
  update public.project_offices set built_up_area_sqm = 2480, site_area_sqm = 1650, floor_count = 4 where ref = 'DEMO-PRJ-01' and firm_id = p_firm_id;
  update public.project_offices set built_up_area_sqm = 18500, site_area_sqm = 4200, floor_count = 12 where ref = 'DEMO-PRJ-06' and firm_id = p_firm_id;
  update public.project_offices set built_up_area_sqm = 5200, site_area_sqm = 2300, floor_count = 5 where ref = 'DEMO-PRJ-08' and firm_id = p_firm_id;
  update public.project_offices set built_up_area_sqm = 42000, site_area_sqm = 16000, floor_count = 8 where ref = 'DEMO-PRJ-10' and firm_id = p_firm_id;

  -- Give the existing demo tasks effort estimates (4–14h) so load maths has data.
  update public.tasks set estimated_hours = 4 + (abs(hashtext(title)) % 11)
  where firm_id = p_firm_id and title like 'Demo — %' and estimated_hours is null;

  -- Floor-by-floor working drawings on Aurelia Residences Phase 1 (2,480 m², 4 floors):
  -- hours come from the library formula × each floor's own area.
  insert into public.tasks (firm_id, title, project_id, assignee_id, template_id, floor_label, area_sqm, estimated_hours,
                            status, priority, classification, work_type, difficulty_coefficient, start_date, due_date, created_by_id, completed_at)
  select p_firm_id,
         'Demo — ' || t.title || ' — ' || f.label,
         (select id from public.project_offices where ref = 'DEMO-PRJ-01' and firm_id = p_firm_id),
         f.assignee, t.id, f.label, f.area,
         round(least(coalesce(t.max_hours, 1e9), greatest(coalesce(t.min_hours, 0), t.base_hours + t.hours_per_100sqm * f.area / 100)) * 2) / 2,
         f.status, f.priority, 'BILLABLE', t.work_type, t.difficulty_coefficient,
         current_date + f.start_off, current_date + f.due_off, v_senior,
         case when f.status = 'DONE' then now() - interval '5 days' end
  from (values
    ('WD-PLAN', 'Ground floor', 720::float8, v_senior,    'DONE',        'MEDIUM', -14, -6),
    ('WD-PLAN', 'First floor',  640::float8, v_associate, 'IN_PROGRESS', 'HIGH',    -2,  2),
    ('WD-PLAN', 'Second floor', 640::float8, v_associate, 'TODO',        'HIGH',     0,  3),
    ('WD-PLAN', 'Third floor',  480::float8, v_associate, 'TODO',        'MEDIUM',   0,  3),
    ('WD-FURN', 'Ground floor', 720::float8, v_associate, 'TODO',        'MEDIUM',   0,  2),
    ('WD-ELEC', 'Ground floor', 720::float8, v_senior,    'TODO',        'MEDIUM',   1,  9),
    ('WD-ELEC', 'First floor',  640::float8, v_senior,    'TODO',        'LOW',      2, 11)
  ) as f(code, label, area, assignee, status, priority, start_off, due_off)
  join public.task_templates t on t.code = f.code and t.firm_id = p_firm_id;

  -- Project-wide entries sized from built-up area.
  insert into public.tasks (firm_id, title, project_id, assignee_id, template_id, area_sqm, estimated_hours,
                            status, priority, classification, work_type, difficulty_coefficient, start_date, due_date, created_by_id)
  select p_firm_id,
         'Demo — ' || t.title || ' — ' || f.proj,
         p.id, f.assignee, t.id, p.built_up_area_sqm,
         round(least(coalesce(t.max_hours, 1e9), greatest(coalesce(t.min_hours, 0), t.base_hours + t.hours_per_100sqm * coalesce(case t.area_basis when 'SITE' then p.site_area_sqm when 'BUILT_UP' then p.built_up_area_sqm end, 0) / 100)) * 2) / 2,
         f.status, f.priority, 'BILLABLE', t.work_type, t.difficulty_coefficient,
         current_date + f.start_off, current_date + f.due_off, v_owner
  from (values
    ('WD-SEC',   'DEMO-PRJ-01', 'Aurelia Phase 1', v_partner,   'IN_PROGRESS', 'HIGH',   -3,  5),
    ('WD-DET',   'DEMO-PRJ-01', 'Aurelia Phase 1', v_associate, 'TODO',        'HIGH',    0,  2),
    ('WD-COORD', 'DEMO-PRJ-01', 'Aurelia Phase 1', v_senior,    'TODO',        'MEDIUM',  1,  8),
    ('WD-SCHED', 'DEMO-PRJ-06', 'Tower A',         v_partner,   'TODO',        'MEDIUM',  2, 12),
    ('STAT-PLAN','DEMO-PRJ-08', 'Hotel',           v_owner,     'IN_PROGRESS', 'HIGH',   -5,  4),
    ('CON-PRES', 'DEMO-PRJ-10', 'Corporate park',  v_owner,     'TODO',        'MEDIUM',  3, 16),
    ('TND-PKG',  'DEMO-PRJ-08', 'Hotel',           v_senior,    'TODO',        'LOW',     5, 21)
  ) as f(code, ref, proj, assignee, status, priority, start_off, due_off)
  join public.task_templates t on t.code = f.code and t.firm_id = p_firm_id
  join public.project_offices p on p.ref = f.ref and p.firm_id = p_firm_id;
end;
$fn$;

revoke all on function public.seed_demo_task_showcase(uuid) from public, anon, authenticated;

-- Hook onto the end of reset_demo_data().
do $$
declare
  v_src text;
  v_new text;
begin
  select pg_get_functiondef('public.reset_demo_data()'::regprocedure) into v_src;
  if v_src like '%seed_demo_task_showcase%' then return; end if;
  v_new := regexp_replace(v_src, 'end;\s*\$function\$\s*$', '  perform public.seed_demo_task_showcase(v_firm_id);' || chr(10) || 'end;' || chr(10) || '$function$' || chr(10));
  if v_new = v_src then
    raise exception 'reset_demo_data(): trailing end not found — aborting rather than silently no-op''ing';
  end if;
  execute v_new;
end $$;
