"use client";

import { useClosePanel } from "./ContextPanel";
import { NewDocumentIssueForm } from "./NewDocumentIssueForm";

type ProjectOption = { id: string; title: string };

export function AddDocumentIssueForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewDocumentIssueForm projects={projects} onSuccess={close} />;
}
