import { Button, InlineNotification, Stack } from "@carbon/react";
import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { trpc } from "../../lib/trpc.js";

/** Import or export a studio bundle between workspaces (owner). Wave 3 (Carbon). */
export function MigrationPanel() {
  const utils = trpc.useUtils();
  const preflightQ = trpc.migration.preflight.useQuery();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const importMut = trpc.migration.import.useMutation({
    meta: { errorTitle: "Couldn't import the bundle" },
    onSuccess: (r) =>
      setMsg(r.diff.ok ? "Bundle imported and verified." : "Imported, but verification did not pass."),
    onError: (e) => setErr(e.message),
  });

  async function download() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const bundle = await utils.migration.export.fetch();
      const blob = new Blob([JSON.stringify(bundle)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "aorms-studio-bundle.json";
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Studio bundle downloaded.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not export the studio bundle.");
    }
    setBusy(false);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErr(null);
    setMsg(null);
    try {
      const bundle = JSON.parse(await f.text());
      importMut.mutate(bundle);
    } catch {
      setErr("That file is not a valid studio bundle.");
    }
  }

  const pf = preflightQ.data;
  return (
    <CarbonScope>
      <div style={{ padding: "1rem" }}>
        <Stack gap={5}>
          <h3 className="cds--type-heading-03" style={{ margin: 0 }}>
            Studio migration
          </h3>
          <p className="cds--type-body-01" style={{ margin: 0, color: "var(--cds-text-secondary)" }}>
            Export this workspace as a JSON bundle, or import a bundle into a fresh empty
            workspace. Import refuses a non-empty target and rolls back if verification fails.
          </p>
          {pf && (
            <p className="cds--type-caption-01" style={{ margin: 0, color: "var(--cds-text-secondary)" }}>
              {pf.counts.projects} projects · {pf.counts.clients} clients · {pf.counts.invoices} invoices ·{" "}
              {(pf.fileBytes / 1048576).toFixed(1)} MB files · schema {pf.schemaHead}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Button kind="secondary" onClick={download} disabled={busy}>
              {busy ? "Preparing…" : "Export bundle"}
            </Button>
            <Button disabled={importMut.isPending} onClick={() => fileRef.current?.click()}>
              {importMut.isPending ? "Importing…" : "Import bundle"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={onFile}
              style={{ display: "none" }}
            />
          </div>
          {msg && (
            <InlineNotification
              kind="success"
              lowContrast
              title="Done"
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
        </Stack>
      </div>
    </CarbonScope>
  );
}
