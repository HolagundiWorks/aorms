"use client";

import { useClosePanel } from "./ContextPanel";
import { NewSnagForm } from "./NewSnagForm";

type ProjectOption = { id: string; title: string };

export function AddSnagForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewSnagForm projects={projects} onSuccess={close} />;
}
