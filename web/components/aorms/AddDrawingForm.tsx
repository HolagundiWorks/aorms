"use client";

import { useClosePanel } from "./ContextPanel";
import { NewDrawingForm } from "./NewDrawingForm";

type ProjectOption = { id: string; title: string };

export function AddDrawingForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewDrawingForm projects={projects} onSuccess={close} />;
}
