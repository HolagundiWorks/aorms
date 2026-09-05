"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { freezeProgram, getOrCreateProgram, newProgramVersion } from "../../lib/actions/program";

export function CreateProgramButton({ projectId }: { projectId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await getOrCreateProgram(projectId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <Button size="sm" disabled={isPending} onClick={handleClick}>
        {isPending ? "Creating…" : "Start Program v1"}
      </Button>
      {error && (
        <div style={{ marginTop: "0.5rem" }}>
          <InlineNotification kind="error" title="Could not create" subtitle={error} hideCloseButton lowContrast />
        </div>
      )}
    </div>
  );
}

export function FreezeProgramButton({ programId, projectId }: { programId: string; projectId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await freezeProgram(programId, projectId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div>
      <Button size="sm" disabled={isPending} onClick={handleClick}>
        {isPending ? "Freezing…" : "Freeze program"}
      </Button>
      {error && (
        <div style={{ marginTop: "0.5rem" }}>
          <InlineNotification kind="error" title="Could not freeze" subtitle={error} hideCloseButton lowContrast />
        </div>
      )}
    </div>
  );
}

export function NewProgramVersionButton({ projectId }: { projectId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await newProgramVersion(projectId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div>
      <Button size="sm" kind="tertiary" disabled={isPending} onClick={handleClick}>
        {isPending ? "Creating…" : "Start new version"}
      </Button>
      {error && (
        <div style={{ marginTop: "0.5rem" }}>
          <InlineNotification kind="error" title="Could not create version" subtitle={error} hideCloseButton lowContrast />
        </div>
      )}
    </div>
  );
}
