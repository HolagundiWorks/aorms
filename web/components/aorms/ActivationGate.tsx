"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification, Tag } from "@carbon/react";
import { activateProject } from "../../lib/actions/activation";
import type { ActivationGateResult } from "../../lib/project-os";

export function ActivationGate({ projectId, gate }: { projectId: string; gate: ActivationGateResult }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleActivate() {
    setError(null);
    startTransition(async () => {
      const res = await activateProject(projectId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div>
      <ul style={{ margin: 0, marginBottom: "1rem", paddingLeft: "1.25rem" }}>
        {gate.checks.map((c) => (
          <li key={c.key} className="cds--type-body-01" style={{ marginBottom: "0.25rem" }}>
            <Tag type={c.ok ? "green" : "gray"} size="sm">
              {c.ok ? "✓" : "—"}
            </Tag>{" "}
            {c.label}
          </li>
        ))}
      </ul>
      <Button size="sm" disabled={!gate.ok || isPending} onClick={handleActivate}>
        {isPending ? "Activating…" : "Activate project"}
      </Button>
      {error && (
        <div style={{ marginTop: "0.5rem" }}>
          <InlineNotification kind="error" title="Could not activate" subtitle={error} hideCloseButton lowContrast />
        </div>
      )}
    </div>
  );
}
