-- Real gap found via a follow-up advisor check (2026-09-20): 0070's
-- `revoke ... from anon, authenticated` did not actually close anything.
-- Postgres grants EXECUTE to the PUBLIC pseudo-role by default on
-- function creation, and every role (including anon/authenticated)
-- implicitly inherits through PUBLIC membership — confirmed via
-- information_schema.routine_privileges still showing
-- ('PUBLIC','EXECUTE') after 0070 ran. The real fix has to target PUBLIC
-- itself. service_role keeps its own separate, explicit grant untouched
-- (needed for a future scheduled caller of run_due_workflows()).
-- Re-verified live: information_schema.routine_privileges now returns
-- zero rows for these functions under PUBLIC/anon/authenticated, and a
-- real task insert still correctly fires its trigger afterward.
revoke execute on function public.trg_emit_task_created() from public;
revoke execute on function public.trg_emit_task_completed() from public;
revoke execute on function public.trg_emit_drawing_uploaded() from public;
revoke execute on function public.trg_emit_project_created() from public;
revoke execute on function public.run_due_workflows(integer) from public;
