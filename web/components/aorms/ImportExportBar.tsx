"use client";

import { useActionState } from "react";
import { Button, FileUploader, Form, InlineNotification, Link, Stack } from "@carbon/react";
import { Download, Upload } from "@carbon/icons-react";

type ImportResult = { error: string } | { imported: number; skipped: { row: number; message: string }[] } | null;

/**
 * Shared bulk CSV import/export bar (2026-09-14, demo-audit brief's bulk
 * import/export requirement — nothing like this existed anywhere in the
 * app before this). One reusable shell for /clients, /contractors, and
 * /consultants (the Third Parties group): a template download, an export
 * of the current data, and a CSV upload wired to that module's own
 * `import*Csv` Server Action (lib/actions/{clients,contractors,
 * consultants}.ts) — each already validates rows with the exact same
 * rules as that module's own "create one" form, so a hand-edited
 * template round-trips cleanly.
 *
 * `exportHref`/`templateHref` are plain GET routes (app/api/<module>/
 * {export,import-template}/route.ts) — real anchors, not client-side
 * fetches, so the browser's own download handling (Content-Disposition)
 * does the work.
 */
export function ImportExportBar({
  title,
  exportHref,
  templateHref,
  importAction,
  notes,
}: {
  title: string;
  exportHref: string;
  templateHref: string;
  importAction: (prevState: ImportResult, formData: FormData) => Promise<ImportResult>;
  notes?: string;
}) {
  const [state, formAction, pending] = useActionState<ImportResult, FormData>(importAction, null);

  return (
    <div
      style={{
        border: "1px solid var(--cds-border-subtle)",
        padding: "1rem",
        marginBottom: "2rem",
      }}
    >
      <p className="cds--type-heading-compact-02" style={{ marginBottom: "0.75rem" }}>
        Bulk import / export
      </p>
      <div style={{ display: "flex", gap: "1.5rem" }}>
        <Link href={templateHref} renderIcon={Download}>
          Download template
        </Link>
        <Link href={exportHref} renderIcon={Download}>
          Export {title} (CSV)
        </Link>
      </div>

      <Form action={formAction} style={{ marginTop: "1rem" }}>
        <Stack gap={4}>
          {notes && (
            <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
              {notes}
            </p>
          )}
          <FileUploader
            id="import-file"
            name="file"
            labelTitle="Import CSV"
            labelDescription="Use the downloaded template's column headers."
            buttonLabel="Choose file"
            accept={[".csv"]}
            filenameStatus="edit"
          />
          {state && "error" in state && (
            <InlineNotification kind="error" title="Import failed" subtitle={state.error} hideCloseButton lowContrast />
          )}
          {state && "imported" in state && (
            <InlineNotification
              kind={state.skipped.length > 0 ? "warning" : "success"}
              title={`Imported ${state.imported} row${state.imported === 1 ? "" : "s"}.`}
              subtitle={
                state.skipped.length === 0
                  ? undefined
                  : `${state.skipped.length} row${state.skipped.length === 1 ? "" : "s"} skipped: ${state.skipped
                      .map((s) => (s.row > 0 ? `row ${s.row} — ${s.message}` : s.message))
                      .join("; ")}`
              }
              hideCloseButton
              lowContrast
            />
          )}
          <Button type="submit" renderIcon={Upload} disabled={pending} size="sm">
            {pending ? "Importing…" : "Import"}
          </Button>
        </Stack>
      </Form>
    </div>
  );
}
