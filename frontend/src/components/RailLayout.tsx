import type { ReactNode } from "react";
import { CarbonScope } from "../carbon/CarbonScope.js";
import { EstiOrchestrationStatus } from "./EstiOrchestrationStatus.js";

/**
 * Standard app screen shell — Carbon layout (Wave 3).
 *
 * Per the migration decision (docs/esti/CARBON-MIGRATION.md §8), the HCW
 * Rail·Stage·glass geometry is dropped in favour of Carbon design principles: a
 * flat bordered **side-nav column** (heading · section nav · filters · actions)
 * beside a scrolling content area — all styled with Carbon tokens, no glass.
 * Slots are unchanged so existing callers keep working while they migrate their
 * own `tabs`/`aside` widgets to Carbon (prefer Carbon `Tabs` in the content, or
 * side-nav links here).
 */
export function RailLayout({
  title,
  description,
  actions,
  tabs,
  aside,
  children,
}: {
  title: string;
  description?: string;
  /** Action buttons — pinned to the bottom of the side column. */
  actions?: ReactNode;
  /** Section nav for the side column (prefer Carbon side-nav links). */
  tabs?: ReactNode;
  /** Telemetry / filters / summary below the nav. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <CarbonScope>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "1.5rem",
          flex: 1,
          minHeight: 0,
          alignItems: "stretch",
          width: "100%",
        }}
      >
        {/* Side-nav column */}
        <aside
          style={{
            flex: "0 0 240px",
            maxWidth: 240,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            borderRight: "1px solid var(--cds-border-subtle)",
            paddingRight: "1rem",
            overflowY: "auto",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p className="cds--type-label-01" style={{ margin: 0, color: "var(--cds-text-secondary)" }}>
              Workspace
            </p>
            <h1 className="cds--type-heading-04" style={{ margin: "0.25rem 0 0", wordBreak: "break-word" }}>
              {title}
            </h1>
            {description && (
              <p
                className="cds--type-body-01"
                style={{ margin: "0.5rem 0 0", color: "var(--cds-text-secondary)", wordBreak: "break-word" }}
              >
                {description}
              </p>
            )}
          </div>

          {/* Orchestration status — visible only while ESTI is working. */}
          <EstiOrchestrationStatus />

          {tabs}
          {aside && (
            <div style={{ minWidth: 0, width: "100%", flex: "1 1 auto", overflowY: "auto" }}>{aside}</div>
          )}

          {actions && (
            <div style={{ marginTop: "auto", paddingTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {actions}
            </div>
          )}
        </aside>

        {/* Content */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            overflowY: "auto",
          }}
        >
          {children}
        </main>
      </div>
    </CarbonScope>
  );
}
