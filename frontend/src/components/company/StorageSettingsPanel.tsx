import {
  Button,
  InlineNotification,
  PasswordInput,
  Select,
  SelectItem,
  Stack,
  TextInput,
} from "@carbon/react";
import {
  STORAGE_MODE_LABEL,
  StorageMode,
  type StorageSettingsInput,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { StatusDot } from "../../carbon/adapters/index.js";
import { trpc } from "../../lib/trpc.js";

type Form = {
  mode: string;
  nasPath: string;
  s3Endpoint: string;
  s3Region: string;
  s3Bucket: string;
  s3AccessKey: string;
  s3SecretKey: string; // blank = keep existing
};

const EMPTY: Form = {
  mode: "DEFAULT",
  nasPath: "",
  s3Endpoint: "",
  s3Region: "",
  s3Bucket: "",
  s3AccessKey: "",
  s3SecretKey: "",
};

const NOTE_TITLE = { success: "Done", error: "Error", info: "Note" } as const;

/** BYOS — point object storage at the firm's own NAS / S3 (Core+, owner only). Wave 3 (Carbon). */
export function StorageSettingsPanel() {
  const utils = trpc.useUtils();
  const q = trpc.settings.getStorage.useQuery();
  const [form, setForm] = useState<Form>(EMPTY);
  const [secretConfigured, setSecretConfigured] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    if (q.data) {
      setForm({
        mode: q.data.mode,
        nasPath: q.data.nasPath ?? "",
        s3Endpoint: q.data.s3Endpoint ?? "",
        s3Region: q.data.s3Region ?? "",
        s3Bucket: q.data.s3Bucket ?? "",
        s3AccessKey: q.data.s3AccessKey ?? "",
        s3SecretKey: "",
      });
      setSecretConfigured(q.data.s3SecretConfigured);
    }
  }, [q.data]);

  function payload(): StorageSettingsInput {
    return {
      mode: form.mode as (typeof StorageMode.options)[number],
      nasPath: form.nasPath || undefined,
      s3Endpoint: form.s3Endpoint || undefined,
      s3Region: form.s3Region || undefined,
      s3Bucket: form.s3Bucket || undefined,
      s3AccessKey: form.s3AccessKey || undefined,
      s3SecretKey: form.s3SecretKey || undefined,
    };
  }

  const test = trpc.settings.testStorage.useMutation({
    meta: { errorTitle: "Couldn't test the storage connection" },
    onSuccess: (r) =>
      setMsg(
        r.ok
          ? { kind: "success", text: "Connection succeeded — storage is reachable." }
          : { kind: "error", text: `Connection failed: ${r.error ?? "unreachable"}` },
      ),
    onError: (e) => setMsg({ kind: "error", text: e.message }),
  });
  const save = trpc.settings.setStorage.useMutation({
    meta: { errorTitle: "Couldn't save the storage settings" },
    onSuccess: () => {
      utils.settings.getStorage.invalidate();
      utils.settings.get.invalidate();
      setMsg({ kind: "success", text: "Storage settings saved." });
    },
    onError: (e) => setMsg({ kind: "error", text: e.message }),
  });

  const isS3 = form.mode === "S3";
  const isNas = form.mode === "NAS";

  return (
    <CarbonScope>
      <div style={{ padding: "1rem", maxWidth: 760 }}>
        <Stack gap={5}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h2 className="cds--type-heading-05" style={{ margin: 0 }}>
              Storage (BYOS)
            </h2>
            <StatusDot color="purple" label="Pro" />
          </div>
          <p className="cds--type-body-01" style={{ margin: 0 }}>
            By default your files live on ESTI-managed storage. Pro firms can point object storage
            at their own <strong>NAS / mounted folder</strong> or an{" "}
            <strong>S3-compatible hosting engine</strong>. Drawings, documents and generated PDFs
            all follow this setting.
          </p>
          {msg && (
            <InlineNotification
              kind={msg.kind}
              lowContrast
              title={NOTE_TITLE[msg.kind]}
              subtitle={msg.text}
              onCloseButtonClick={() => setMsg(null)}
            />
          )}

          <Select
            id="st-mode"
            labelText="Storage target"
            value={form.mode}
            onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
          >
            {StorageMode.options.map((m) => (
              <SelectItem key={m} value={m} text={STORAGE_MODE_LABEL[m]} />
            ))}
          </Select>

          {isNas && (
            <TextInput
              id="st-nas"
              labelText="Folder path"
              helperText="An absolute path mounted on the server (and the worker host), e.g. /mnt/nas/esti"
              value={form.nasPath}
              onChange={(e) => setForm((f) => ({ ...f, nasPath: e.target.value }))}
            />
          )}

          {isS3 && (
            <>
              <TextInput
                id="st-endpoint"
                labelText="Endpoint URL"
                helperText="e.g. https://s3.eu-central.example.com or http://nas.local:9000"
                value={form.s3Endpoint}
                onChange={(e) => setForm((f) => ({ ...f, s3Endpoint: e.target.value }))}
              />
              <TextInput
                id="st-bucket"
                labelText="Bucket"
                value={form.s3Bucket}
                onChange={(e) => setForm((f) => ({ ...f, s3Bucket: e.target.value }))}
              />
              <TextInput
                id="st-region"
                labelText="Region (optional)"
                placeholder="us-east-1"
                value={form.s3Region}
                onChange={(e) => setForm((f) => ({ ...f, s3Region: e.target.value }))}
              />
              <TextInput
                id="st-access"
                labelText="Access key"
                value={form.s3AccessKey}
                onChange={(e) => setForm((f) => ({ ...f, s3AccessKey: e.target.value }))}
              />
              <PasswordInput
                id="st-secret"
                labelText="Secret key"
                helperText={
                  secretConfigured
                    ? "A secret is stored — leave blank to keep it."
                    : "Stored encrypted at rest; never shown again."
                }
                value={form.s3SecretKey}
                onChange={(e) => setForm((f) => ({ ...f, s3SecretKey: e.target.value }))}
                autoComplete="new-password"
              />
            </>
          )}

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {form.mode !== "DEFAULT" && (
              <Button kind="secondary" disabled={test.isPending} onClick={() => test.mutate(payload())}>
                {test.isPending ? "Testing…" : "Test connection"}
              </Button>
            )}
            <Button disabled={save.isPending} onClick={() => save.mutate(payload())}>
              {save.isPending ? "Saving…" : "Save storage settings"}
            </Button>
          </div>
        </Stack>
      </div>
    </CarbonScope>
  );
}
