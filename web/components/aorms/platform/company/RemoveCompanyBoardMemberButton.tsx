"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { removeCompanyBoardMember } from "../../../../lib/actions/company";

export function RemoveCompanyBoardMemberButton({
  boardMemberId,
  companyId,
  name,
}: {
  boardMemberId: string;
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
          if (!window.confirm(`Remove ${name} from the board?`)) return;
          setError(null);
          startTransition(async () => {
            const res = await removeCompanyBoardMember(boardMemberId, companyId);
            if (res.error) setError(res.error);
          });
        }}
      />
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
