"use client";

import { useState, useTransition } from "react";
import { InlineNotification, Select, SelectItem } from "@carbon/react";
import { updateProjectStatus } from "../../lib/actions/activation";
import type { ProjectStatus } from "../../lib/project-os";

const STATUSES: ProjectStatus[] = ["ENQUIRY", "PROPOSAL", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];

export function ProjectStatusSelect({ projectId, status }: { projectId: string; status: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Select
        id={`project-status-${projectId}`}
        labelText=""
        hideLabel
        size="sm"
        value={status}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value as ProjectStatus;
          setError(null);
          startTransition(async () => {
            const res = await updateProjectStatus(projectId, next);
            if (res.error) setError(res.error);
          });
        }}
      >
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s} text={s} />
        ))}
      </Select>
      {error && (
        <div style={{ marginTop: "0.25rem" }}>
          <InlineNotification kind="error" title="Could not change status" subtitle={error} hideCloseButton lowContrast />
        </div>
      )}
    </div>
  );
}
