import { NextResponse } from "next/server";
import { authenticateAqc, err, isCtx } from "../../../../../../lib/aqc/auth";

/** GET: one version with all its items, in AQC's order. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const [{ data: version }, { data: items, error }] = await Promise.all([
    ctx.supabase.from("aqc_rate_versions").select("id, client_id, name, notes, revision, item_count, is_active, updated_at").eq("id", id).maybeSingle(),
    ctx.supabase.from("aqc_rate_items").select("code, category, description, unit, rate").eq("version_id", id).order("sort_order").limit(20000),
  ]);
  if (error) return err(400, "bad_request", "Could not read the rate book.");
  if (!version) return err(404, "not_found", "Rate book not found.");
  return NextResponse.json({ version, items: items ?? [] });
}
