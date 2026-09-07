"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { removeProduct } from "../../../../lib/actions/materials";

export function RemoveProductButton({ productId, companyId, name }: { productId: string; companyId: string; name: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Button
        kind="danger--ghost"
        size="sm"
        hasIconOnly
        iconDescription={`Remove ${name}`}
        renderIcon={TrashCan}
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(`Remove ${name} from the catalogue? This also removes its specs and test results.`)) return;
          setError(null);
          startTransition(async () => {
            const res = await removeProduct(productId, companyId);
            if (res.error) setError(res.error);
          });
        }}
      />
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
