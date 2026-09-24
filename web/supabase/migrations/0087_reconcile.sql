-- Bank-statement reconciliation (2026-09-24) — see migration 0086's
-- header comment for the full context (ROADMAP.md claimed this was live,
-- it wasn't; faithful port of the old worker/esti_worker/jobs/reconcile.py
-- algorithm — the TypeScript port lives in web/lib/reconcile/match.ts,
-- read that file, not this one, for the actual matching logic). This
-- migration only adds the storage table and the settle RPC.
--
-- Deliberately no job queue: parsing/matching runs synchronously inside
-- the uploadReconcileBatch() Server Action (an already-made architecture
-- decision, not re-litigated here) — status still exists as a column
-- (PENDING/PROCESSING/READY/FAILED) because the row briefly passes
-- through PENDING before the same request updates it to READY/FAILED,
-- matching the old worker's own status vocabulary exactly even though
-- nothing async ever holds it at PENDING/PROCESSING here.

create table public.reconcile (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) default public.current_firm_id(),
  ref text not null,
  label text not null,
  file_name text not null,
  file_hash text not null,
  storage_key text not null,
  size_bytes bigint not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'READY', 'FAILED')),
  row_count int,
  matched_count int,
  unmatched_count int,
  total_credit_paise bigint,
  matched_credit_paise bigint,
  lines jsonb,
  column_mapping jsonb,
  error_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, ref)
);

create index reconcile_firm_id_idx on public.reconcile (firm_id);

alter table public.reconcile enable row level security;

-- Uniform gate, no read/write split — matches the old system's own
-- access model (bank-statement reconciliation was already a finance-ops-
-- only surface there too).
create policy "reconcile: finance ops" on public.reconcile
  for all using (
    public.has_capability('finance:ops') and firm_id = public.current_firm_id()
  )
  with check (
    public.has_capability('finance:ops') and firm_id = public.current_firm_id()
  );

-- Applies every unsettled, matched line in a READY batch to its matched
-- invoice: adds the line's amount to that invoice's running paid total,
-- flips the invoice to PAID once paid >= net_receivable_paise (otherwise
-- it stays ISSUED, partially paid), writes an audit-log entry, and marks
-- the line itself settled so a re-run of this same batch never double-
-- applies it. Runs as a single atomic database-level operation (touches
-- `reconcile` + `invoices` + `audit_log`, all firm-scoped tenant tables)
-- rather than sequential JS calls from the Server Action, per the plan.
--
-- Security-definer, so it bypasses RLS on every table it touches — which
-- means it must enforce its own authorization and tenant-scoping rather
-- than relying on the RLS policies above/on `invoices`, exactly the same
-- discipline every other security-definer function in this schema
-- follows (see e.g. 0032_client_respond_approval.sql's own header
-- comment on why it writes audit_log directly instead of calling the
-- security-invoker write_audit() RPC from inside a security-definer
-- function).
create function public.settle_reconcile_batch(p_reconcile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.reconcile%rowtype;
  v_line jsonb;
  v_new_lines jsonb := '[]'::jsonb;
  v_invoice public.invoices%rowtype;
  v_applied int := 0;
  v_settled int := 0;
  v_skipped int := 0;
  v_already int := 0;
  v_new_paid bigint;
  v_match_type text;
  v_matched_invoice_id uuid;
  v_settled_at text;
  v_amount bigint;
begin
  if not public.has_capability('finance:ops') then
    raise exception 'settle_reconcile_batch: insufficient privilege';
  end if;

  select * into v_batch from public.reconcile
    where id = p_reconcile_id and firm_id = public.current_firm_id();
  if not found then
    raise exception 'settle_reconcile_batch: reconcile batch not found';
  end if;

  for v_line in select * from jsonb_array_elements(coalesce(v_batch.lines, '[]'::jsonb))
  loop
    v_match_type := v_line ->> 'matchType';
    v_matched_invoice_id := nullif(v_line ->> 'matchedInvoiceId', '')::uuid;
    v_settled_at := v_line ->> 'settledAt';
    v_amount := (v_line ->> 'amountPaise')::bigint;

    if v_settled_at is not null then
      v_already := v_already + 1;
    elsif v_match_type is distinct from 'none' and v_matched_invoice_id is not null then
      v_applied := v_applied + 1;

      select * into v_invoice from public.invoices
        where id = v_matched_invoice_id and firm_id = public.current_firm_id()
        for update;

      if not found or v_invoice.status <> 'ISSUED' then
        v_skipped := v_skipped + 1;
      else
        v_new_paid := v_invoice.paid_paise + v_amount;

        update public.invoices
          set paid_paise = v_new_paid,
              status = case when v_new_paid >= v_invoice.net_receivable_paise then 'PAID' else 'ISSUED' end,
              updated_at = now()
          where id = v_invoice.id;

        insert into public.audit_log (entity, entity_id, action, actor_id, before, after)
        values (
          'invoice', v_invoice.id, 'RECONCILE_SETTLE', auth.uid(),
          jsonb_build_object('paidPaise', v_invoice.paid_paise, 'status', v_invoice.status),
          jsonb_build_object(
            'paidPaise', v_new_paid,
            'appliedAmountPaise', v_amount,
            'reconcileId', p_reconcile_id
          )
        );

        v_line := jsonb_set(v_line, '{settledAt}', to_jsonb(now()::text));
        v_settled := v_settled + 1;
      end if;
    end if;

    v_new_lines := v_new_lines || jsonb_build_array(v_line);
  end loop;

  update public.reconcile
    set lines = v_new_lines, updated_at = now()
    where id = p_reconcile_id;

  return jsonb_build_object(
    'applied', v_applied,
    'settled', v_settled,
    'skipped', v_skipped,
    'alreadyApplied', v_already
  );
end;
$$;

grant execute on function public.settle_reconcile_batch(uuid) to authenticated;
