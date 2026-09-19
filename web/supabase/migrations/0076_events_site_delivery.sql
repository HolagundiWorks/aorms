-- Extends event coverage to site delivery (2026-09-20) — matches
-- AORMS-V2-DEVELOPER-GUIDELINES.md § 21's "site_issue.created" and § 23's
-- "Site issue -> Drive photo -> issue record -> task -> responsible
-- person" automation. Safe to extend now that there's a real consumer
-- (run_due_workflows(), 0071) — events without a workflow reacting to
-- them are harmless (this table's rows just accumulate PENDING until
-- something reads them), so this isn't speculative the way blanket
-- coverage would have been before the workflow engine existed.
--
-- Same trigger shape as 0069's 4 triggers: security definer, reads
-- firm_id off NEW (works for both session and service-role writers),
-- EXECUTE revoked from public/anon/authenticated immediately (the
-- corrected methodology from 0072/0074 — all three roles, not just
-- PUBLIC, since Supabase grants EXECUTE directly to anon/authenticated
-- on function creation too).

create function public.trg_emit_snag_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.events (firm_id, event_type, entity_type, entity_id, payload)
  values (new.firm_id, 'snag.created', 'snag', new.id, jsonb_build_object('ref', new.ref, 'description', new.description, 'project_id', new.project_id));
  return new;
end;
$$;

create trigger snags_emit_created
  after insert on public.snags
  for each row execute function public.trg_emit_snag_created();

revoke execute on function public.trg_emit_snag_created() from public, anon, authenticated;

create function public.trg_emit_site_instruction_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.events (firm_id, event_type, entity_type, entity_id, payload)
  values (new.firm_id, 'site_instruction.created', 'site_instruction', new.id, jsonb_build_object('ref', new.ref, 'subject', new.subject, 'project_id', new.project_id));
  return new;
end;
$$;

create trigger site_instructions_emit_created
  after insert on public.site_instructions
  for each row execute function public.trg_emit_site_instruction_created();

revoke execute on function public.trg_emit_site_instruction_created() from public, anon, authenticated;
