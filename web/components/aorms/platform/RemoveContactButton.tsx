"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { removeCompanyContact } from "../../../lib/actions/platform";

export function RemoveContactButton({
  contactId,
  companyId,
  name,
}: {
  contactId: string;
  companyId: string;
  name: string;
}) {
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
          if (!window.confirm(`Remove ${name} from contacts?`)) return;
          setError(null);
          startTransition(async () => {
            const res = await removeCompanyContact(contactId, companyId);
            if (res.error) setError(res.error);
          });
        }}
      />
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
