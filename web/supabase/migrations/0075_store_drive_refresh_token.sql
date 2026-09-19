-- vault.create_secret() lives in the `vault` schema, which PostgREST
-- doesn't expose (deliberately, same as every other Supabase project) —
-- get_drive_refresh_token() (0073) only reads an existing secret back;
-- this is the counterpart that actually creates/rotates one, callable
-- from the OAuth callback Route Handler via the signed-in user's own
-- session client (no service-role needed — has_capability('write') +
-- firm match gates it, same as get_drive_refresh_token()).
create function public.store_drive_refresh_token(p_firm_id uuid, p_refresh_token text, p_google_account_email text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
begin
  if not (has_capability('write') and p_firm_id = current_firm_id()) then
    raise exception 'not authorized';
  end if;

  select vault.create_secret(p_refresh_token, 'drive-refresh-' || p_firm_id::text) into v_secret_id;

  insert into public.drive_connections (firm_id, google_account_email, refresh_token_secret_id, connected_by, status)
  values (p_firm_id, p_google_account_email, v_secret_id, auth.uid(), 'CONNECTED')
  on conflict (firm_id) do update set
    google_account_email = excluded.google_account_email,
    refresh_token_secret_id = excluded.refresh_token_secret_id,
    connected_by = excluded.connected_by,
    status = 'CONNECTED',
    error_message = null;
end;
$$;

revoke execute on function public.store_drive_refresh_token(uuid, text, text) from public, anon;
grant execute on function public.store_drive_refresh_token(uuid, text, text) to authenticated, service_role;
