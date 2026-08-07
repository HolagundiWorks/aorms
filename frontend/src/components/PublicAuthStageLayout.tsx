import { type ReactNode } from "react";
import { MarketingShell } from "./landing/MarketingShell.js";

/**
 * @deprecated Auth uses AuthRailLayout centered card everywhere (Wave 1 UI consistency).
 * Kept for stray imports — prefer AuthRailLayout with form in `rail`.
 */
export function PublicAuthStageLayout({ children }: { children: ReactNode }) {
  return (
    <MarketingShell contours showConversionDock={false} showFooter={false} vertical="platform">
      <div className="lp2-ds esti-auth-stage-page">
        <div className="esti-form-panel esti-auth-stage-form">{children}</div>
      </div>
    </MarketingShell>
  );
}
