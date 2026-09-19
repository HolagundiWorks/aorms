-- Defense-in-depth (2026-09-20 advisor sweep): the 4 event trigger
-- functions from 0069_events.sql are only ever meant to run as triggers
-- (implicit NEW/OLD binding) — Postgres already rejects calling a
-- `returns trigger` function directly outside trigger context, but the
-- security advisor flags them as anon/authenticated-EXECUTABLE via
-- PostgREST RPC regardless, since GRANT EXECUTE defaults to PUBLIC on
-- function creation. Revoking removes the (non-exploitable, but
-- unnecessary) exposure and the lint noise. Confirmed the triggers still
-- fire correctly after this (trigger invocation isn't gated by RPC-style
-- EXECUTE grants) via a real insert/verify/cleanup round trip.
revoke execute on function public.trg_emit_task_created() from anon, authenticated;
revoke execute on function public.trg_emit_task_completed() from anon, authenticated;
revoke execute on function public.trg_emit_drawing_uploaded() from anon, authenticated;
revoke execute on function public.trg_emit_project_created() from anon, authenticated;
