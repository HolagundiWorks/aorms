"use client";

import { useTransition } from "react";
import { Button } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { deleteTakeoffItem } from "../../lib/actions/takeoff";

export function DeleteTakeoffItemButton({ itemId, projectId }: { itemId: string; projectId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      kind="ghost"
      size="sm"
      disabled={isPending}
      hasIconOnly
      iconDescription="Delete"
      renderIcon={TrashCan}
      onClick={() => startTransition(() => deleteTakeoffItem(itemId, projectId))}
    />
  );
}
