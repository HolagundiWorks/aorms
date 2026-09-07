"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { removeProductSpecification } from "../../../../lib/actions/materials";

export function RemoveProductSpecButton({ specId, companyId, label }: { specId: string; companyId: string; label: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Button
        kind="danger--ghost"
        size="sm"
        hasIconOnly
        iconDescription={`Remove ${label}`}
        renderIcon={TrashCan}
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(`Remove spec "${label}"?`)) return;
          setError(null);
          startTransition(async () => {
            const res = await removeProductSpecification(specId, companyId);
            if (res.error) setError(res.error);
          });
        }}
      />
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
