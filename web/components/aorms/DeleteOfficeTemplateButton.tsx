"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, InlineNotification } from "@carbon/react";
import { deleteOfficeTemplate } from "../../lib/actions/office-templates";

export function DeleteOfficeTemplateButton({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div>
      <Button
        size="sm"
        kind="danger--tertiary"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await deleteOfficeTemplate(id);
            if (res.error) setError(res.error);
            else router.push("/office-templates");
          });
        }}
      >
        {isPending ? "Deleting…" : "Delete template"}
      </Button>
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
