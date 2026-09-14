import { WarningAltFilled } from "@carbon/icons-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { AnimatedProgressBar } from "./AnimatedProgressBar";

/**
 * Visual for the Task Prioritization feature section (2026-09-14) — a
 * "today's list" sample, already ranked by an automatic priority score,
 * highest first. Static illustrative data, same placeholder project as
 * the other feature panels on this page ("Sharma Residence Extension")
 * plus one other project name to show the cross-project ranking claim —
 * not a real firm's task list. Score bars and figures animate in on
 * scroll via AnimatedProgressBar/AnimatedNumber, same pattern as
 * BillingForecastPanel.
 */
const TASKS = [
  { name: "Site instruction: waterproofing detail", project: "Sharma Residence Extension", score: 92, flag: "Site issue raised" },
  { name: "Structural coordination — RCC drawings", project: "Rao Weekend Home", score: 78, flag: null },
  { name: "Client presentation deck — Phase 2", project: "Sharma Residence Extension", score: 61, flag: null },
  { name: "Material spec sheet — flooring", project: "Rao Weekend Home", score: 34, flag: null },
] as const;

function scoreColor(score: number) {
  if (score >= 80) return "var(--cds-support-error)";
  if (score >= 55) return "var(--cds-support-warning)";
  return "var(--cds-support-info)";
}

export function TaskPriorityPanel() {
  return (
    <div style={{ border: "1px solid var(--cds-border-subtle)", background: "var(--cds-layer)" }} aria-hidden>
      <div style={{ padding: "1.25rem 1.25rem 0.75rem", borderBottom: "1px solid var(--cds-border-subtle)" }}>
        <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
          Today — ranked automatically
        </p>
        <p className="cds--type-productive-heading-02" style={{ marginTop: "0.25rem" }}>
          4 tasks, highest priority first
        </p>
      </div>

      <div style={{ padding: "1.25rem" }}>
        {TASKS.map((task, i) => (
          <div key={task.name} style={{ marginBottom: i === TASKS.length - 1 ? 0 : "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
              <div style={{ minWidth: 0 }}>
                <p className="cds--type-body-01" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {task.name}
                </p>
                <p className="cds--type-caption-01" style={{ marginTop: "0.125rem", color: "var(--cds-text-secondary)" }}>
                  {task.project}
                  {task.flag && (
                    <span style={{ color: "var(--cds-support-error)", marginLeft: "0.5rem" }}>
                      <WarningAltFilled size={12} style={{ verticalAlign: "-2px", marginRight: "0.25rem" }} />
                      {task.flag}
                    </span>
                  )}
                </p>
              </div>
              <p className="cds--type-productive-heading-02" style={{ color: scoreColor(task.score), flexShrink: 0 }}>
                <AnimatedNumber value={task.score} kind="plain" />
              </p>
            </div>
            <div style={{ marginTop: "0.375rem" }}>
              <AnimatedProgressBar pct={task.score} color={scoreColor(task.score)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
