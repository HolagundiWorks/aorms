import CheckIcon from "@mui/icons-material/Check";
import { Alert, AlertTitle, Stack, Typography } from "@mui/material";
import { STANDARD_LICENCE_LABEL, type LicenseStatus } from "@esti/contracts";
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

/** Standard AORMS licence summary — one product, no upgrade funnel. */
export function UpgradeToPro() {
  const licenseQ = trpc.license.status.useQuery();
  const view = licenseQ.data;
  if (!view) return null;

  const status = view.status ?? "UNLICENSED";
  const active = status === "VALID" || status === "GRACE";

  return (
    <div style={{ padding: "1rem" }}>
      <Stack spacing={2}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {active && <CheckIcon fontSize="small" />}
          <Typography variant="h6" sx={{ flex: 1, m: 0 }}>
            {STANDARD_LICENCE_LABEL}
          </Typography>
          <StatusDot color={STATUS_TAG[status]} label={STATUS_LABEL[status]} />
        </div>
        <Typography variant="body2" sx={{ m: 0 }}>
          One standard AORMS licence — full workspace, unlimited users, 5 GB storage
          included. Only cloud storage above 5 GB is billed; AI is unmetered — local
          on desktop, hub Hosted AI on web.
        </Typography>
        {status === "GRACE" && view.graceDaysLeft != null && (
          <Alert severity="warning">
            <AlertTitle>Licence in grace period</AlertTitle>
            {`${view.graceDaysLeft} day(s) remaining — renew in Company → Licence.`}
          </Alert>
        )}
        {status === "EXPIRED" && (
          <Alert severity="error">
            <AlertTitle>Licence expired</AlertTitle>
            Activate a current key in Company → Licence to restore writes.
          </Alert>
        )}
      </Stack>
    </div>
  );
}
