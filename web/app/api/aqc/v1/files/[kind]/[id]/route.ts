import { NextResponse } from "next/server";
import { authenticateAqc, err, isCtx } from "../../../../../../../lib/aqc/auth";
import { createServiceRoleClient } from "../../../../../../../lib/supabase/service";
import { CONTRACTOR_ATTACHMENTS_BUCKET } from "../../../../../../../lib/contractor/attachments";
import { DRAWINGS_BUCKET } from "../../../../../../../lib/drawings/upload";

/**
 * GET: a 5-minute signed URL for a file AQC may open — a current drawing (to load into the take-off viewer) or a
 * contractor's bill backup / ticket attachment. The row is read as the caller first (RLS), so a URL is only minted for
 * something the caller could already see; the service role only signs.
 */
export async function GET(request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return err(400, "bad_request", "Bad id.");

  let bucket = CONTRACTOR_ATTACHMENTS_BUCKET;
  let key: string | null = null;
  if (kind === "drawing") {
    bucket = DRAWINGS_BUCKET;
    key = (await ctx.supabase.from("drawings").select("storage_key").eq("id", id).maybeSingle()).data?.storage_key ?? null;
  } else if (kind === "bill") {
    key = (await ctx.supabase.from("pmc_ra_bills").select("attachment_key").eq("id", id).maybeSingle()).data?.attachment_key ?? null;
  } else if (kind === "submission") {
    key = (await ctx.supabase.from("contractor_submissions").select("storage_key").eq("id", id).maybeSingle()).data?.storage_key ?? null;
  } else {
    return err(400, "bad_request", "Unknown file kind.");
  }
  if (!key) return err(404, "not_found", "No file.");
  try {
    const { data } = await createServiceRoleClient().storage.from(bucket).createSignedUrl(key, 300);
    if (!data?.signedUrl) return err(404, "not_found", "File unavailable.");
    return NextResponse.json({ url: data.signedUrl, expiresInSeconds: 300 });
  } catch {
    return err(503, "storage_unavailable", "File storage isn't available right now. Try again shortly.");
  }
}
