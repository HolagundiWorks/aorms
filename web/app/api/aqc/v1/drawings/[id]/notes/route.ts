import { NextResponse } from "next/server";
import { authenticateAqc, err, isCtx } from "../../../../../../../lib/aqc/auth";
import { NoteCreateBody, UUID_RE } from "../../../../../../../lib/aqc/contract";
import { chainRoot } from "../../../../../../../lib/aqc/drawing-chain";
import { NOTE_COLS as COLS, noteJson, type NoteRow as Row } from "../../../../../../../lib/aqc/notes";

/** GET: the studio's notes on a drawing (any revision id resolves to the chain root). RLS-scoped, so staff of the same studio only. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return err(400, "bad_request", "Bad drawing id.");
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const root = await chainRoot(ctx.supabase, id);
  if (!root) return err(404, "not_found", "Drawing not found.");
  const { data, error } = await ctx.supabase.from("drawing_notes").select(COLS).eq("drawing_root_id", root.rootId).order("created_at").limit(500);
  if (error) return err(502, "read_failed", "Couldn't read the notes.");
  return NextResponse.json({ rootId: root.rootId, notes: (data as unknown as Row[]).map(noteJson) });
}

/** POST { body, x, y }: add a note. Needs `write`. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return err(400, "bad_request", "Bad drawing id.");
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const body = NoteCreateBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return err(400, "bad_request", "Send { body (1-2000 chars), x, y }.");
  if ((await ctx.supabase.rpc("has_capability", { cap: "write" })).data !== true) return err(403, "forbidden", "Your role can't add notes.");
  const root = await chainRoot(ctx.supabase, id);
  if (!root) return err(404, "not_found", "Drawing not found.");
  const { data, error } = await ctx.supabase
    .from("drawing_notes")
    .insert({ project_id: root.projectId, drawing_root_id: root.rootId, body: body.data.body, x: body.data.x, y: body.data.y })
    .select(COLS)
    .single();
  if (error) return err(403, "forbidden", "Couldn't save the note.");
  return NextResponse.json({ note: noteJson(data as unknown as Row) }, { status: 201 });
}
