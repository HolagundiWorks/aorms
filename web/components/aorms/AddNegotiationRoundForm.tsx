"use client";

import { useClosePanel } from "./ContextPanel";
import { NewNegotiationRoundForm } from "./NewNegotiationRoundForm";

export function AddNegotiationRoundForm({ projectId }: { projectId: string }) {
  const close = useClosePanel();
  return <NewNegotiationRoundForm projectId={projectId} onSuccess={close} />;
}
