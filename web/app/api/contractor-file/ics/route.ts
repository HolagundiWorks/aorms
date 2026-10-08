import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { buildMeetingIcs } from "../../../../lib/contractor/ics";

/** Calendar invite (.ics) for a confirmed meeting — RLS-scoped lookup, so only the contractor or the studio can fetch it. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const { data } = await (await createClient()).from("contractor_submissions").select("id, subject, body, meeting_at, meeting_place").eq("id", id).maybeSingle();
  if (!data?.meeting_at) return NextResponse.json({ error: "No confirmed meeting" }, { status: 404 });
  const ics = buildMeetingIcs({ uid: data.id, startsAt: new Date(data.meeting_at), summary: data.subject, place: data.meeting_place, description: data.body });
  return new NextResponse(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="meeting.ics"' } });
}
