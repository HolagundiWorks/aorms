-- Demo data for the Contractor Portal's current projects (2026-10-08) — APPLIED to the live `aorms-web` project.
-- Extends seed_portal_demo_data() (0097): packages and milestones, running bills, drawing revisions, tickets, a meeting
-- request and a message thread for the demo contractor. Idempotent upserts with deterministic ids (no deletes).
-- Bills are seeded as CLOSED / SITE_CHECKED / DRAFT (not CERTIFIED: that transition needs a session with cost:approve).
create or replace function public.seed_portal_demo_f()
returns void
language plpgsql security definer set search_path = ''
as $$
declare b record;
begin
  select * into b from public.seed_portal_demo_base();
  if b.firm is null then return; end if;
  insert into public.pmc_packages (id, project_id, ref, title, trade, status, contractor_id, contract_value_paise, award_date, firm_id) values
    (md5('pd-pkg-1')::uuid, b.p1, 'PD-PKG-01', 'Superstructure RCC works', 'Civil', 'IN_PROGRESS', b.contractor, 385000000, current_date - 50, b.firm),
    (md5('pd-pkg-2')::uuid, b.p2, 'PD-PKG-02', 'Site clearance and levelling', 'Civil', 'IN_PROGRESS', b.contractor, 85000000, current_date - 14, b.firm)
  on conflict (id) do update set status = excluded.status, contract_value_paise = excluded.contract_value_paise;
  insert into public.pmc_milestones (id, project_id, ref, title, planned_date, actual_date, percent_complete, status, sort_order, notes, firm_id) values
    (md5('pd-ms-1')::uuid, b.p1, 'PD-MS-01', 'Excavation and PCC complete', current_date - 40, current_date - 38, 100, 'COMPLETE', 1, 'Signed off at site visit.', b.firm),
    (md5('pd-ms-2')::uuid, b.p1, 'PD-MS-02', 'Footings and plinth beam', current_date - 20, current_date - 16, 100, 'COMPLETE', 2, null, b.firm),
    (md5('pd-ms-3')::uuid, b.p1, 'PD-MS-03', 'Ground floor slab', current_date + 4, null, 70, 'ON_TRACK', 3, 'Shuttering done; reinforcement in progress.', b.firm),
    (md5('pd-ms-4')::uuid, b.p1, 'PD-MS-04', 'First floor columns and slab', current_date + 32, null, 0, 'PLANNED', 4, null, b.firm),
    (md5('pd-ms-5')::uuid, b.p1, 'PD-MS-05', 'Staircase and terrace slab', current_date + 60, null, 0, 'PLANNED', 5, null, b.firm),
    (md5('pd-ms-6')::uuid, b.p2, 'PD-MS-06', 'Site clearance', current_date - 6, current_date - 5, 100, 'COMPLETE', 1, null, b.firm),
    (md5('pd-ms-7')::uuid, b.p2, 'PD-MS-07', 'Levelling and compaction', current_date + 10, null, 35, 'AT_RISK', 2, 'Monsoon delay on the north side.', b.firm)
  on conflict (id) do update set planned_date = excluded.planned_date, actual_date = excluded.actual_date, percent_complete = excluded.percent_complete, status = excluded.status;
  insert into public.pmc_ra_bills (id, project_id, package_id, ref, bill_no, period_start, period_end, status, gross_paise, advance_recovery_paise, retention_paise, narrative, certified_at, submitted_by_contractor_id, submitted_at, firm_id) values
    (md5('pd-ra-1')::uuid, b.p1, md5('pd-pkg-1')::uuid, 'PD-RA-01', '1', current_date - 50, current_date - 30, 'CLOSED', 77000000, 7700000, 3850000, 'Excavation, PCC and footings — 20% of the package.', now() - interval '24 days', b.contractor, now() - interval '28 days', b.firm),
    (md5('pd-ra-2')::uuid, b.p1, md5('pd-pkg-1')::uuid, 'PD-RA-02', '2', current_date - 29, current_date - 8, 'SITE_CHECKED', 96250000, 9625000, 4812500, 'Plinth beam, columns to plinth and backfilling.', null, b.contractor, now() - interval '6 days', b.firm),
    (md5('pd-ra-3')::uuid, b.p1, md5('pd-pkg-1')::uuid, 'PD-RA-03', '3', current_date - 7, current_date - 1, 'DRAFT', 38500000, 0, 0, 'Ground floor slab shuttering and reinforcement (part).', null, b.contractor, now() - interval '1 day', b.firm)
  on conflict (id) do update set status = excluded.status, gross_paise = excluded.gross_paise, certified_at = excluded.certified_at;
end;
$$;
revoke execute on function public.seed_portal_demo_f() from public, anon, authenticated;

create or replace function public.seed_portal_demo_g()
returns void
language plpgsql security definer set search_path = ''
as $$
declare b record; v_root uuid := md5('pd-drg-5-r1')::uuid;
begin
  select * into b from public.seed_portal_demo_base();
  if b.firm is null then return; end if;
  insert into public.drawings (id, ref, project_id, title, file_name, file_hash, storage_key, size_bytes, status, rev_no, root_id, is_current, revision_note, review_status, created_at, firm_id) values
    (v_root, 'PD-DRG-05', b.p1, 'Ground floor slab — reinforcement layout', 'PD-DRG-05-r1.dxf', md5('PD-DRG-05-r1'), 'demo/PD-DRG-05-r1.dxf', 0, 'READY', 1, v_root, false, 'First issue.', 'APPROVED', now() - interval '30 days', b.firm),
    (md5('pd-drg-5-r2')::uuid, 'PD-DRG-05-R2', b.p1, 'Ground floor slab — reinforcement layout', 'PD-DRG-05-r2.dxf', md5('PD-DRG-05-r2'), 'demo/PD-DRG-05-r2.dxf', 0, 'READY', 2, v_root, false, 'Added extra top steel at the staircase opening; revised lap lengths per structural note.', 'APPROVED', now() - interval '14 days', b.firm),
    (md5('pd-drg-5-r3')::uuid, 'PD-DRG-05-R3', b.p1, 'Ground floor slab — reinforcement layout', 'PD-DRG-05-r3.dxf', md5('PD-DRG-05-r3'), 'demo/PD-DRG-05-r3.dxf', 0, 'READY', 3, v_root, true, 'Slab depth 150 to 175 mm at the living room after the ceiling-height decision; bar schedule updated.', 'APPROVED', now() - interval '3 days', b.firm)
  on conflict (id) do update set is_current = excluded.is_current, revision_note = excluded.revision_note, created_at = excluded.created_at;
  insert into public.contractor_submissions (id, project_id, contractor_id, kind, subject, body, status, response_note, firm_id) values
    (md5('pd-ct-1')::uuid, b.p1, b.contractor, 'TICKET', 'Clash between beam B7 and the sleeve for the drainage line', 'The 110 mm sleeve falls inside beam B7 on drawing PD-DRG-05 r3. Please advise a relocation before we pour on Friday.', 'OPEN', null, b.firm),
    (md5('pd-ct-2')::uuid, b.p1, b.contractor, 'MEETING_REQUEST', 'Site coordination meeting — slab pour sequence', 'Request a meeting with the architect and structural consultant to agree the pour sequence and cold-joint locations.', 'RESPONDED', 'Booked for Thursday 11:00 at the site office.', b.firm),
    (md5('pd-ct-3')::uuid, b.p2, b.contractor, 'TICKET', 'Levelling datum not marked on site', 'We need the benchmark pillar levels confirmed before compaction starts on the north side.', 'RESOLVED', 'Datum marked and surveyed; levels shared in transmittal PD-TRN-03.', b.firm)
  on conflict (id) do update set status = excluded.status, response_note = excluded.response_note;
  insert into public.submission_messages (id, contractor_submission_id, author_name, author_side, body, firm_id) values
    (md5('pd-msg-1')::uuid, md5('pd-ct-1')::uuid, 'Portal Demo — Contractor', 'CONTRACTOR', 'Photo attached to the daily report. We can shift the sleeve 300 mm east if that works structurally.', b.firm),
    (md5('pd-msg-2')::uuid, md5('pd-ct-1')::uuid, 'Ar. Aditi Rao', 'FIRM', 'Checking with the structural consultant today — hold the pour on that bay until I confirm.', b.firm)
  on conflict (id) do nothing;
end;
$$;
revoke execute on function public.seed_portal_demo_g() from public, anon, authenticated;

create or replace function public.seed_portal_demo_data()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.seed_portal_demo_a();
  perform public.seed_portal_demo_b();
  perform public.seed_portal_demo_c();
  perform public.seed_portal_demo_d();
  perform public.seed_portal_demo_e();
  perform public.seed_portal_demo_f();
  perform public.seed_portal_demo_g();
end;
$$;
revoke execute on function public.seed_portal_demo_data() from public, anon, authenticated;
