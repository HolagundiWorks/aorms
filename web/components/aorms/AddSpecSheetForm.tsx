"use client";

import { useClosePanel } from "./ContextPanel";
import { NewSpecSheetForm } from "./NewSpecSheetForm";

type ProjectOption = { id: string; title: string };

export function AddSpecSheetForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewSpecSheetForm projects={projects} onSuccess={close} />;
}
