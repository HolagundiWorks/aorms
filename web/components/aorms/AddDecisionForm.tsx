"use client";

import { useClosePanel } from "./ContextPanel";
import { NewDecisionForm } from "./NewDecisionForm";

/** Lives inside the Decisions page's `<ContextPanel>` — just wires the
 * form's `onSuccess` to the panel's own close handler via context, so
 * `NewDecisionForm` itself doesn't need to know it's inside a panel. */
export function AddDecisionForm({ projectId }: { projectId: string }) {
  const close = useClosePanel();
  return <NewDecisionForm projectId={projectId} onSuccess={close} />;
}
