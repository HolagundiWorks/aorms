import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { can } from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import { isDesktopClient } from "../lib/runtimeCapabilities.js";
import { trpc } from "../lib/trpc.js";

/**
 * LF4 desktop first-run — bind an activation key to this install so hub
 * meta/artifact sync can start. Non-blocking dialog for firm admins when the
 * node is unlicensed or licensed without a sync bearer.
 *
 * Not used on web — App mounts this only when {@link isDesktopClient}.
 */
export function DesktopLicenceBind() {
  const { user } = useAuth();
  const desktop = isDesktopClient();
  const utils = trpc.useUtils();
  const admin = Boolean(user && can(user.role, "firm:admin") && desktop);
  const licQ = trpc.license.status.useQuery(undefined, {
    enabled: admin,
  });
  const hubQ = trpc.sync.hubConfigured.useQuery(undefined, {
    enabled: admin,
  });

  const [key, setKey] = useState("");
  const [dismissed, setDismissed] = useState(false);

  const activate = trpc.license.activate.useMutation({
    meta: { errorTitle: "Couldn't activate the licence" },
    onSuccess: async () => {
      setKey("");
      await Promise.all([
        utils.license.status.invalidate(),
        utils.sync.capabilities.invalidate(),
        utils.sync.hubConfigured.invalidate(),
        utils.sync.status.invalidate(),
        utils.settings.get.invalidate(),
      ]);
      setDismissed(true);
    },
  });

  if (!admin || dismissed) return null;

  const status = licQ.data?.status ?? "UNLICENSED";
  const needsLicence = status === "UNLICENSED" || status === "EXPIRED" || status === "SUSPENDED";
  const needsSync =
    (status === "VALID" || status === "GRACE") &&
    Boolean(hubQ.data?.hubUrl) &&
    hubQ.data?.hasSyncToken === false;

  if (!needsLicence && !needsSync) return null;
  if (licQ.isLoading || hubQ.isLoading) return null;

  return (
    <Dialog open aria-labelledby="desktop-licence-bind-title" maxWidth="sm" fullWidth>
      <DialogTitle id="desktop-licence-bind-title">
        {needsLicence ? "Activate this desktop install" : "Finish hub sync bind"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {needsLicence
              ? "AORMS Studio on this machine needs a firm activation key. Binding also issues a sync token so metadata and finalized artifacts can reach the AORMS hub."
              : "Your licence is active, but this install has no sync bearer yet. Re-activate with your key to mint a hub sync token (LF4)."}
          </Typography>
          {hubQ.data?.hubUrl ? (
            <Typography variant="caption" color="text.secondary" component="p">
              Hub: {hubQ.data.hubUrl}
            </Typography>
          ) : (
            <Alert severity="warning">
              No hub URL is configured (`ESTI_HUB_URL`). Activation may succeed locally, but sync stays offline until the hub is set.
            </Alert>
          )}
          <TextField
            label="Activation key"
            placeholder="ESTI-XXXX-XXXX-XXXX-XXXX"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            fullWidth
            autoFocus
            slotProps={{ htmlInput: { "aria-label": "Activation key" } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!needsLicence ? (
          <Button onClick={() => setDismissed(true)} color="inherit">
            Later
          </Button>
        ) : null}
        <Button
          variant="contained"
          disabled={key.trim().length < 8 || activate.isPending}
          onClick={() => activate.mutate({ key: key.trim() })}
        >
          {activate.isPending ? "Activating…" : "Activate"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
