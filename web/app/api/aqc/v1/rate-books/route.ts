import { NextResponse } from "next/server";
import { authenticateAqc, dbError, err, isCtx } from "../../../../../lib/aqc/auth";
import { PublishRateBookBody, findDuplicateCodes, hashRateItems } from "../../../../../lib/aqc/rate-books";

/** GET: the studio's shared rate-book versions (what every AQC seat prices from). */
export async function GET(request: Request) {
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const { data, error } = await ctx.supabase.from("aqc_rate_versions").select("id, client_id, name, notes, revision, item_count, is_active, content_hash, updated_at").order("updated_at", { ascending: false });
  if (error) return err(400, "bad_request", "Could not read rate books.");
  return NextResponse.json({ versions: data ?? [] });
}

/** POST: publish (create or update) one rate-book version. Needs `fees:manage`. Unchanged content is a no-op (`changed:false`). */
export async function POST(request: Request) {
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const body = PublishRateBookBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return err(400, "bad_request", "Invalid rate book.", { issues: body.error.issues.slice(0, 5) });
  const { clientId, name, notes, items, activate } = body.data;
  const dup = findDuplicateCodes(items);
  if (dup.length) return err(400, "duplicate_codes", `Item codes must be unique (${dup.slice(0, 5).join(", ")}).`);

  const { data, error } = await ctx.supabase.rpc("aqc_publish_rate_version", {
    p_client_id: clientId, p_name: name, p_notes: notes, p_hash: hashRateItems(name, notes, items), p_items: items, p_activate: activate,
  });
  if (error) return dbError(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ versionId: row.version_id, revision: row.revision, changed: row.changed }, { status: row.changed ? 201 : 200 });
}
