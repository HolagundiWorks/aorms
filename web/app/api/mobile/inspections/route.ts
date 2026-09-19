import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createBearerClient, bearerTokenFrom } from "../../../../lib/supabase/bearer";
import { createServiceRoleClient } from "../../../../lib/supabase/service";
import { matchesClaimedType } from "../../../../lib/security/file-signature";

/**
 * Create Site Inspection Report, from the Android app (2026-09-19).
 * multipart/form-data, not JSON — this is the one mobile action that needs
 * a bespoke server route rather than a direct PostgREST call, because
 * uploading a photo needs the storage write the client's own RLS-scoped
 * session can't do (no `storage.objects` policy exists for any bucket in
 * this schema — every existing upload, incl. lib/drawings/upload.ts, goes
 * through a service-role route). Mirrors that same account: verify the
 * caller and the project via *their* session first (bearer client), only
 * then reach for the service-role client to write the object — the
 * service role never makes an authorization decision here, it only
 * performs a write already authorized above.
 *
 * The report row itself is inserted with the bearer client, not service
 * role, so `site_inspection_reports`' own RLS (staff + firm-scoped, and
 * its `firm_id`/`inspector_id` column defaults) does the real enforcement
 * — same division of labour lib/drawings/upload.ts uses.
 */
export const INSPECTIONS_BUCKET = "esti-site-inspections";
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS = 12;
const PHOTO_EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const token = bearerTokenFrom(request);
  if (!token) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });

  const supabase = createBearerClient(token);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });

  const formData = await request.formData();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const visitDate = String(formData.get("visitDate") ?? "").trim() || new Date().toISOString().slice(0, 10);
  const weather = String(formData.get("weather") ?? "").trim() || null;
  const summary = String(formData.get("summary") ?? "").trim();
  const issuesFound = String(formData.get("issuesFound") ?? "false") === "true";
  const followUpRequired = String(formData.get("followUpRequired") ?? "false") === "true";
  const followUpNotes = String(formData.get("followUpNotes") ?? "").trim() || null;
  const gpsLatRaw = String(formData.get("gpsLat") ?? "").trim();
  const gpsLngRaw = String(formData.get("gpsLng") ?? "").trim();
  const gpsLat = gpsLatRaw ? Number(gpsLatRaw) : null;
  const gpsLng = gpsLngRaw ? Number(gpsLngRaw) : null;
  const photos = formData.getAll("photos").filter((v): v is File => v instanceof File && v.size > 0);

  if (!projectId) return NextResponse.json({ error: "Project is required." }, { status: 400 });
  if (!summary) return NextResponse.json({ error: "Summary is required." }, { status: 400 });
  if (photos.length > MAX_PHOTOS) return NextResponse.json({ error: `At most ${MAX_PHOTOS} photos per report.` }, { status: 400 });
  for (const photo of photos) {
    if (photo.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: `${photo.name} is too large (10 MB max).` }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from("project_offices")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const { data: ref, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "inspection",
    p_default_prefix: "SIR",
  });
  if (refError) return NextResponse.json({ error: `Could not mint a reference: ${refError.message}` }, { status: 500 });

  const { data: inserted, error: insertError } = await supabase
    .from("site_inspection_reports")
    .insert({
      ref,
      project_id: projectId,
      visit_date: visitDate,
      weather,
      summary,
      issues_found: issuesFound,
      follow_up_required: followUpRequired,
      follow_up_notes: followUpNotes,
      gps_lat: gpsLat,
      gps_lng: gpsLng,
    })
    .select("id, ref")
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const serviceClient = createServiceRoleClient();
  const uploadedKeys: string[] = [];
  for (const photo of photos) {
    const claimedType = photo.type in PHOTO_EXTENSION_BY_TYPE ? photo.type : "image/jpeg";
    if (!(await matchesClaimedType(photo, claimedType))) {
      continue; // not a real photo — skip rather than fail the whole report
    }
    const buf = Buffer.from(await photo.arrayBuffer());
    const hash = createHash("sha256").update(buf).digest("hex");
    const storageKey = `${inserted.id}/${hash}.${PHOTO_EXTENSION_BY_TYPE[claimedType]}`;
    const { error: uploadError } = await serviceClient.storage
      .from(INSPECTIONS_BUCKET)
      .upload(storageKey, buf, { contentType: claimedType, upsert: true });
    if (uploadError) continue;

    const { error: photoRowError } = await supabase
      .from("site_inspection_photos")
      .insert({ report_id: inserted.id, storage_key: storageKey });
    if (!photoRowError) uploadedKeys.push(storageKey);
  }

  await supabase.rpc("write_audit", {
    p_entity: "site_inspection_report",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, ref: inserted.ref, issuesFound, followUpRequired, photoCount: uploadedKeys.length },
  });

  return NextResponse.json({ id: inserted.id, ref: inserted.ref, photosUploaded: uploadedKeys.length, photosSubmitted: photos.length });
}
