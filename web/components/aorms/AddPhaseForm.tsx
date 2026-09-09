"use client";

import { useClosePanel } from "./ContextPanel";
import { NewPhaseForm } from "./NewPhaseForm";

/** Lives inside the project Overview page's `<ContextPanel>` — wires
 * `NewPhaseForm`'s `onSuccess` to the panel's own close handler. */
export function AddPhaseForm({ projectId }: { projectId: string }) {
  const close = useClosePanel();
  return <NewPhaseForm projectId={projectId} onSuccess={close} />;
}
