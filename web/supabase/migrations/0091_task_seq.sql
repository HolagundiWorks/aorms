-- Per-firm task sequence number — the "TASK-0184" record ID (HCWorks
-- title-sheet redesign, step 4). Other record types (projects, tenders,
-- snags, estimates, MOMs…) already carry refs from next_ref(); tasks had none.
-- Kept deliberately simpler than next_ref(): no financial-year reset and no
-- per-scope override table — a task number is an identifier, not a document
-- number, so it is stable for the life of the firm.
alter table public.tasks add column if not exists seq integer;

-- Backfill in creation order, per firm.
with n as (
  select id, row_number() over (partition by firm_id order by created_at, id) as rn from public.tasks
)
update public.tasks t set seq = n.rn from n where n.id = t.id and t.seq is null;

create unique index if not exists tasks_firm_seq_key on public.tasks (firm_id, seq);

-- Assign on insert. The advisory lock serialises concurrent inserts for one
-- firm so two requests can't both read the same max(seq); it is held only to
-- the end of the inserting transaction. A multi-row insert (the task-library
-- generator) works because each row's BEFORE trigger sees the rows the same
-- statement has already written.
create or replace function public.assign_task_seq()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.seq is null then
    perform pg_advisory_xact_lock(hashtext('tasks_seq:' || new.firm_id::text));
    select coalesce(max(seq), 0) + 1 into new.seq from public.tasks where firm_id = new.firm_id;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_assign_seq on public.tasks;
create trigger tasks_assign_seq before insert on public.tasks
  for each row execute function public.assign_task_seq();
