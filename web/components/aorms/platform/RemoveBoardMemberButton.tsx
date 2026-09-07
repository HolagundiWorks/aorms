"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { removeStudioBoardMember } from "../../../lib/actions/platform";

export function RemoveBoardMemberButton({
  boardMemberId,
  studioId,
  name,
}: {
  boardMemberId: string;
  studioId: string;
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
            const res = await removeStudioBoardMember(boardMemberId, studioId);
            if (res.error) setError(res.error);
          });
        }}
      />
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
