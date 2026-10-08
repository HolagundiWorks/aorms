import { NextResponse } from "next/server";
import { authenticateAqc, dbError, err, isCtx } from "../../../../../../../lib/aqc/auth";
import { AddVersionBody } from "../../../../../../../lib/aqc/contract";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const { data, error } = await ctx.supabase.from("aqc_versions").select("id, kind, version, summary, storage_key, client_visible, created_at").eq("aqc_project_id", id).order("created_at", { ascending: false });
  if (error) return err(400, "bad_request", "Could not read versions.");
  return NextResponse.json({ versions: data ?? [] });
}

/** POST: add an immutable version (estimate, BOQ, certified bill ...). Identical content returns the existing version. */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const body = AddVersionBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return err(400, "bad_request", "Invalid version payload.", { issues: body.error.issues.slice(0, 5) });
  const { data, error } = await ctx.supabase.rpc("aqc_add_version", {
    p_aqc_project: id, p_kind: body.data.kind, p_content_hash: body.data.contentHash, p_summary: body.data.summary, p_storage_key: body.data.storageKey ?? null,
  });
  if (error) return dbError(error.message);
  return NextResponse.json({ version: data }, { status: 201 });
}
