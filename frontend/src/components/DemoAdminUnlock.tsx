import { Button, InlineNotification, Modal, PasswordInput, Stack } from "@carbon/react";
import { useState } from "react";
import { CarbonScope } from "../carbon/CarbonScope.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

/** Demo-only — unlock admin mutations with DEMO_MASTER_PASSWORD. Wave 3 (Carbon). */
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
    <CarbonScope as="span">
      <Button kind="ghost" size="sm" onClick={() => setOpen(true)}>
        Demo admin
      </Button>
      <Modal
        open={open}
        size="sm"
        modalHeading="Demo master password"
        primaryButtonText={unlock.isPending ? "Unlocking…" : "Unlock"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!password || unlock.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => unlock.mutate({ password })}
      >
        <Stack gap={5}>
          <p className="cds--type-body-01" style={{ margin: 0 }}>
            Enter the demo master password to change users, credentials, and other admin
            settings on this demo workspace for this session.
          </p>
          <PasswordInput
            id="demo-admin-unlock-password"
            labelText="Master password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {unlock.error && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Couldn't unlock"
              subtitle={unlock.error.message}
            />
          )}
        </Stack>
      </Modal>
    </CarbonScope>
  );
}
