-- HOTFIX — reset_demo_data() FK-ordering bug, found live: a real
-- `assignments` row (project staff assignment) now references a demo
-- project, and the function never deleted `assignments` before deleting
-- `project_offices`, so the delete failed on
-- assignments_project_id_fkey. Not something 0067 introduced — a
-- pre-existing gap in the function's own delete list, surfaced only now
-- because it was actually run live to verify 0067's rewrite. Patches the
-- live function body mechanically (insert one delete statement into the
-- existing source) rather than retyping the whole ~260-line function
-- again.
do $$
declare
  v_src text;
  v_new text;
begin
  select pg_get_functiondef('public.reset_demo_data()'::regprocedure) into v_src;

  v_new := replace(
    v_src,
    'delete from public.project_offices where ref like ''DEMO-PRJ-%'' and firm_id = v_firm_id;',
    'delete from public.assignments where project_id in (select id from public.project_offices where ref like ''DEMO-PRJ-%'') and firm_id = v_firm_id;' || chr(10) ||
    '  delete from public.project_offices where ref like ''DEMO-PRJ-%'' and firm_id = v_firm_id;'
  );

  if v_new = v_src then
    raise exception 'reset_demo_data(): expected project_offices delete line not found — aborting rather than silently no-op''ing';
  end if;

  execute v_new;
end $$;
