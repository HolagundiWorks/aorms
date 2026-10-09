import { NextResponse } from "next/server";
import { authenticateAqc, err, isCtx } from "../../../../../../../lib/aqc/auth";
import { UploadInitBody } from "../../../../../../../lib/aqc/contract";
import { AQC_BUCKET, buildAqcStorageKey, checkAqcUpload } from "../../../../../../../lib/aqc/files";
import { createServiceRoleClient } from "../../../../../../../lib/supabase/service";

/**
 * POST: step 1 of attaching a file to a version — returns a one-time signed upload URL for a key this route mints
 * (`<firm>/<project>/<kind>/<sha256>.<ext>`). The project is looked up as the caller (RLS) and the caller needs `write`;
 * the service role only signs. Step 2: PUT the bytes to `uploadUrl`. Step 3: add the version with `storageKey`.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const body = UploadInitBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return err(400, "bad_request", "Invalid upload request.", { issues: body.error.issues.slice(0, 5) });
  const check = checkAqcUpload(body.data);
  if (!check.ok) return err(400, "bad_upload", check.message);

  const { data: project } = await ctx.supabase.from("aqc_projects").select("id").eq("id", id).maybeSingle();
  if (!project) return err(404, "not_found", "AQC project not found.");
  if ((await ctx.supabase.rpc("has_capability", { cap: "write" })).data !== true) return err(403, "forbidden", "Your role can't upload files.");

  const storageKey = buildAqcStorageKey(ctx.firmId, id, body.data.kind, body.data.sha256, check.ext);
  try {
    const { data, error } = await createServiceRoleClient().storage.from(AQC_BUCKET).createSignedUploadUrl(storageKey, { upsert: true });
    if (error || !data) return err(503, "storage_unavailable", "File storage isn't available right now. Try again shortly.");
    return NextResponse.json({ storageKey, uploadUrl: data.signedUrl, token: data.token, maxBytes: 25 * 1024 * 1024 }, { status: 201 });
  } catch {
    return err(503, "storage_unavailable", "File storage isn't available right now. Try again shortly.");
  }
}
