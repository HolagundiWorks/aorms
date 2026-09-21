-- provision_firm() requires a linked AORMS Identity before it can create a
-- firm — today this is only an app-level gate (lib/studio-access.ts's
-- getStudioAccessOptions() only ever offers a "Set up" tile when
-- profiles.platform_public_id is already set, so joinOrProvisionStudio()
-- never reaches provision_firm() without one in practice), not a DB-level
-- invariant. Direct RPC/PostgREST access bypasses that app-level gate
-- entirely, so a firm could otherwise be created with an OWNER who is
-- never actually traceable to a real AORMS-U- identity handle — the same
-- "don't trust the caller, enforce it in the function" discipline this
-- schema already applies to profile_firm_memberships/switch_active_firm.
create or replace function public.provision_firm(p_company_name text, p_platform_studio_public_id text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_firm_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1 from public.profiles where id = auth.uid() and platform_public_id is not null
  ) then
    raise exception 'link your AORMS Identity account before setting up a studio';
  end if;
  if exists (
    select 1 from public.firms where platform_studio_public_id = p_platform_studio_public_id
  ) then
    raise exception 'a firm for this Studio already exists — use join_firm() instead';
  end if;

  insert into public.firms (company_name, platform_studio_public_id)
  values (p_company_name, p_platform_studio_public_id)
  returning id into v_firm_id;

  insert into public.profile_firm_memberships (profile_id, firm_id, role)
  values (auth.uid(), v_firm_id, 'OWNER');

  update public.profiles set firm_id = v_firm_id, role = 'OWNER' where id = auth.uid();

  return v_firm_id;
end;
$$;

revoke execute on function public.provision_firm(text, text) from public, anon, authenticated;
grant execute on function public.provision_firm(text, text) to authenticated;
