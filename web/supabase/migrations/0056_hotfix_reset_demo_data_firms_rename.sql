-- HOTFIX — reset_demo_data() (live nightly pg_cron job, 30 21 * * *) still
-- references the old `firm`/`singleton` shape migration 0053 renamed away.
-- Found while auditing every remaining `.from("firm")`/`singleton`
-- reference after applying 0053 live. This is an urgent minimal patch, not
-- the full firm-scoped rewrite this function still needs (its ~40 delete/
-- insert statements have no firm_id scoping at all yet — tracked
-- separately, done once every table this function touches actually has a
-- firm_id column from the remaining batches). Until that full rewrite
-- lands, this function is only really correct while exactly one firm
-- exists — acceptable for now since that's still true in production.
--
-- Patches the live function body mechanically (find/replace on its own
-- source via pg_get_functiondef) rather than retyping its ~550 lines by
-- hand — this is a real production function covering invoices/GST/task
-- data; hand-transcribing it risks a silent typo. Aborts loudly if the
-- expected text isn't found, rather than silently no-op'ing.
do $$
declare
  v_src text;
  v_new text;
begin
  select pg_get_functiondef('public.reset_demo_data()'::regprocedure) into v_src;

  v_new := replace(v_src, 'update public.firm set', 'update public.firms set');
  v_new := replace(v_new, 'where singleton = true;', ';');

  if v_new = v_src then
    raise exception 'reset_demo_data(): expected firm/singleton reference not found — source may have changed, aborting rather than silently no-op''ing';
  end if;

  execute v_new;
end $$;
