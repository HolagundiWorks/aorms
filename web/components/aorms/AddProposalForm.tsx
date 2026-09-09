"use client";

import { useClosePanel } from "./ContextPanel";
import { NewProposalForm } from "./NewProposalForm";

type ProjectOption = { id: string; title: string };

export function AddProposalForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewProposalForm projects={projects} onSuccess={close} />;
}
