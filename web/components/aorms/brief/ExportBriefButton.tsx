"use client";

import { Button } from "@carbon/react";
import { Download } from "@carbon/icons-react";

export function ExportBriefButton({ projectId }: { projectId: string }) {
  return (
    <Button
      kind="tertiary"
      size="sm"
      renderIcon={Download}
      href={`/api/project-briefs/${projectId}/export`}
    >
      Export brief
    </Button>
  );
}
