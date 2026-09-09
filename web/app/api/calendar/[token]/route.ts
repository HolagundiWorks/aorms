import { NextResponse } from "next/server";
import { createServiceRoleClient } from "../../../../lib/supabase/service";
import { loadWorkloadEvents, parseCalendarScope } from "../../../../lib/calendar/workload";
import { buildIcsFeed } from "../../../../lib/calendar/ics";

/**
 * Public, unauthenticated `.ics` workload subscription feed — port of
 * backend/src/modules/calendar/feed.ts. The one piece Phase 5's own
 * dashboard/reports build deliberately deferred ("the `.ics` calendar-feed
 * Route Handler, token-based, outside the `(app)` auth group").
 *
 * No RLS applies — same reasoning as the feasibility share route: a
 * calendar app's subscription request isn't a Supabase Auth session, so
 * the per-user secret token in the URL *is* the entire authorization
 * check, verified against `profiles.calendar_feed_token` with the
 * service-role client. 90-day TTL and the disabled/portal-role
 * exclusions are enforced here in code, matching
 * `userForCalendarToken()`'s own checks exactly.
 */
const TOKEN_TTL_DAYS = 90;
const EXCLUDED_ROLES = new Set(["CLIENT", "CONSULTANT", "CONTRACTOR"]);

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: rawParam } = await params;
  const token = rawParam.replace(/\.ics$/i, "");

  const supabase = createServiceRoleClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, disabled, calendar_feed_token_at")
    .eq("calendar_feed_token", token)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!profile || profile.disabled || EXCLUDED_ROLES.has(profile.role)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const issuedAt = profile.calendar_feed_token_at ? new Date(profile.calendar_feed_token_at) : null;
  const isLive = issuedAt !== null && Date.now() - issuedAt.getTime() <= TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  if (!isLive) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const scope = parseCalendarScope(url.searchParams.get("scope"));

  const events = await loadWorkloadEvents(supabase, profile.id, profile.role, scope);
  if (!Array.isArray(events)) {
    return new NextResponse(events.error, { status: 403 });
  }
  const calName = scope === "office" ? "AORMS — Office workload" : `AORMS — ${profile.full_name || "My"} tasks`;
  const body = buildIcsFeed(events, calName);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}
