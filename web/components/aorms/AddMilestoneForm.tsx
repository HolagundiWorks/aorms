"use client";

import { useClosePanel } from "./ContextPanel";
import { NewMilestoneForm } from "./NewMilestoneForm";

type ProjectOption = { id: string; title: string };

export function AddMilestoneForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewMilestoneForm projects={projects} onSuccess={close} />;
}
