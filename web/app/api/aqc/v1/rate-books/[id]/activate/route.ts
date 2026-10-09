import { NextResponse } from "next/server";
import { authenticateAqc, dbError, isCtx } from "../../../../../../../lib/aqc/auth";

/** POST: make this the studio's active rate book (one at a time). Needs `fees:manage`. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const { error } = await ctx.supabase.rpc("aqc_set_active_rate_version", { p_id: id });
  if (error) return dbError(error.message);
  return NextResponse.json({ active: id });
}
