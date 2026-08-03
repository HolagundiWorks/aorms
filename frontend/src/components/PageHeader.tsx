import type { ReactNode } from "react";
import { CarbonScope } from "../carbon/CarbonScope.js";

/**
 * Standard staff-route page title block — title, optional lead, optional actions.
 *
 * Wave 3 (Carbon): stock type classes on semantic tags + flex layout; the accent
 * bar uses the Carbon interactive border token. Was MUI `Box`/`Typography`.
 * API unchanged so all call sites keep working.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <CarbonScope>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            borderLeft: "3px solid var(--cds-border-interactive)",
            paddingLeft: "0.75rem",
          }}
        >
          <h1 className="cds--type-heading-04" style={{ margin: 0 }}>
            {title}
          </h1>
          {description && (
            <p className="cds--type-body-01" style={{ margin: "0.25rem 0 0" }}>
              {description}
            </p>
          )}
        </div>
        {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
      </div>
    </CarbonScope>
  );
}
