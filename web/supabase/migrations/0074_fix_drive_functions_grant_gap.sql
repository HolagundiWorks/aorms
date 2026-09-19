-- Real gap found immediately after 0073: revoking from PUBLIC alone was
-- not enough here, unlike 0072's functions (which had ALSO already had
-- anon/authenticated individually revoked by 0070). Confirmed live via
-- information_schema.routine_privileges: set_updated_at_generic() and
-- get_drive_refresh_token() still showed anon/authenticated as direct
-- grantees after 0073's `revoke ... from public` ran — Supabase's own
-- default-privilege grants apply EXECUTE to anon/authenticated directly
-- on function creation, not only through the PUBLIC pseudo-role. The
-- real, complete fix revokes from all three every time: public, anon,
-- authenticated. get_drive_refresh_token keeps its explicit
-- authenticated+service_role grant (that one IS meant to be callable by
-- a signed-in firm owner, gated internally by has_capability()).
revoke execute on function public.set_updated_at_generic() from public, anon, authenticated;
revoke execute on function public.get_drive_refresh_token(uuid) from public, anon;
grant execute on function public.get_drive_refresh_token(uuid) to authenticated, service_role;
