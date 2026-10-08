import { NextResponse } from "next/server";
import { authenticateAqc, dbError, err, isCtx } from "../../../../../lib/aqc/auth";
import { PushProjectBody, ROW_BATCH } from "../../../../../lib/aqc/contract";

/** GET: the user's online projects (AORMS projects, RLS-scoped) with their AQC binding if any — what AQC lists after sign-in. */
export async function GET(request: Request) {
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const [{ data: projects }, { data: bound }] = await Promise.all([
    ctx.supabase.from("project_offices").select("id, ref, title, status, city").order("created_at", { ascending: false }),
    ctx.supabase.from("aqc_projects").select("id, project_office_id, head_seq, format_version, lease_holder, lease_expires_at, updated_at"),
  ]);
  const byProject = new Map((bound ?? []).map((b) => [b.project_office_id, b]));
  return NextResponse.json({
    projects: (projects ?? []).map((p) => {
      const b = byProject.get(p.id);
      const leased = !!b?.lease_expires_at && new Date(b.lease_expires_at) > new Date() && b.lease_holder !== ctx.user.id;
      return { projectOfficeId: p.id, ref: p.ref, title: p.title, status: p.status, city: p.city, aqc: b ? { id: b.id, headSeq: b.head_seq, formatVersion: b.format_version, editedByOther: leased, updatedAt: b.updated_at } : null };
    }),
  });
}

/** POST: "Push online" — adopt a local project into an AORMS project, once (D9), and upload all its rows. */
export async function POST(request: Request) {
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const body = PushProjectBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return err(400, "bad_request", "Invalid project payload.", { issues: body.error.issues.slice(0, 5) });
  const { projectOfficeId, formatVersion, settings, rows } = body.data;

  const { data: aqcProjectId, error } = await ctx.supabase.rpc("aqc_bind_project", { p_project_office: projectOfficeId, p_format_version: formatVersion, p_settings: settings });
  if (error || !aqcProjectId) return dbError(error?.message ?? "Could not bind the project.");

  let headSeq = 0;
  for (let i = 0; i < rows.length; i += ROW_BATCH) {
    const { data, error: pushErr } = await ctx.supabase.rpc("aqc_push_rows", { p_aqc_project: aqcProjectId, p_rows: rows.slice(i, i + ROW_BATCH) });
    if (pushErr) return dbError(pushErr.message);
    headSeq = Number(data);
  }
  return NextResponse.json({ aqcProjectId, headSeq, rows: rows.length }, { status: 201 });
}
