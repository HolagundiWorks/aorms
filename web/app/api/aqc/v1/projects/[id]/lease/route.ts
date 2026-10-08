import { NextResponse } from "next/server";
import { authenticateAqc, dbError, isCtx } from "../../../../../../../lib/aqc/auth";

/** POST: acquire or renew the project's edit lease (2 minutes). `held:false` means someone else is editing. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const { data, error } = await ctx.supabase.rpc("aqc_acquire_lease", { p_aqc_project: id });
  if (error) return dbError(error.message);
  return NextResponse.json({ held: data === true });
}
