import type { SupabaseClient } from "@supabase/supabase-js";
import { formatInrCompact } from "../formatting/currency";
import type { KpiTrend } from "../../components/aorms/KpiTile";

/**
 * Turns migration 0045's daily KPI snapshots into real KpiTile `trend`
 * props (shell/identity/KPI spec §21-22) — reads each metric's most
 * recent snapshot strictly before `today` and diffs it against the
 * already-computed current value the caller passes in (no second query
 * for "today's" value; the page already has it). A metric with no prior
 * snapshot yet (new metric, or before the daily cron has run even once)
 * gets `undefined` — no trend shown, rather than fabricating a "0%
 * change" against history that doesn't exist (spec §32: never fake a
 * movement indicator).
 *
 * `direction` (up/down/flat) and `impact` (positive/negative/neutral)
 * are computed separately per `higherIsBetter` — e.g. Blocked tasks
 * rising is `direction: "up"` but `impact: "negative"`, Clients rising
 * is `direction: "up"` and `impact: "positive"` — so the arrow's literal
 * direction is never conflated with whether the change is good news.
 *
 * Shows the absolute delta, not a percentage: with small counts (going
 * from 1 blocked task to 2 is a "100% increase" but a genuinely
 * misleading way to say "one more"), an absolute delta reads honestly at
 * every scale — matches several of the spec's own examples ("↑ 2 this
 * month", "↓ 3 vs last week") over the percentage-based ones.
 */
export async function getKpiTrends(
  supabase: SupabaseClient,
  today: string,
  specs: { key: string; current: number; higherIsBetter: boolean | null; isMoney?: boolean }[],
): Promise<Record<string, KpiTrend | undefined>> {
  const keys = specs.map((s) => s.key);
  const { data } = await supabase
    .from("kpi_snapshots")
    .select("metric_key, value, captured_on")
    .in("metric_key", keys)
    .lt("captured_on", today)
    .order("captured_on", { ascending: false })
    .limit(keys.length * 10); // enough rows to find each key's most recent even with a sparse/gappy history

  const previousByKey = new Map<string, { value: number; capturedOn: string }>();
  for (const row of (data ?? []) as { metric_key: string; value: number; captured_on: string }[]) {
    if (!previousByKey.has(row.metric_key)) {
      previousByKey.set(row.metric_key, { value: Number(row.value), capturedOn: row.captured_on });
    }
  }

  const result: Record<string, KpiTrend | undefined> = {};
  for (const spec of specs) {
    const prev = previousByKey.get(spec.key);
    if (!prev) {
      result[spec.key] = undefined;
      continue;
    }

    const delta = spec.current - prev.value;
    const direction: KpiTrend["direction"] = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    // `higherIsBetter: null` — a metric with no real good/bad direction
    // (e.g. total open tasks: more can mean more work in flight, not
    // necessarily a backlog problem) stays "neutral" regardless of which
    // way it moved, rather than asserting a judgment this app's business
    // logic doesn't actually make anywhere else.
    const impact: KpiTrend["impact"] =
      direction === "flat" || spec.higherIsBetter === null
        ? "neutral"
        : (direction === "up") === spec.higherIsBetter
          ? "positive"
          : "negative";

    const daysAgo = Math.max(1, Math.round((new Date(today).getTime() - new Date(prev.capturedOn).getTime()) / 86_400_000));
    const label = daysAgo === 1 ? "vs yesterday" : daysAgo <= 9 ? `vs ${daysAgo}d ago` : "vs last month";

    const value = spec.isMoney ? formatInrCompact(Math.abs(delta)) : String(Math.abs(delta));
    result[spec.key] = { direction, value, label, impact };
  }
  return result;
}
