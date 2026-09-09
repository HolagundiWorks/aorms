"use client";

import { useClosePanel } from "./ContextPanel";
import { NewLetterForm } from "./NewLetterForm";

type ProjectOption = { id: string; title: string };

export function AddLetterForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewLetterForm projects={projects} onSuccess={close} />;
}
