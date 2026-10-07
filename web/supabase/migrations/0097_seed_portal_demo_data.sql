-- Demo data for the three third-party portals (2026-10-07). The Client, Collaborator (consultant) and
-- Contractor demo logins are linked by sync_demo_accounts() to "Portal Demo — …" records that carried
-- almost nothing, so every portal opened empty. This seeds, for exactly those records:
--   Client      — 2 projects with phases, invoices (paid + unpaid), approvals and decisions awaiting a
--                 response, drawings, transmittals, meeting minutes and a submission.
--   Consultant  — engagements on both projects (agreed fee / paid), open tasks, an RFI and a deliverable.
--   Contractor  — four tender invitations in every state (invited, viewed, bid submitted, declined) with
--                 one sealed bid.
-- Every row has a deterministic id (md5 of a fixed key), so the seed is an idempotent upsert: running it
-- again resets the mutable fields (status, dates, response) of its own rows and never duplicates. It runs
-- nightly at 21:45 UTC, after reset_demo_data (21:30) and sync_demo_accounts (21:40). reset_demo_data never
-- touches these rows (its wipes key on DEMO-/“Demo — ” prefixes; these are PORTAL-DEMO-/PD-/“Portal Demo — ”).
-- APPLIED 2026-10-07 to the live `aorms-web` project (as these functions, created in pieces).
create or replace function public.seed_portal_demo_base()
returns table (firm uuid, owner uuid, client uuid, consultant uuid, contractor uuid, p1 uuid, p2 uuid)
language plpgsql security definer set search_path = ''
as $$
declare
  v_firm uuid; v_owner uuid; v_client uuid; v_consultant uuid; v_contractor uuid; v_p1 uuid; v_p2 uuid;
begin
  select p.firm_id, p.id into v_firm, v_owner from public.profiles p join auth.users u on u.id = p.id where u.email = 'aditi.rao@aorms.in' limit 1;
  if v_firm is null then return; end if;
  select id into v_client from public.clients where firm_id = v_firm and name = 'Portal Demo — Client' limit 1;
  select id into v_consultant from public.consultants where firm_id = v_firm and name = 'Portal Demo — Consultant' limit 1;
  select id into v_contractor from public.contractors where firm_id = v_firm and name = 'Portal Demo — Contractor' limit 1;
  select id into v_p1 from public.project_offices where firm_id = v_firm and ref = 'PORTAL-DEMO-01' limit 1;
  -- Not an error: safe before sync_demo_accounts() has created the portal records.
  if v_client is null or v_consultant is null or v_contractor is null or v_p1 is null then return; end if;
  select id into v_p2 from public.project_offices where firm_id = v_firm and ref = 'PORTAL-DEMO-02' limit 1;
  if v_p2 is null then
    insert into public.project_offices (ref, title, project_type, work_type, jurisdiction, status, client_id, state, city, contract_value_paise, date_start, created_by_id, firm_id)
    values ('PORTAL-DEMO-02', 'Portal Demo — Hillview Villa', 'Residential', 'ARCHITECTURE', 'BDA', 'ACTIVE', v_client, 'Karnataka', 'Bengaluru', 18000000, current_date - 20, v_owner, v_firm)
    returning id into v_p2;
  end if;
  return query select v_firm, v_owner, v_client, v_consultant, v_contractor, v_p1, v_p2;
end;
$$;
revoke execute on function public.seed_portal_demo_base() from public, anon, authenticated;

-- A: phases + invoices
create or replace function public.seed_portal_demo_a()
returns void
language plpgsql security definer set search_path = ''
as $$
declare b record;
begin
  select * into b from public.seed_portal_demo_base();
  if b.firm is null then return; end if;
  insert into public.phases (id, project_id, code, label, billing_pct, sort_order, firm_id)
  select md5('pd-phase-' || pr.n || c.code)::uuid, pr.p, c.code, c.label, c.pct, c.ord, b.firm
  from (values (1, b.p1), (2, b.p2)) as pr(n, p),
       (values ('CD', 'Concept Design', 15, 1), ('SD', 'Schematic Design', 20, 2), ('DD', 'Design Development', 30, 3),
               ('WD', 'Working Drawings', 25, 4), ('CA', 'Construction Administration', 10, 5)) as c(code, label, pct, ord)
  on conflict (id) do update set label = excluded.label, billing_pct = excluded.billing_pct, sort_order = excluded.sort_order;
  update public.project_offices set current_phase_id = md5('pd-phase-1DD')::uuid where id = b.p1;
  update public.project_offices set current_phase_id = md5('pd-phase-2SD')::uuid where id = b.p2;
  insert into public.invoices (id, ref, project_id, client_id, status, gst_system, document_kind, inter_state, tds_applicable, taxable_paise, cgst_paise, sgst_paise, igst_paise, gst_total_paise, tds_paise, grand_total_paise, net_receivable_paise, paid_paise, date_invoice, firm_id) values
    (md5('pd-inv-1')::uuid, 'PD-INV-01', b.p1, b.client, 'ISSUED', 'REGULAR', 'TAX_INVOICE', false, false, 5000000, 450000, 450000, 0, 900000, 0, 5900000, 5900000, 5900000, current_date - 40, b.firm),
    (md5('pd-inv-2')::uuid, 'PD-INV-02', b.p1, b.client, 'ISSUED', 'REGULAR', 'TAX_INVOICE', false, false, 7500000, 675000, 675000, 0, 1350000, 0, 8850000, 8850000, 0, current_date - 12, b.firm),
    (md5('pd-inv-3')::uuid, 'PD-INV-03', b.p2, b.client, 'ISSUED', 'REGULAR', 'TAX_INVOICE', false, false, 2700000, 243000, 243000, 0, 486000, 0, 3186000, 3186000, 0, current_date - 4, b.firm)
  on conflict (id) do update set status = excluded.status, paid_paise = excluded.paid_paise, date_invoice = excluded.date_invoice;
end;
$$;
revoke execute on function public.seed_portal_demo_a() from public, anon, authenticated;

-- B: approvals + decisions
create or replace function public.seed_portal_demo_b()
returns void
language plpgsql security definer set search_path = ''
as $$
declare b record;
begin
  select * into b from public.seed_portal_demo_base();
  if b.firm is null then return; end if;
  insert into public.approvals (id, project_id, entity_type, title, recipient, channel, status, sent_date, response_date, remarks, created_by_id, firm_id) values
    (md5('pd-apr-1')::uuid, b.p1, 'DRAWING', 'Ground floor plan — Rev B', 'Portal Demo — Client', 'PORTAL', 'SENT', current_date - 3, null, null, b.owner, b.firm),
    (md5('pd-apr-2')::uuid, b.p1, 'FEE_PROPOSAL', 'Fee proposal — Working drawings phase', 'Portal Demo — Client', 'PORTAL', 'SENT', current_date - 2, null, null, b.owner, b.firm),
    (md5('pd-apr-3')::uuid, b.p1, 'DRAWING', 'Facade colour and material scheme', 'Portal Demo — Client', 'PORTAL', 'APPROVED', current_date - 18, current_date - 14, 'Approved as presented.', b.owner, b.firm),
    (md5('pd-apr-4')::uuid, b.p2, 'PERMIT', 'Statutory submission set — BDA', 'Portal Demo — Client', 'PORTAL', 'SENT', current_date - 1, null, null, b.owner, b.firm)
  on conflict (id) do update set status = excluded.status, sent_date = excluded.sent_date, response_date = excluded.response_date, remarks = excluded.remarks;
  insert into public.decisions (id, project_id, title, rationale, state, revision_category, revision_source, impact, owner_name, review_deadline, created_by_id, firm_id) values
    (md5('pd-dec-1')::uuid, b.p1, 'Living room ceiling height: 3.0 m or 3.3 m', 'A 3.3 m ceiling lifts daylight into the double-height dining edge and suits the ceiling fans, at a small increase in wall and finish cost. The structure is unaffected.', 'CLIENT_REVIEW', 'MINOR', 'CLIENT_DRIVEN', 'MEDIUM', 'Ar. Aditi Rao', current_date + 6, b.owner, b.firm),
    (md5('pd-dec-2')::uuid, b.p1, 'Kitchen layout — option B (island)', 'Option B keeps the work triangle under 6 m and gives the family a breakfast counter; agreed after the walkthrough.', 'ACCEPTED', 'MINOR', 'CLIENT_DRIVEN', 'LOW', 'Ar. Aditi Rao', null, b.owner, b.firm),
    (md5('pd-dec-3')::uuid, b.p2, 'Retaining wall finish: exposed stone or plastered', 'Stone-faced retaining wall ties in with the garden boundary and needs no repainting; plaster is cheaper up front.', 'CLIENT_REVIEW', 'MINOR', 'INTERNAL_ERROR', 'LOW', 'Ar. Aditi Rao', current_date + 9, b.owner, b.firm)
  on conflict (id) do update set state = excluded.state, review_deadline = excluded.review_deadline;
end;
$$;
revoke execute on function public.seed_portal_demo_b() from public, anon, authenticated;

-- C: drawings, transmittals, minutes, a client submission
create or replace function public.seed_portal_demo_c()
returns void
language plpgsql security definer set search_path = ''
as $$
declare b record;
begin
  select * into b from public.seed_portal_demo_base();
  if b.firm is null then return; end if;
  insert into public.drawings (id, ref, project_id, title, file_name, file_hash, storage_key, size_bytes, status, firm_id) values
    (md5('pd-drg-1')::uuid, 'PD-DRG-01', b.p1, 'Ground floor plan', 'PD-DRG-01.dxf', md5('PD-DRG-01'), 'demo/PD-DRG-01.dxf', 0, 'READY', b.firm),
    (md5('pd-drg-2')::uuid, 'PD-DRG-02', b.p1, 'First floor plan', 'PD-DRG-02.dxf', md5('PD-DRG-02'), 'demo/PD-DRG-02.dxf', 0, 'READY', b.firm),
    (md5('pd-drg-3')::uuid, 'PD-DRG-03', b.p1, 'Front and rear elevations', 'PD-DRG-03.dxf', md5('PD-DRG-03'), 'demo/PD-DRG-03.dxf', 0, 'READY', b.firm),
    (md5('pd-drg-4')::uuid, 'PD-DRG-04', b.p2, 'Site plan and levels', 'PD-DRG-04.dxf', md5('PD-DRG-04'), 'demo/PD-DRG-04.dxf', 0, 'READY', b.firm)
  on conflict (id) do update set title = excluded.title;
  insert into public.transmittals (id, ref, project_id, recipient, purpose, channel, date_issued, notes, acknowledged_at, acknowledged_by, created_by_id, firm_id) values
    (md5('pd-trn-1')::uuid, 'PD-TRN-01', b.p1, 'Portal Demo — Client', 'For approval — plans and elevations', 'PORTAL', current_date - 18, 'Set A: GF/FF plans, elevations.', now() - interval '16 days', 'Portal Demo — Client', b.owner, b.firm),
    (md5('pd-trn-2')::uuid, 'PD-TRN-02', b.p1, 'Demo Structures LLP', 'For structural design — architectural base drawings', 'EMAIL', current_date - 9, 'Base plans for column grid.', null, null, b.owner, b.firm),
    (md5('pd-trn-3')::uuid, 'PD-TRN-03', b.p2, 'Portal Demo — Client', 'For information — site survey', 'PORTAL', current_date - 6, null, null, null, b.owner, b.firm)
  on conflict (id) do update set date_issued = excluded.date_issued, acknowledged_at = excluded.acknowledged_at, acknowledged_by = excluded.acknowledged_by;
  insert into public.moms (id, ref, project_id, title, meeting_date, venue, attendees, minutes, status, firm_id) values
    (md5('pd-mom-1')::uuid, 'PD-MOM-01', b.p1, 'Design development walkthrough', current_date - 11, 'Studio, Bengaluru', 'Client, Ar. Aditi Rao, Structural consultant', 'Walked the client through the plans and the 3D model. Agreed kitchen option B. Open: ceiling height in the living room (decision issued). Next: structural grid from the consultant within two weeks.', 'ISSUED', b.firm),
    (md5('pd-mom-2')::uuid, 'PD-MOM-02', b.p2, 'Site visit and brief', current_date - 17, 'Hillview site', 'Client, Ar. Aditi Rao', 'Visited the sloping plot. Discussed split-level planning and a stone retaining wall along the north boundary. Survey and soil report to follow.', 'ISSUED', b.firm)
  on conflict (id) do update set meeting_date = excluded.meeting_date;
  insert into public.portal_submissions (id, project_id, client_id, kind, subject, body, status, firm_id) values
    (md5('pd-sub-1')::uuid, b.p1, b.client, 'FEEDBACK', 'Love the courtyard — can we add a bench?', 'The courtyard in the latest plan works well. Could a built-in bench be added along the east wall?', 'OPEN', b.firm)
  on conflict (id) do update set status = excluded.status, response_note = null;
end;
$$;
revoke execute on function public.seed_portal_demo_c() from public, anon, authenticated;

-- D: consultant engagements + submissions
create or replace function public.seed_portal_demo_d()
returns void
language plpgsql security definer set search_path = ''
as $$
declare b record;
begin
  select * into b from public.seed_portal_demo_base();
  if b.firm is null then return; end if;
  update public.engagements set scope = 'Structural design and drawings', agreed_fee_paise = 24000000, paid_paise = 9000000, status = 'ACTIVE' where consultant_id = b.consultant and project_id = b.p1;
  update public.engagements set scope = 'Foundation and retaining wall design', agreed_fee_paise = 15000000, paid_paise = 0, status = 'ACTIVE' where consultant_id = b.consultant and project_id = b.p2;
  insert into public.engagements (id, project_id, consultant_id, scope, agreed_fee_paise, paid_paise, status, firm_id)
  select md5('pd-eng-' || x.n)::uuid, x.p, b.consultant, x.scope, x.fee, x.paid, 'ACTIVE', b.firm
  from (values (1, b.p1, 'Structural design and drawings', 24000000, 9000000), (2, b.p2, 'Foundation and retaining wall design', 15000000, 0)) as x(n, p, scope, fee, paid)
  where not exists (select 1 from public.engagements e where e.consultant_id = b.consultant and e.project_id = x.p);
  insert into public.consultant_submissions (id, project_id, consultant_id, kind, subject, body, status, firm_id) values
    (md5('pd-cs-1')::uuid, b.p1, b.consultant, 'TASK', 'Issue column grid and foundation layout', 'Please issue the column grid and isolated footing layout against Rev B plans.', 'OPEN', b.firm),
    (md5('pd-cs-2')::uuid, b.p1, b.consultant, 'TASK', 'Review the 3.3 m ceiling option for slab depth', 'Confirm slab and beam depths if the living room goes to 3.3 m.', 'OPEN', b.firm),
    (md5('pd-cs-3')::uuid, b.p1, b.consultant, 'TASK', 'Confirm soil bearing capacity assumption', 'Share the assumed SBC used for the footing design.', 'RESOLVED', b.firm),
    (md5('pd-cs-4')::uuid, b.p1, b.consultant, 'DELIVERABLE', 'Structural design basis report — issue 1', 'Design basis, loads and codes (IS 456, IS 875) for review.', 'OPEN', b.firm),
    (md5('pd-cs-5')::uuid, b.p2, b.consultant, 'RFI', 'Retaining wall height along the north boundary', 'Is the wall height up to 2.4 m acceptable, given the survey levels?', 'OPEN', b.firm)
  on conflict (id) do update set status = excluded.status, response_note = null;
end;
$$;
revoke execute on function public.seed_portal_demo_d() from public, anon, authenticated;

-- E: contractor tenders, invitations (every state) and one sealed bid
create or replace function public.seed_portal_demo_e()
returns void
language plpgsql security definer set search_path = ''
as $$
declare b record;
begin
  select * into b from public.seed_portal_demo_base();
  if b.firm is null then return; end if;
  insert into public.tenders (id, project_id, title, category, scope, status, due_date, instructions, created_by_id, firm_id) values
    (md5('pd-tnd-1')::uuid, b.p2, 'Foundation and plinth beam works', 'Civil Contractor', 'Excavation, PCC, footings, columns to plinth and plinth beam for the Hillview Villa, per the issued foundation drawings.', 'OPEN', current_date + 14, 'Sealed lump-sum bid inclusive of materials and labour. Site visit by appointment. Mention your completion period in weeks.', b.owner, b.firm),
    (md5('pd-tnd-2')::uuid, b.p2, 'Compound wall and hardscape', 'Civil Contractor', 'Boundary wall, gates and driveway paving, per the site plan.', 'OPEN', current_date + 9, 'Rates to include the stone facing on the north wall.', b.owner, b.firm),
    (md5('pd-tnd-3')::uuid, b.p1, 'Superstructure RCC — Lakeview Residence', 'Civil Contractor', 'Ground and first floor slabs, beams, columns and staircase to the structural drawings.', 'OPEN', current_date + 5, 'Concrete grade M25; steel Fe500D. Bid is sealed until the due date.', b.owner, b.firm),
    (md5('pd-tnd-4')::uuid, b.p1, 'Interior joinery package', 'Interior Fit-out', 'Wardrobes, kitchen carcasses and shutters.', 'CLOSED', current_date - 3, 'Closed — awarded elsewhere.', b.owner, b.firm)
  on conflict (id) do update set status = excluded.status, due_date = excluded.due_date;
  insert into public.tender_invitations (id, tender_id, contractor_id, status, invited_at, viewed_at, firm_id) values
    (md5('pd-inv-t1')::uuid, md5('pd-tnd-1')::uuid, b.contractor, 'VIEWED', now() - interval '6 days', now() - interval '5 days', b.firm),
    (md5('pd-inv-t2')::uuid, md5('pd-tnd-2')::uuid, b.contractor, 'INVITED', now() - interval '3 days', null, b.firm),
    (md5('pd-inv-t3')::uuid, md5('pd-tnd-3')::uuid, b.contractor, 'SUBMITTED', now() - interval '8 days', now() - interval '7 days', b.firm),
    (md5('pd-inv-t4')::uuid, md5('pd-tnd-4')::uuid, b.contractor, 'DECLINED', now() - interval '12 days', now() - interval '11 days', b.firm)
  on conflict (id) do update set status = excluded.status, viewed_at = excluded.viewed_at;
  insert into public.tender_bids (id, invitation_id, amount_paise, completion_weeks, notes, firm_id) values
    (md5('pd-bid-3')::uuid, md5('pd-inv-t3')::uuid, 385000000, 24, 'Lump sum including materials, labour, shuttering and curing. Excludes waterproofing.', b.firm)
  on conflict (id) do update set amount_paise = excluded.amount_paise, completion_weeks = excluded.completion_weeks, notes = excluded.notes;
end;
$$;
revoke execute on function public.seed_portal_demo_e() from public, anon, authenticated;

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
end;
$$;
revoke execute on function public.seed_portal_demo_data() from public, anon, authenticated;

-- Nightly, after reset_demo_data (21:30 UTC) and sync_demo_accounts (21:40 UTC).
select cron.schedule('seed-portal-demo-data', '45 21 * * *', 'select public.seed_portal_demo_data()');
