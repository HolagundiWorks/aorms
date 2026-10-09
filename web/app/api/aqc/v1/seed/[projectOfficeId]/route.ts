import { NextResponse } from "next/server";
import { authenticateAqc, err, isCtx } from "../../../../../../lib/aqc/auth";
import { buildAqcSeed } from "../../../../../../lib/aqc/seed";

/**
 * GET: everything AQC imports when a user opens an online project (D5) — title block, letterhead, parties, the current
 * drawings (with file endpoints), the programme summary, the packages awarded, and the AQC binding if any. RLS-scoped.
 */
export async function GET(request: Request, { params }: { params: Promise<{ projectOfficeId: string }> }) {
  const { projectOfficeId } = await params;
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const { supabase, firmId } = ctx;

  const { data: project } = await supabase.from("project_offices").select("id, ref, title, city, site_address, contact_email, contact_phone, client_id, status").eq("id", projectOfficeId).maybeSingle();
  if (!project) return err(404, "not_found", "Project not found.");

  const [{ data: firm }, { data: client }, { data: packages }, { data: drawings }, { data: milestones }, { data: bound }] = await Promise.all([
    supabase.from("firms").select("company_name, architect_name, gstin, pan, email, phone, address_line1, address_line2, city, pincode, state").eq("id", firmId).maybeSingle(),
    project.client_id ? supabase.from("clients").select("name, contact_person, email, phone").eq("id", project.client_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("pmc_packages").select("id, ref, title, trade, status, contract_value_paise, contractor_id, contractors(name, company_name, contact_person, gstin, pan, email, phone, city)").eq("project_id", projectOfficeId),
    supabase.from("drawings").select("id, ref, title, rev_no, file_name, size_bytes, status, is_current").eq("project_id", projectOfficeId).eq("is_current", true).order("ref"),
    supabase.from("pmc_milestones").select("id, ref, title, planned_date, actual_date, percent_complete, status, duration_days, predecessor_id, dep_type, lag_days").eq("project_id", projectOfficeId).order("sort_order"),
    supabase.from("aqc_projects").select("id, head_seq, format_version").eq("project_office_id", projectOfficeId).maybeSingle(),
  ]);

  const awarded = (packages ?? []).find((p) => p.contractor_id && ["AWARDED", "IN_PROGRESS", "COMPLETE"].includes(p.status));
  const c = awarded ? (Array.isArray(awarded.contractors) ? awarded.contractors[0] : awarded.contractors) : null;
  const seed = buildAqcSeed(project, firm ?? { company_name: null, architect_name: null, gstin: null, pan: null, email: null, phone: null, address_line1: null, address_line2: null, city: null, pincode: null, state: null }, client ?? null, c ?? null);

  return NextResponse.json({
    ...seed,
    projectOffice: { id: project.id, ref: project.ref, title: project.title, status: project.status },
    packages: (packages ?? []).map((p) => ({ id: p.id, ref: p.ref, title: p.title, trade: p.trade, status: p.status, contractValuePaise: p.contract_value_paise })),
    drawings: (drawings ?? []).map((d) => ({ id: d.id, ref: d.ref, title: d.title, rev: d.rev_no, fileName: d.file_name, sizeBytes: d.size_bytes, file: `/api/aqc/v1/files/drawing/${d.id}` })),
    schedule: milestones ?? [],
    aqc: bound ? { id: bound.id, headSeq: bound.head_seq, formatVersion: bound.format_version } : null,
  });
}
