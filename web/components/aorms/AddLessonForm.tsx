"use client";

import { useClosePanel } from "./ContextPanel";
import { NewLessonForm } from "./NewLessonForm";

type ProjectOption = { id: string; title: string };

export function AddLessonForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewLessonForm projects={projects} onSuccess={close} />;
}
