import {
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

/** Demo-only — unlock admin mutations with DEMO_MASTER_PASSWORD. */
export function DemoAdminUnlock() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const unlock = trpc.auth.unlockDemoAdmin.useMutation({
    meta: { errorTitle: "Couldn't unlock the admin actions" },
    onSuccess: () => {
      setOpen(false);
      setPassword("");
    },
  });

  if (!user?.isDemo) return null;

  return (
    <span>
      <Button size="small" variant="text" onClick={() => setOpen(true)}>
        Demo admin
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Demo master password</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <p style={{ margin: 0 }}>
              Enter the demo master password to change users, credentials, and other admin
              settings on this demo workspace for this session.
            </p>
            <TextField
              id="demo-admin-unlock-password"
              label="Master password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            {unlock.error && (
              <Alert severity="error">
                <AlertTitle>Couldn&apos;t unlock</AlertTitle>
                {unlock.error.message}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!password || unlock.isPending}
            onClick={() => unlock.mutate({ password })}
          >
            {unlock.isPending ? "Unlocking…" : "Unlock"}
          </Button>
        </DialogActions>
      </Dialog>
    </span>
  );
}
