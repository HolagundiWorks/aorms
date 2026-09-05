"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { Document } from "@carbon/icons-react";
import { generateInvoicePdf } from "../../lib/actions/invoices";

/**
 * The one representative "Generate PDF" wiring for Phase 6's enqueue
 * boundary (docs/esti/NEXTJS-MIGRATION-PHASE6-AUDIT.md) — proves the
 * intended call pattern (Server Action → gateway → Redis → worker) end to
 * end. The other 10 render targets need the same few lines on their own
 * screens; not built here, left as follow-up per the roadmap.
 */
export function GenerateInvoicePdfButton({
  invoiceId,
  pdfStatus,
}: {
  invoiceId: string;
  pdfStatus: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await generateInvoicePdf(invoiceId);
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
        {isPending ? "Queuing…" : pdfStatus === "PROCESSING" ? "Processing…" : "Generate PDF"}
      </Button>
      {error && (
        <InlineNotification kind="error" title="Could not queue PDF" subtitle={error} hideCloseButton lowContrast />
      )}
    </div>
  );
}
