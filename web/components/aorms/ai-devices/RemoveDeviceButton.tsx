"use client";

import { useTransition } from "react";
import { Button } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { deleteAiDevice } from "../../../lib/actions/ai-devices";

export function RemoveDeviceButton({ deviceId }: { deviceId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      kind="ghost"
      size="sm"
      renderIcon={TrashCan}
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Remove device "${deviceId}"? It won't be able to serve Esti requests again until re-registered.`)) return;
        startTransition(async () => {
          await deleteAiDevice(deviceId);
        });
      }}
    >
      Remove
    </Button>
  );
}
