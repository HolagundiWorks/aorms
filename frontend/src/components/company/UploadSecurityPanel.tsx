import { Button, InlineNotification, PasswordInput, Stack, Toggle } from "@carbon/react";
import { UPLOAD_PASSWORD_MIN_LENGTH } from "@esti/contracts";
import { useEffect, useState } from "react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { trpc } from "../../lib/trpc.js";

/** Upload password protection settings (owner). Wave 3 (Carbon). */
export function UploadSecurityPanel() {
  const utils = trpc.useUtils();
  const settingsQ = trpc.settings.get.useQuery();
  const [required, setRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQ.data) setRequired(settingsQ.data.uploadPasswordRequired);
  }, [settingsQ.data]);

  const save = trpc.settings.setUploadSecurity.useMutation({
    meta: { errorTitle: "Couldn't save the upload security settings" },
    onSuccess: () => {
      utils.settings.get.invalidate();
      setPassword("");
      setMsg("Upload security settings saved");
      setErr(null);
    },
    onError: (e) => setErr(e.message),
  });

  const configured = settingsQ.data?.uploadPasswordConfigured ?? false;

  return (
    <CarbonScope>
      <div style={{ padding: "1rem", maxWidth: 760 }}>
        <Stack gap={5}>
          <h2 className="cds--type-heading-05" style={{ margin: 0 }}>
            Upload protection
          </h2>
          <p className="cds--type-body-01" style={{ margin: 0 }}>
            When enabled, every staff member must enter a shared upload password before
            drawings, photos, bank statements, tender documents, or the firm logo can be stored.
            Login credentials are not accepted — set a dedicated upload password below.
          </p>
          {msg && (
            <InlineNotification
              kind="success"
              lowContrast
              title="Saved"
              subtitle={msg}
              onCloseButtonClick={() => setMsg(null)}
            />
          )}
          {err && (
            <InlineNotification
              kind="error"
              lowContrast
              title="Error"
              subtitle={err}
              onCloseButtonClick={() => setErr(null)}
            />
          )}
          <Toggle
            id="upload-password-required"
            labelText="Require upload password"
            toggled={required}
            onToggle={(checked) => setRequired(checked)}
          />
          {required && (
            <PasswordInput
              id="upload-password-set"
              labelText={configured ? "New upload password (optional)" : "Upload password"}
              helperText={
                configured
                  ? "Leave blank to keep the current password."
                  : `Minimum ${UPLOAD_PASSWORD_MIN_LENGTH} characters.`
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          )}
          <div>
            <Button
              disabled={
                save.isPending ||
                (required && !configured && password.length < UPLOAD_PASSWORD_MIN_LENGTH)
              }
              onClick={() =>
                save.mutate({
                  uploadPasswordRequired: required,
                  uploadPassword: password.trim() || undefined,
                })
              }
            >
              {save.isPending ? "Saving…" : "Save upload protection"}
            </Button>
          </div>
        </Stack>
      </div>
    </CarbonScope>
  );
}
