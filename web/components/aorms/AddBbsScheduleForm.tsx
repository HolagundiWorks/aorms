"use client";

import { useClosePanel } from "./ContextPanel";
import { NewBbsScheduleForm } from "./NewBbsScheduleForm";

type ProjectOption = { id: string; title: string };

export function AddBbsScheduleForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewBbsScheduleForm projects={projects} onSuccess={close} />;
}
