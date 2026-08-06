import { Checkmark } from "@carbon/icons-react";
import { InlineNotification, Stack } from "@carbon/react";
import { STANDARD_LICENCE_LABEL, type LicenseStatus } from "@esti/contracts";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { StatusDot } from "../../carbon/adapters/index.js";
import { trpc } from "../../lib/trpc.js";

const STATUS_TAG: Record<LicenseStatus, "green" | "teal" | "red" | "gray"> = {
  VALID: "green",
  GRACE: "teal",
  EXPIRED: "red",
  UNLICENSED: "gray",
  SUSPENDED: "red",
};

const STATUS_LABEL: Record<LicenseStatus, string> = {
  VALID: "Active",
  GRACE: "Grace period",
  EXPIRED: "Expired",
  UNLICENSED: "Not activated",
  SUSPENDED: "Suspended",
};

/** Standard AORMS licence summary — one product, no upgrade funnel. Wave 3 (Carbon). */
export function UpgradeToPro() {
  const licenseQ = trpc.license.status.useQuery();
  const view = licenseQ.data;
  if (!view) return null;

  const status = view.status ?? "UNLICENSED";
  const active = status === "VALID" || status === "GRACE";

  return (
    <CarbonScope>
      <div style={{ padding: "1rem" }}>
        <Stack gap={4}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {active && <Checkmark size={16} />}
            <h3 className="cds--type-heading-03" style={{ flex: 1, margin: 0 }}>
              {STANDARD_LICENCE_LABEL}
            </h3>
            <StatusDot color={STATUS_TAG[status]} label={STATUS_LABEL[status]} />
          </div>
          <p className="cds--type-body-01" style={{ margin: 0 }}>
            One standard AORMS licence — full workspace, unlimited users, 5 GB storage
            included. Only cloud storage above 5 GB is billed; AI is unmetered — local
            on desktop, hub Hosted AI on web.
          </p>
          {status === "GRACE" && view.graceDaysLeft != null && (
            <InlineNotification
              kind="warning"
              lowContrast
              hideCloseButton
              title="Licence in grace period"
              subtitle={`${view.graceDaysLeft} day(s) remaining — renew in Company → Licence.`}
            />
          )}
          {status === "EXPIRED" && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Licence expired"
              subtitle="Activate a current key in Company → Licence to restore writes."
            />
          )}
        </Stack>
      </div>
    </CarbonScope>
  );
}
