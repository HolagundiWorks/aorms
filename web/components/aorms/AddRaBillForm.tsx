"use client";

import { useClosePanel } from "./ContextPanel";
import { NewRaBillForm } from "./NewRaBillForm";

type ProjectOption = { id: string; title: string };

export function AddRaBillForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewRaBillForm projects={projects} onSuccess={close} />;
}
