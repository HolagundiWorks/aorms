import { AnimatedNumber } from "../AnimatedNumber";
import { BigStat } from "../BigStat";

/**
 * Landing demo of Pulse's daily brief + "Next up" list (2026-10-06): the portal's rail numerals and the
 * written brief, with dummy tasks; the counts in the brief tick up when the board is first shown. Sample data.
 */
const NEXT_UP = [
  { title: "Fire NOC coordination", project: "Silver Oak Commercial Complex", due: "5d overdue" },
  { title: "Fire safety compliance check", project: "Greenfield Boutique Hotel", due: "4d overdue" },
  { title: "Client walkthrough — Phase 1", project: "Aurelia Residences Phase 1", due: "2d overdue" },
  { title: "GFC drawings — tower A", project: "Silver Oak Commercial Complex", due: "due today" },
] as const;

export function LiveBrief() {
  return (
    <div aria-hidden style={{ border: "1px solid var(--cds-border-subtle)", background: "var(--cds-layer)", padding: "1.25rem" }}>
      <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
        Pulse · today&apos;s brief
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "1rem", margin: "0.75rem 0 1rem" }}>
        <BigStat value={14} label="Overdue" animate="plain" active />
        <BigStat value={2} label="Due today" animate="plain" />
        <BigStat value={3} label="Blocked" animate="plain" />
      </div>
      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
        <AnimatedNumber value={14} /> tasks overdue, <AnimatedNumber value={2} /> due today, <AnimatedNumber value={2} /> decisions waiting on the client and{" "}
        <AnimatedNumber value={1} /> open snag. Top priority: Fire NOC coordination on Silver Oak.
      </p>
      <p className="aorms-lp-sub" style={{ marginBlockStart: "1.25rem" }}>
        Next up
      </p>
      <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {NEXT_UP.map((t, i) => (
          <li key={t.title} style={{ display: "flex", gap: "0.75rem", alignItems: "baseline", padding: "0.5rem 0", borderBlockStart: "1px solid var(--aorms-rule)" }}>
            <span className="aorms-project-card__ref">#{i + 1}</span>
            <span style={{ flex: 1 }}>
              <strong style={{ fontWeight: 600 }}>{t.title}</strong>
              <br />
              <small style={{ color: "var(--cds-text-secondary)" }}>{t.project}</small>
            </span>
            <small style={{ color: t.due.includes("overdue") ? "var(--aorms-orange-text)" : "var(--cds-text-secondary)" }}>{t.due}</small>
          </li>
        ))}
      </ol>
    </div>
  );
}
