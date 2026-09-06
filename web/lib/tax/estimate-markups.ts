/**
 * Estimate markup cascade — port of HolagundiWorks/AQC's
 * `BBSApp/Services/EstimateMarkups.cs` (`EstimateMarkupBreakdown.Compute()`),
 * the reference repo this session was asked to match. Applies four
 * cascading percentage add-ons on an estimate's base total: Electrical %,
 * Plumbing % (both flat on the base), Escalation % (on base+Electrical+
 * Plumbing), and Consulting Fee % (on base+E+P+Escalation) — a real DSR-
 * abstract convention this repo's `estimates` (contingency % + GST % only,
 * both flat) never had. Not a replacement for contingency/GST — this
 * cascade sits between the rate-book subtotal and the existing
 * contingency/GST rollup (see web/app/(app)/estimates/[id]/page.tsx).
 */

export type EstimateMarkups = {
  electricalPct: number;
  plumbingPct: number;
  escalationPct: number;
  consultingFeePct: number;
};

export type EstimateMarkupBreakdown = {
  baseTotalPaise: number;
  electricalPct: number;
  plumbingPct: number;
  escalationPct: number;
  consultingFeePct: number;
  electricalPaise: number;
  plumbingPaise: number;
  escalationPaise: number;
  consultingFeePaise: number;
  grandTotalPaise: number;
};

function round(paise: number): number {
  return Math.round(paise);
}

export function computeEstimateMarkups(baseTotalPaise: number, m: EstimateMarkups): EstimateMarkupBreakdown {
  const base = Math.max(0, baseTotalPaise);
  const electrical = round((base * Math.max(0, m.electricalPct)) / 100);
  const plumbing = round((base * Math.max(0, m.plumbingPct)) / 100);
  const afterEp = base + electrical + plumbing;
  const escalation = round((afterEp * Math.max(0, m.escalationPct)) / 100);
  const afterEsc = afterEp + escalation;
  const consultingFee = round((afterEsc * Math.max(0, m.consultingFeePct)) / 100);
  return {
    baseTotalPaise: round(base),
    electricalPct: m.electricalPct,
    plumbingPct: m.plumbingPct,
    escalationPct: m.escalationPct,
    consultingFeePct: m.consultingFeePct,
    electricalPaise: electrical,
    plumbingPaise: plumbing,
    escalationPaise: escalation,
    consultingFeePaise: consultingFee,
    grandTotalPaise: round(afterEsc + consultingFee),
  };
}
