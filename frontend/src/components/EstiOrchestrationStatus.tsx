import { Tile } from "@carbon/react";
import { CarbonScope } from "../carbon/CarbonScope.js";
import { useEstiActivity } from "../lib/esti-activity.js";

/**
 * Rail orchestration status — the rail's window into what ESTI is orchestrating
 * for the current tab. Calm at rest (renders nothing when idle). Wave 3 (Carbon):
 * stock `Tile` (glass dropped per §0); was kit `Surface layer="glass"` + MUI.
 */
export function EstiOrchestrationStatus() {
  const activity = useEstiActivity();
  if (activity.status === "idle") return null;

  // Brief completion — the supervisor sees ESTI finish before the rail goes calm.
  if (activity.status === "done") {
    return (
      <CarbonScope>
        <Tile role="status" aria-live="polite" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                flex: "0 0 auto",
                background: "var(--cds-support-success)",
              }}
            />
            <span className="cds--type-label-01">ESTI · finished</span>
          </div>
        </Tile>
      </CarbonScope>
    );
  }

  return (
    <CarbonScope>
      <Tile role="status" aria-live="polite" style={{ marginBottom: "1rem" }}>
        <span className="cds--type-label-01" style={{ display: "block" }}>
          ESTI · orchestrating
        </span>

        {/* Mission — the frame the operation is tracked toward. */}
        <p className="cds--type-body-compact-01" style={{ fontWeight: 600, margin: "0.25rem 0 0" }}>
          {activity.mission}
        </p>

        {/* Live operation — the step in flight. */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
          <span
            className="esti-qpulse"
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              flex: "0 0 auto",
              background: "var(--cds-interactive)",
            }}
          />
          <span className="cds--type-caption-01">
            {activity.operation} · on {activity.context}
          </span>
        </div>
      </Tile>
    </CarbonScope>
  );
}
