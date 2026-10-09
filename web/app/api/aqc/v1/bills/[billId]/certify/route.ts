import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateAqc, dbError, err, isCtx } from "../../../../../../../lib/aqc/auth";

const Body = z.object({
  retentionPaise: z.number().int().min(0),
  gstPaise: z.number().int().min(0).default(0),
  tdsPaise: z.number().int().min(0).default(0),
  cessPaise: z.number().int().min(0).default(0),
  gstTdsPaise: z.number().int().min(0).default(0),
  advanceRecoveryPaise: z.number().int().min(0).default(0),
  otherDeductionPaise: z.number().int().min(0).default(0),
  contentHash: z.string().min(8).max(128).optional(),
  aqcProjectId: z.string().uuid().optional(),
});

/**
 * POST: AQC publishes its certification of a contractor's bill (AQC computed every amount; AORMS only records them).
 * The update runs as the caller, so RLS plus the existing `pmc_ra_bills_certify_guard` (needs `cost:approve`) still apply —
 * certification stays double-gated. Optionally also stores the immutable `ipc` version.
 */
export async function POST(request: Request, { params }: { params: Promise<{ billId: string }> }) {
  const { billId } = await params;
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return err(400, "bad_request", "Invalid certification payload.", { issues: body.error.issues.slice(0, 5) });
  const b = body.data;

  const { data: bill } = await ctx.supabase.from("pmc_ra_bills").select("id, status, gross_paise").eq("id", billId).maybeSingle();
  if (!bill) return err(404, "not_found", "Bill not found.");
  if (!["DRAFT", "SITE_CHECKED"].includes(bill.status)) return err(409, "already_certified", "That bill is already certified.");

  const { data: updated, error } = await ctx.supabase.from("pmc_ra_bills").update({
    status: "CERTIFIED", certified_at: new Date().toISOString(), certified_by_id: ctx.user.id, updated_at: new Date().toISOString(),
    retention_paise: b.retentionPaise, gst_paise: b.gstPaise, tds_paise: b.tdsPaise, cess_paise: b.cessPaise, gst_tds_paise: b.gstTdsPaise,
    advance_recovery_paise: b.advanceRecoveryPaise, other_deduction_paise: b.otherDeductionPaise,
  }).eq("id", billId).select("id");
  if (error) return dbError(error.message);
  if (!updated?.length) return err(403, "forbidden", "Your role can't certify bills.");

  let version: number | null = null;
  if (b.aqcProjectId && b.contentHash) {
    const v = await ctx.supabase.rpc("aqc_add_version", { p_aqc_project: b.aqcProjectId, p_kind: "ipc", p_content_hash: b.contentHash, p_summary: { billId, ...b, contentHash: undefined, aqcProjectId: undefined }, p_storage_key: null });
    if (!v.error) version = v.data as number;
  }
  await ctx.supabase.rpc("write_audit", { p_entity: "pmc_ra_bill", p_entity_id: billId, p_action: "UPDATE", p_before: null, p_after: { status: "CERTIFIED", via: "AQC" } });
  return NextResponse.json({ certified: true, version });
}
