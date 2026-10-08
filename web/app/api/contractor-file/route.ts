import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { createServiceRoleClient } from "../../../lib/supabase/service";
import { CONTRACTOR_ATTACHMENTS_BUCKET } from "../../../lib/contractor/attachments";
import { DRAWINGS_BUCKET } from "../../../lib/drawings/upload";

/**
 * Signed download for contractor-facing files. The row is looked up with the caller's own RLS-scoped client first
 * (a contractor sees only their own submissions/bills and drawings of their projects; staff see their firm's), so a
 * signed URL is only minted for a file the caller could already see. `?t=drawing|submission|bill&id=<uuid>`.
 */
export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t") ?? "";
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const supabase = await createClient();
  let bucket = CONTRACTOR_ATTACHMENTS_BUCKET;
  let key: string | null = null;
  if (t === "drawing") {
    bucket = DRAWINGS_BUCKET;
    key = (await supabase.from("drawings").select("storage_key").eq("id", id).maybeSingle()).data?.storage_key ?? null;
  } else if (t === "submission") {
    key = (await supabase.from("contractor_submissions").select("storage_key").eq("id", id).maybeSingle()).data?.storage_key ?? null;
  } else if (t === "bill") {
    key = (await supabase.from("pmc_ra_bills").select("attachment_key").eq("id", id).maybeSingle()).data?.attachment_key ?? null;
  } else {
    return NextResponse.json({ error: "Bad type" }, { status: 400 });
  }
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data } = await createServiceRoleClient().storage.from(bucket).createSignedUrl(key, 300);
  if (!data?.signedUrl) return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
