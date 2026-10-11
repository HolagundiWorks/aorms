import { NextResponse } from "next/server";
import { authenticateAqc, err, isCtx } from "../../../../../../lib/aqc/auth";

/** GET: one version with all its items, in AQC's order. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const { data: version } = await ctx.supabase.from("aqc_rate_versions").select("id, client_id, name, notes, revision, item_count, is_active, updated_at").eq("id", id).maybeSingle();
  if (!version) return err(404, "not_found", "Rate book not found.");
  // PostgREST caps one response at 1000 rows, so a bigger book is read in pages (a single `.limit(20000)` came back cut at 1000).
  const items: unknown[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await ctx.supabase.from("aqc_rate_items").select("code, category, description, unit, rate").eq("version_id", id).order("sort_order").range(from, from + 999);
    if (error) return err(400, "bad_request", "Could not read the rate book.");
    items.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return NextResponse.json({ version, items });
}
