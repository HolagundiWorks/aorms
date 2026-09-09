"use client";

import { useClosePanel } from "./ContextPanel";
import { NewTenderForm } from "./NewTenderForm";

type ProjectOption = { id: string; title: string };

export function AddTenderForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewTenderForm projects={projects} onSuccess={close} />;
}
