"use client";

import { useClosePanel } from "./ContextPanel";
import { NewApprovalForm } from "./NewApprovalForm";

type ProjectOption = { id: string; title: string };

export function AddApprovalForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewApprovalForm projects={projects} onSuccess={close} />;
}
