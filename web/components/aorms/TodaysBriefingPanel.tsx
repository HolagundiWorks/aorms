import { Calendar, Money, Renew, WarningAltFilled } from "@carbon/icons-react";
import { AnimatedNumber } from "./AnimatedNumber";

/**
 * Visual for the Today's Briefing feature section (2026-09-14) — a
 * sample Pulse brief, shaped like the real deterministic output
 * (`lib/ai/phraser.ts`'s `buildDailyBriefText`): one line per real data
 * source (absences, ready-to-bill, open requests, top priority), not
 * free-form paragraph text. Illustrative figures only, same placeholder
 * project as the other feature panels — not a real studio's numbers.
 */
const LINES = [
  { icon: Calendar, text: "Ar. Akash is on leave today." },
  { icon: Money, text: "ready to bill across 3 drafted invoices.", value: 156000, kind: "inr" as const },
  { icon: WarningAltFilled, text: "open requests need attention — 2 from clients, 1 open tender awaiting bids.", value: 3, kind: "plain" as const },
  { icon: Renew, text: "Top priority: Site instruction — waterproofing detail (Sharma Residence Extension)." },
];

export function TodaysBriefingPanel() {
  return (
    <div style={{ border: "1px solid var(--cds-border-subtle)", background: "var(--cds-layer)" }} aria-hidden>
      <div style={{ padding: "1.25rem 1.25rem 0.75rem", borderBottom: "1px solid var(--cds-border-subtle)" }}>
        <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
          Pulse — Today's Brief
        </p>
        <p className="cds--type-productive-heading-02" style={{ marginTop: "0.25rem" }}>
          Written the moment you open it
        </p>
      </div>

      <div style={{ padding: "1.25rem" }}>
        {LINES.map((line, i) => {
          const Icon = line.icon;
          return (
            <div
              key={line.text}
              style={{
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-start",
                paddingBottom: i === LINES.length - 1 ? 0 : "0.875rem",
                marginBottom: i === LINES.length - 1 ? 0 : "0.875rem",
                borderBottom: i === LINES.length - 1 ? "none" : "1px solid var(--cds-border-subtle)",
              }}
            >
              <Icon size={18} style={{ color: "var(--cds-icon-secondary)", flexShrink: 0, marginTop: "0.125rem" }} />
              <p className="cds--type-body-01">
                {"value" in line && line.value !== undefined && (
                  <>
                    <AnimatedNumber
                      value={line.value}
                      kind={line.kind}
                      style={{ color: "var(--cds-support-info)", fontWeight: 600 }}
                    />{" "}
                  </>
                )}
                {line.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
