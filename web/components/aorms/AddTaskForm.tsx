"use client";

import { useClosePanel } from "./ContextPanel";
import { NewTaskForm } from "./NewTaskForm";

type ProjectOption = { id: string; title: string };
type AssigneeOption = { id: string; full_name: string | null };

export function AddTaskForm({ projects, assignees }: { projects: ProjectOption[]; assignees: AssigneeOption[] }) {
  const close = useClosePanel();
  return <NewTaskForm projects={projects} assignees={assignees} onSuccess={close} />;
}
