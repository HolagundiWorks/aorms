"use client";

import { useClosePanel } from "./ContextPanel";
import { NewRiskForm } from "./NewRiskForm";

export function AddRiskForm({ projectId }: { projectId: string }) {
  const close = useClosePanel();
  return <NewRiskForm projectId={projectId} onSuccess={close} />;
}
