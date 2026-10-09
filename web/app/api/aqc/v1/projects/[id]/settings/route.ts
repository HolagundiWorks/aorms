import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateAqc, dbError, err, isCtx } from "../../../../../../../lib/aqc/auth";

const Body = z.object({ settings: z.record(z.string(), z.unknown()) });

/**
 * PUT: replace the project-level settings JSON (levels, markups, covers, yields, link rules, project info…). Needs `write` and
 * the edit lease (423 `lease_required` otherwise). Rows go through /rows; this is only the non-row project data.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return err(400, "bad_request", "Send { settings: {...} }.");
  if (JSON.stringify(body.data.settings).length > 1_000_000) return err(400, "too_large", "Settings are limited to 1 MB.");
  const { error } = await ctx.supabase.rpc("aqc_set_settings", { p_aqc_project: id, p_settings: body.data.settings });
  if (error) return dbError(error.message);
  return NextResponse.json({ ok: true });
}
