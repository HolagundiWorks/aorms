import { NextResponse } from "next/server";
import { createServiceRoleClient } from "../../../../lib/supabase/service";
import { recomputeTaskScores } from "../../../../lib/pulse/recompute";

/**
 * ESTI Pulse — Modules 1/2/5/6 recompute pass (2026-09-12). Bearer-
 * secret gated, no cookie/session dependency — same external-caller
 * shape as app/api/razorpay/webhook/route.ts and app/api/calendar/
 * [token]/route.ts: the token IS the entire authorization check.
 * Intended caller is a scheduled `pg_net` → `pg_cron` job (see the
 * follow-up migration once PULSE_RECOMPUTE_SECRET is generated and set),
 * but is equally callable on demand — see lib/actions/pulse.ts's
 * `recomputeNow` Server Action for the same logic, used for immediate
 * testing without waiting on the cron interval.
 */
export async function POST(request: Request) {
  const secret = process.env.PULSE_RECOMPUTE_SECRET;
  if (!secret) {
    // Mis-configuration, not a caller error — 500 so a monitoring caller
    // (or Vercel/Hostinger logs) surfaces this loudly rather than the
    // cron job silently no-op'ing forever.
    return NextResponse.json({ error: "PULSE_RECOMPUTE_SECRET is not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    // 401, not 400 — unlike the Razorpay webhook, there's no legitimate
    // "signature will never verify, stop retrying" case here; a wrong or
    // missing bearer token is a genuine auth failure.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Multi-tenancy (migration 0053+) — this is a service-role call (no
    // session, bypasses RLS entirely), so recomputeTaskScores() must be
    // run once per firm with an explicit filter rather than once globally
    // — see its own header comment for why.
    const { data: firms, error: firmsError } = await supabase.from("firms").select("id");
    if (firmsError) return NextResponse.json({ error: firmsError.message }, { status: 500 });

    const totals = { tasksScanned: 0, tasksChanged: 0, missingParamsOpened: 0, missingParamsResolved: 0 };
    for (const firm of firms ?? []) {
      const summary = await recomputeTaskScores(supabase, today, firm.id);
      totals.tasksScanned += summary.tasksScanned;
      totals.tasksChanged += summary.tasksChanged;
      totals.missingParamsOpened += summary.missingParamsOpened;
      totals.missingParamsResolved += summary.missingParamsResolved;
    }
    return NextResponse.json({ ok: true, firmsProcessed: firms?.length ?? 0, ...totals });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Recompute failed" }, { status: 500 });
  }
}
