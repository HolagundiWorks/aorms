"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { markPayslipPaid } from "../../lib/actions/payslips";

export function MarkPaidButton({ payslipId }: { payslipId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await markPayslipPaid(payslipId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div>
      <Button size="sm" kind="tertiary" disabled={isPending} onClick={handleClick}>
        {isPending ? "Marking…" : "Mark paid"}
      </Button>
      {error && (
        <div style={{ marginTop: "0.25rem" }}>
          <InlineNotification kind="error" title="Could not update" subtitle={error} hideCloseButton lowContrast />
        </div>
      )}
    </div>
  );
}
