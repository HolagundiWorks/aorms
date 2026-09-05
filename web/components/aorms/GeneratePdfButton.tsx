"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { Document } from "@carbon/icons-react";

/**
 * Generic "Generate PDF" row/detail action for Phase 6's enqueue boundary
 * (docs/esti/NEXTJS-MIGRATION-PHASE6-AUDIT.md) — the shared UI half of
 * `generatePdfForTarget()` (lib/jobs/generate-pdf.ts). Originally built
 * once for `/invoices` as the proof-of-pattern screen
 * (GenerateInvoicePdfButton.tsx, since replaced by this generic version)
 * and now reused across every other render target.
 *
 * `action` is the domain's own bound Server Action (e.g.
 * `generateProposalPdf.bind(null, proposalId)`) — this component has no
 * per-domain knowledge, just calls whatever's passed in and renders the
 * pending/error state.
 */
export function GeneratePdfButton({
  action,
  pdfStatus,
  label = "Generate PDF",
}: {
  action: () => Promise<{ error: string } | null>;
  pdfStatus: string | null;
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res?.error) setError(res.error);
    });
  }

  if (pdfStatus === "READY") {
    return <span className="cds--type-body-01">PDF ready</span>;
  }

  return (
    <div>
      <Button
        kind="ghost"
        size="sm"
        renderIcon={Document}
        disabled={isPending || pdfStatus === "PROCESSING"}
        onClick={handleClick}
      >
        {isPending ? "Queuing…" : pdfStatus === "PROCESSING" ? "Processing…" : label}
      </Button>
      {error && (
        <InlineNotification kind="error" title="Could not queue PDF" subtitle={error} hideCloseButton lowContrast />
      )}
    </div>
  );
}
