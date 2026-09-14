/**
 * Visual for the Billing Forecast feature section (2026-09-14) — a
 * sample phase's tasks with progress bars, and the two predicted figures
 * that progress rolls up into: billable-so-far and still-pending. Static
 * illustrative data, same placeholder project as HeroRecordChain
 * ("Sharma Residence Extension") — not a real firm's numbers.
 *
 * Progress bars and the two rupee figures animate in on scroll (2026-09-14,
 * explicit direction: "animate the data, animate the numbers, progress
 * bars") via AnimatedProgressBar/AnimatedNumber — this file itself stays
 * a plain Server Component, only those two leaf pieces are Client
 * Components.
 */
import { AnimatedNumber } from "./AnimatedNumber";
import { AnimatedProgressBar } from "./AnimatedProgressBar";

const TASKS = [
  { name: "Concept design", pct: 100 },
  { name: "Client presentation", pct: 100 },
  { name: "Working drawings", pct: 65 },
  { name: "Structural coordination", pct: 30 },
] as const;

const PHASE_FEE = 240000; // ₹2,40,000 phase fee, illustrative only
const overallPct = Math.round(TASKS.reduce((sum, t) => sum + t.pct, 0) / TASKS.length);
const billable = Math.round((PHASE_FEE * overallPct) / 100);
const pending = PHASE_FEE - billable;

export function BillingForecastPanel() {
  return (
    <div
      style={{
        border: "1px solid var(--cds-border-subtle)",
        background: "var(--cds-layer)",
      }}
      aria-hidden
    >
      <div style={{ padding: "1.25rem 1.25rem 0.75rem", borderBottom: "1px solid var(--cds-border-subtle)" }}>
        <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
          Design Development — Sharma Residence Extension
        </p>
        <p className="cds--type-productive-heading-02" style={{ marginTop: "0.25rem" }}>
          <AnimatedNumber value={overallPct} kind="percent" /> of phase complete
        </p>
      </div>

      <div style={{ padding: "1.25rem" }}>
        {TASKS.map((task) => (
          <div key={task.name} style={{ marginBottom: "0.875rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <span className="cds--type-body-01">{task.name}</span>
              <span className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
                {task.pct}%
              </span>
            </div>
            <AnimatedProgressBar pct={task.pct} color={task.pct === 100 ? "var(--cds-support-success)" : "var(--cds-support-info)"} />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", borderTop: "1px solid var(--cds-border-subtle)" }}>
        <div style={{ flex: 1, padding: "1rem 1.25rem", borderRight: "1px solid var(--cds-border-subtle)" }}>
          <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
            Billable so far
          </p>
          <p className="cds--type-productive-heading-03" style={{ marginTop: "0.25rem", color: "var(--cds-support-success)" }}>
            <AnimatedNumber value={billable} kind="inr" />
          </p>
        </div>
        <div style={{ flex: 1, padding: "1rem 1.25rem" }}>
          <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
            Still pending
          </p>
          <p className="cds--type-productive-heading-03" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
            <AnimatedNumber value={pending} kind="inr" />
          </p>
        </div>
      </div>
    </div>
  );
}
