import { NextResponse } from "next/server";
import { authenticateAqc, err, isCtx } from "../../../../../lib/aqc/auth";

/**
 * GET ?projectOfficeId=&since=<ISO>: what the studio has waiting for AQC — contractor running-bill claims (with their
 * measurement lines and backup file), progress updates, joint-measurement and site-visit requests. Read as the caller, so
 * RLS limits it to their studio. AQC acts on a claim by certifying it (POST /bills/{id}/certify).
 */
export async function GET(request: Request) {
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const url = new URL(request.url);
  const projectOfficeId = url.searchParams.get("projectOfficeId");
  const since = url.searchParams.get("since");
  if (projectOfficeId && !/^[0-9a-f-]{36}$/i.test(projectOfficeId)) return err(400, "bad_request", "Bad projectOfficeId.");
  if (since && Number.isNaN(Date.parse(since))) return err(400, "bad_request", "since must be an ISO timestamp.");

  let bills = ctx.supabase.from("pmc_ra_bills")
    .select("id, project_id, package_id, ref, bill_no, period_start, period_end, status, gross_paise, retention_pct, gst_pct, tds_pct, cess_pct, gst_tds_pct, advance_recovery_paise, narrative, attachment_key, attachment_name, submitted_at, pmc_ra_lines(description, unit, previous_qty, this_qty, rate_paise, amount_paise, sort_order)")
    .not("submitted_by_contractor_id", "is", null).in("status", ["DRAFT", "SITE_CHECKED"]).order("submitted_at");
  let subs = ctx.supabase.from("contractor_submissions")
    .select("id, project_id, kind, subject, body, status, milestone_id, percent_complete, meeting_at, applied_at, created_at")
    .in("kind", ["PROGRESS_UPDATE", "JOINT_MEASUREMENT", "SITE_VISIT", "MEETING_REQUEST"]).neq("status", "RESOLVED").order("created_at");
  if (projectOfficeId) { bills = bills.eq("project_id", projectOfficeId); subs = subs.eq("project_id", projectOfficeId); }
  if (since) { bills = bills.gt("submitted_at", since); subs = subs.gt("created_at", since); }
  const [{ data: b, error: be }, { data: s, error: se }] = await Promise.all([bills, subs]);
  if (be || se) return err(400, "bad_request", "Could not read the inbox.");

  return NextResponse.json({
    bills: (b ?? []).map((x) => ({
      ...x, pmc_ra_lines: undefined,
      lines: [...(x.pmc_ra_lines ?? [])].sort((p, q) => p.sort_order - q.sort_order),
      backup: x.attachment_key ? `/api/aqc/v1/files/bill/${x.id}` : null,
    })),
    submissions: s ?? [],
    now: new Date().toISOString(),
  });
}
