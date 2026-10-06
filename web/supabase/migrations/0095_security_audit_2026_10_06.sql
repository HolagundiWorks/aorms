-- Security audit 2026-10-06 (docs/esti/SECURITY-AUDIT-2026-10-06.md).
-- emit_event() and next_ref() were executable by every signed-in role (CLIENT / CONSULTANT /
-- CONTRACTOR portal users included) and only checked that the caller has a firm. A portal
-- user could therefore (a) burn the firm's document numbering sequences (next_ref) or
-- (b) insert arbitrary rows into the firm's event stream (emit_event). Every real caller is
-- an office-staff Server Action, so both now require is_office_staff().
create or replace function public.emit_event(
  p_event_type text, p_entity_type text, p_entity_id uuid, p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_firm_id uuid := public.current_firm_id();
  v_id uuid;
begin
  if not public.is_office_staff() then
    raise exception 'not authorized';
  end if;
  if v_firm_id is null then
    raise exception 'emit_event(): no resolvable firm for the current session';
  end if;

  insert into public.events (firm_id, event_type, entity_type, entity_id, payload)
  values (v_firm_id, p_event_type, p_entity_type, p_entity_id, p_payload)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.next_ref(p_scope text, p_default_prefix text, p_at timestamptz default now())
returns text
language plpgsql security definer set search_path = 'public' as $$
declare
  v_fy text := public.financial_year(p_at);
  v_firm_id uuid := public.current_firm_id();
  v_seq integer;
  v_prefix text;
  v_padding integer;
begin
  if not public.is_office_staff() then
    raise exception 'not authorized';
  end if;
  if v_firm_id is null then
    raise exception 'next_ref(): no resolvable firm for the current session';
  end if;

  select case p_scope
    when 'letter'      then 'LTR'
    when 'contract'    then 'CTR'
    when 'transmittal' then 'TRN'
    when 'inspection'  then 'SIR'
    when 'specsheet'   then 'SPC'
    when 'moodboard'   then 'MOOD'
    when 'proposal'    then 'PRP'
    when 'feeproposal' then 'FEE'
    when 'mom'         then 'MOM'
    when 'expense'     then 'EXP'
    when 'tender'      then 'TND'
    else p_default_prefix
  end into v_prefix;
  v_padding := 4;

  insert into public.sequences (firm_id, scope, fy, last_value)
  values (v_firm_id, p_scope, v_fy, 1)
  on conflict (firm_id, scope, fy)
  do update set last_value = sequences.last_value + 1
  returning last_value into v_seq;

  return v_prefix || '/' || v_fy || '/' || lpad(v_seq::text, v_padding, '0');
end;
$$;
