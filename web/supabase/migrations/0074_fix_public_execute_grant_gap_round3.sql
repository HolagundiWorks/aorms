-- Round 3 — 0073 only revoked PUBLIC for handle_new_user()/
-- reset_demo_data()/seed_landing_page_demo_examples(), copying 0072's
-- pattern. Re-verifying live via pg_proc.proacl afterward (not just
-- information_schema.routine_privileges, which conflates the two grant
-- paths) showed all 3 still carry a *separate*, direct
-- `anon=X/postgres,authenticated=X/postgres` grant that 0073's PUBLIC
-- revoke didn't touch — Supabase grants EXECUTE to anon/authenticated
-- directly on function creation (its own default-privileges setup for
-- the public schema), independent of the Postgres PUBLIC-pseudo-role
-- default. Closing only one path isn't enough; both must be revoked,
-- same as the working combination already proven by 0070 (revoked
-- anon/authenticated) + 0072 (revoked PUBLIC) together for trg_emit_*/
-- run_due_workflows — confirmed those two now show a clean
-- `{postgres=X/postgres,service_role=X/postgres}` ACL with neither path
-- present.
--
-- Re-verified live afterward: pg_proc.proacl for all 3 functions now
-- reads `{postgres=X/postgres,service_role=X/postgres}` — no PUBLIC, no
-- anon, no authenticated — and a real auth.users insert still correctly
-- fires handle_new_user() afterward (trigger invocation runs as the
-- function owner, unaffected by caller-facing EXECUTE grants).
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.reset_demo_data() from anon, authenticated;
revoke execute on function public.seed_landing_page_demo_examples() from anon, authenticated;
