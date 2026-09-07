"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { removeProductTestResult } from "../../../../lib/actions/materials";

export function RemoveProductTestResultButton({
  testResultId,
  companyId,
  testName,
}: {
  testResultId: string;
  companyId: string;
  testName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Button
        kind="danger--ghost"
        size="sm"
        hasIconOnly
        iconDescription={`Remove ${testName}`}
        renderIcon={TrashCan}
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(`Remove test result "${testName}"?`)) return;
          setError(null);
          startTransition(async () => {
            const res = await removeProductTestResult(testResultId, companyId);
            if (res.error) setError(res.error);
          });
        }}
      />
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
