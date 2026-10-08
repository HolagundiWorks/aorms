import { NextResponse } from "next/server";
import { authenticateAqc, dbError, err, isCtx } from "../../../../../../../lib/aqc/auth";
import { PushRowsBody } from "../../../../../../../lib/aqc/contract";

const PAGE = 2000;
type Ctx = { params: Promise<{ id: string }> };

/** GET ?since=<seq>: rows changed after a seq (catch-up / open an online project). Returns `nextSince` and `more`. */
export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const since = Number(new URL(request.url).searchParams.get("since") ?? 0);
  if (!Number.isFinite(since) || since < 0) return err(400, "bad_request", "since must be a non-negative number.");

  const [{ data: project }, { data: rows, error }] = await Promise.all([
    ctx.supabase.from("aqc_projects").select("id, head_seq, format_version, settings").eq("id", id).maybeSingle(),
    ctx.supabase.from("aqc_rows").select("section, row_id, fields, deleted, seq").eq("aqc_project_id", id).gt("seq", since).order("seq").limit(PAGE),
  ]);
  if (error) return err(400, "bad_request", "Could not read rows.");
  if (!project) return err(404, "not_found", "AQC project not found.");
  const last = rows && rows.length ? rows[rows.length - 1].seq : since;
  return NextResponse.json({ headSeq: project.head_seq, formatVersion: project.format_version, settings: since === 0 ? project.settings : undefined, rows: rows ?? [], nextSince: last, more: (rows?.length ?? 0) === PAGE });
}

/** POST: upsert a batch of rows. Needs the edit lease (423 lease_required otherwise). */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const body = PushRowsBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return err(400, "bad_request", "Invalid rows payload.", { issues: body.error.issues.slice(0, 5) });
  const { data, error } = await ctx.supabase.rpc("aqc_push_rows", { p_aqc_project: id, p_rows: body.data.rows });
  if (error) return dbError(error.message);
  return NextResponse.json({ headSeq: Number(data) });
}
