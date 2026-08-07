import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { StatusDot, Surface, RADIUS } from "@hcw/ui-kit";
import { STANDARD_LICENCE_LABEL, type LicenseStatus } from "@esti/contracts";
import { useState } from "react";
import { COMPOSITION_RHYTHM } from "../../lib/composition.js";
import { trpc } from "../../lib/trpc.js";

const STATUS_TAG: Record<LicenseStatus, string> = {
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

/** Firm licence — activation + status. The plan is licence-derived (owner only). */
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
      void utils.sync.capabilities.invalidate();
      void utils.sync.hubConfigured.invalidate();
      void utils.sync.status.invalidate();
    },
  });
  const refresh = trpc.license.refresh.useMutation({
    meta: { errorTitle: "Couldn't refresh the license" },
    onSuccess: () => {
      void utils.license.status.invalidate();
      void utils.sync.capabilities.invalidate();
      void utils.sync.hubConfigured.invalidate();
    },
  });

  const view = q.data;
  const status = view?.status ?? "UNLICENSED";

  // Odd peer strip (3 seats + validity called out separately below when needed).
  const seatTiles = view
    ? [
        { label: "Staff seats", value: cap(view.seats.staff) },
        { label: "Accountant seats", value: cap(view.seats.accountants) },
        { label: "HR seats", value: cap(view.seats.hrManagers) },
      ]
    : [];

  return (
    <Box sx={{ p: COMPOSITION_RHYTHM.md, maxWidth: 760 }}>
      <Stack spacing={COMPOSITION_RHYTHM.md}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="subtitle1" className="esti-label" sx={{ m: 0 }}>
            Licence
          </Typography>
          {view && <StatusDot color="blue" label={STANDARD_LICENCE_LABEL} />}
          <StatusDot color={STATUS_TAG[status]} label={STATUS_LABEL[status]} />
        </Box>

        {view && view.status !== "UNLICENSED" && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: COMPOSITION_RHYTHM.sm,
            }}
          >
            {seatTiles.map((k) => (
              <Surface
                key={k.label}
                layer="soft"
                sx={{ borderRadius: `${RADIUS}px`, p: COMPOSITION_RHYTHM.sm }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  {k.label}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {k.value}
                </Typography>
              </Surface>
            ))}
          </Box>
        )}

        {view && view.status !== "UNLICENSED" && (
          <Typography variant="body2" color="text.secondary">
            Valid until {fmtDate(view.expiresAt)}
          </Typography>
        )}

        {status === "GRACE" && view?.graceDaysLeft != null && (
          <Alert severity="warning">
            Licence expired — grace period. Reconnect to renew. {view.graceDaysLeft} day(s) of
            grace remaining before writes are blocked.
          </Alert>
        )}
        {status === "EXPIRED" && (
          <Alert severity="error">
            Licence expired. Writes are blocked until the licence is renewed. Activate a current
            key below.
          </Alert>
        )}
        {status === "SUSPENDED" && (
          <Alert severity="error">
            Licence suspended. Billing hold — writes are blocked until the operator reinstates the
            licence. Refresh after payment clears, or contact support.
          </Alert>
        )}

        <Stack spacing={COMPOSITION_RHYTHM.xs}>
          <TextField
            id="lic-key"
            label="Activation key"
            placeholder="ESTI-XXXX-XXXX-XXXX-XXXX"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            size="small"
            fullWidth
          />
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              onClick={() => activate.mutate({ key })}
              disabled={!key.trim() || activate.isPending}
            >
              {activate.isPending ? "Activating…" : "Activate"}
            </Button>
            <Button
              variant="text"
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending || status === "UNLICENSED"}
            >
              {refresh.isPending ? "Refreshing…" : "Refresh now"}
            </Button>
          </Box>
          {activate.error && (
            <Alert severity="error">Could not activate — {activate.error.message}</Alert>
          )}
        </Stack>

        <Typography variant="caption" color="text.secondary" className="esti-label esti-label--helper">
          Standard AORMS licence — billing and storage add-ons are handled by Human Centric Works.
          Keys are issued when you subscribe or renew.
        </Typography>
      </Stack>
    </Box>
  );
}
