"use client";

import { useClosePanel } from "./ContextPanel";
import { NewOpportunityForm } from "./NewOpportunityForm";

export function AddOpportunityForm({ projectId }: { projectId: string }) {
  const close = useClosePanel();
  return <NewOpportunityForm projectId={projectId} onSuccess={close} />;
}
