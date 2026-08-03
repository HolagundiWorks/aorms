import { Button, Column, Grid, InlineNotification, Stack, TextInput } from "@carbon/react";
import { STANDARD_LICENCE_LABEL, type LicenseStatus } from "@esti/contracts";
import { useState } from "react";
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

const cap = (n: number | null) => (n === null ? "Unlimited" : String(n));
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");

/** Firm licence — activation + status. The plan is licence-derived (owner only). Wave 3 (Carbon). */
export function LicensePanel() {
  const utils = trpc.useUtils();
  const q = trpc.license.status.useQuery();
  const [key, setKey] = useState("");

  const activate = trpc.license.activate.useMutation({
    meta: { errorTitle: "Couldn't activate the license" },
    onSuccess: () => {
      setKey("");
      void utils.license.status.invalidate();
      void utils.settings.get.invalidate();
    },
  });
  const refresh = trpc.license.refresh.useMutation({
    meta: { errorTitle: "Couldn't refresh the license" },
    onSuccess: () => void utils.license.status.invalidate(),
  });

  const view = q.data;
  const status = view?.status ?? "UNLICENSED";

  const seatTiles = view
    ? [
        { label: "Staff seats", value: cap(view.seats.staff) },
        { label: "Accountant seats", value: cap(view.seats.accountants) },
        { label: "HR seats", value: cap(view.seats.hrManagers) },
        { label: "Valid until", value: fmtDate(view.expiresAt) },
      ]
    : [];

  return (
    <CarbonScope>
      <div style={{ padding: "1rem", maxWidth: 760 }}>
        <Stack gap={5}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <h3 className="esti-label" style={{ margin: 0 }}>
              Licence
            </h3>
            {view && <StatusDot color="blue" label={STANDARD_LICENCE_LABEL} />}
            <StatusDot color={STATUS_TAG[status]} label={STATUS_LABEL[status]} />
          </div>

          {view && view.status !== "UNLICENSED" && (
            <Grid>
              {seatTiles.map((k) => (
                <Column key={k.label} sm={2} md={2} lg={4}>
                  <p className="esti-label esti-label--secondary" style={{ margin: 0 }}>
                    {k.label}
                  </p>
                  <p className="cds--type-body-01" style={{ margin: "0.25rem 0 0" }}>
                    {k.value}
                  </p>
                </Column>
              ))}
            </Grid>
          )}

          {status === "GRACE" && view?.graceDaysLeft != null && (
            <InlineNotification
              kind="warning"
              lowContrast
              hideCloseButton
              title="Licence expired — grace period"
              subtitle={`Reconnect to renew. ${view.graceDaysLeft} day(s) of grace remaining before writes are blocked.`}
            />
          )}
          {status === "EXPIRED" && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Licence expired"
              subtitle="Writes are blocked until the licence is renewed. Activate a current key below."
            />
          )}
          {status === "SUSPENDED" && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Licence suspended"
              subtitle="Billing hold — writes are blocked until the operator reinstates the licence. Refresh after payment clears, or contact support."
            />
          )}

          <Stack gap={3}>
            <TextInput
              id="lic-key"
              labelText="Activation key"
              placeholder="ESTI-XXXX-XXXX-XXXX-XXXX"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Button onClick={() => activate.mutate({ key })} disabled={!key.trim() || activate.isPending}>
                {activate.isPending ? "Activating…" : "Activate"}
              </Button>
              <Button
                kind="ghost"
                onClick={() => refresh.mutate()}
                disabled={refresh.isPending || status === "UNLICENSED"}
              >
                {refresh.isPending ? "Refreshing…" : "Refresh now"}
              </Button>
            </div>
            {activate.error && (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Could not activate"
                subtitle={activate.error.message}
              />
            )}
          </Stack>

          <p className="esti-label esti-label--helper" style={{ margin: 0 }}>
            Standard AORMS licence — billing and storage add-ons are handled by Human Centric Works.
            Keys are issued when you subscribe or renew.
          </p>
        </Stack>
      </div>
    </CarbonScope>
  );
}
