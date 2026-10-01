-- Platform audit R9 (docs/esti/PLATFORMS-AUDIT-2026-10-01.md): the "functions are
-- executable by PUBLIC/anon/authenticated by default" gap was patched
-- function-by-function in 0037, 0038, 0039 and 0040 — and would recur with the
-- next `create function`. This closes it at the source: functions created from
-- now on in `public` and `connectdex` are NOT executable by PUBLIC, anon or
-- authenticated unless a migration grants it explicitly.
--
-- Effect on existing functions: none (default privileges only apply to objects
-- created after this runs). Effect on future migrations: a function meant to be
-- an RPC for signed-in users now needs an explicit
--   grant execute on function <schema>.<fn>(<args>) to authenticated;
-- Trigger functions need nothing (triggers run as the function owner).
--
-- NOT YET APPLIED to the live `aorms-platform` project — apply via the Management
-- API and verify with:
--   select defaclnamespace::regnamespace, defaclacl from pg_default_acl;
-- then create a throwaway function and confirm `proacl` has no anon/authenticated.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema connectdex
  revoke execute on functions from public, anon, authenticated;
