"use client";

import { useClosePanel } from "./ContextPanel";
import { NewMomForm } from "./NewMomForm";

type ProjectOption = { id: string; title: string };

export function AddMomForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewMomForm projects={projects} onSuccess={close} />;
}
