import type { ReactNode } from "react";
import { Stack } from "@carbon/react";
import { CarbonScope } from "../../carbon/CarbonScope.js";

/** Standard header + body for an admin console section. Wave 3 (Carbon). */
export function AdminSection({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <CarbonScope>
      <Stack gap={5} style={{ height: "100%", minHeight: 0 }}>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 className="cds--type-heading-03" style={{ margin: 0 }}>
              {title}
            </h2>
            {description && (
              <p className="cds--type-body-01" style={{ margin: "0.25rem 0 0" }}>
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", flexShrink: 0 }}>
              {actions}
            </div>
          )}
        </div>
        <Stack gap={5} style={{ flex: 1, minHeight: 0 }}>
          {children}
        </Stack>
      </Stack>
    </CarbonScope>
  );
}
