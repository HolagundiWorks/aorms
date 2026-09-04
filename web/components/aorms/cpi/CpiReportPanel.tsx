"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification, Stack, Tag, TextArea } from "@carbon/react";
import { CPI_REPORT_FIELDS, EMPTY_REPORT, type CpiReportShape } from "../../../lib/cpi-sections";
import { saveCpiReport } from "../../../lib/actions/cpi";

/**
 * The CPI deliverable — Section 21. ESTI's auto-draft (generateReport)
 * isn't ported (open AI-gateway question, Phase 7's audit), so this is a
 * manual editor: the architect types the synthesis directly and saves it.
 */
export function CpiReportPanel({
  projectId,
  savedReport,
}: {
  projectId: string;
  savedReport: CpiReportShape | null;
}) {
  const [draft, setDraft] = useState<CpiReportShape>(savedReport ?? EMPTY_REPORT);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty = JSON.stringify(draft) !== JSON.stringify(savedReport ?? EMPTY_REPORT);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await saveCpiReport(projectId, draft);
      if (res.error) setError(res.error);
    });
  }

  return (
    <Stack gap={5}>
      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
        Not a completed questionnaire but a synthesized design brief — the foundation the design
        proceeds from.
      </p>
      {CPI_REPORT_FIELDS.map(({ key, label }) => (
        <TextArea
          key={key}
          id={`cpi-report-${key}`}
          labelText={label}
          rows={key === "summary" ? 4 : 2}
          value={draft[key]}
          onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
        />
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Button size="sm" disabled={!dirty || isPending} onClick={handleSave}>
          {isPending ? "Saving…" : "Save report"}
        </Button>
        {savedReport && !dirty && (
          <Tag type="green" size="sm">
            Saved
          </Tag>
        )}
      </div>
      {error && <InlineNotification kind="error" title="Could not save" subtitle={error} hideCloseButton lowContrast />}
    </Stack>
  );
}
