-- Suite sign-in (2026-10-11): one active session per user PER APP, so AAD (CAD) and AQC can be signed in together without
-- replacing each other. Sign-in tokens are shared across the desktop apps; sessions are not. See docs/esti/AORMS-SUITE-SIGNIN.md.
-- A second sign-in of the SAME app still replaces that app's previous session (D8, now per app).
-- Existing rows are AQC sessions (default 'aqc'). aqc_touch_session already matches on session_id, which is unique per row, so it is unchanged.
alter table public.aqc_sessions add column if not exists client_app text not null default 'aqc';
alter table public.aqc_sessions add constraint aqc_sessions_client_app_check check (client_app in ('aqc', 'aad'));
alter table public.aqc_sessions drop constraint aqc_sessions_pkey;
alter table public.aqc_sessions add primary key (account_id, client_app);
create unique index if not exists aqc_sessions_session_id_idx on public.aqc_sessions (session_id);

-- New name (a DROP of the old function would risk the lock timeouts seen before); aqc_start_session(text) stays and means 'aqc'.
create function public.aqc_start_session_v2(p_client_label text, p_app text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_firm uuid := public.current_firm_id(); v_session uuid := gen_random_uuid();
begin
  if auth.uid() is null or v_firm is null then raise exception 'not authorized'; end if;
  if p_app is null or p_app not in ('aqc', 'aad') then raise exception 'unknown app'; end if;
  insert into public.aqc_sessions (account_id, client_app, firm_id, session_id, client_label)
  values (auth.uid(), p_app, v_firm, v_session, left(p_client_label, 120))
  on conflict (account_id, client_app) do update
    set firm_id = excluded.firm_id, session_id = excluded.session_id, client_label = excluded.client_label,
        started_at = now(), last_seen_at = now();
  return v_session;
end $$;
revoke execute on function public.aqc_start_session_v2(text, text) from public, anon;
grant execute on function public.aqc_start_session_v2(text, text) to authenticated;

-- The old entry point keeps working for code deployed before this migration: it now means app 'aqc' (its ON CONFLICT
-- (account_id) no longer matches the new key, so it is redefined here rather than left to fail).
create or replace function public.aqc_start_session(p_client_label text default null)
returns uuid language sql security definer set search_path = ''
as $$ select public.aqc_start_session_v2(p_client_label, 'aqc') $$;
