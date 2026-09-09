"use client";

import { useClosePanel } from "./ContextPanel";
import { NewSiteInstructionForm } from "./NewSiteInstructionForm";

type ProjectOption = { id: string; title: string };
type ContractorOption = { id: string; name: string };

export function AddSiteInstructionForm({ projects, contractors }: { projects: ProjectOption[]; contractors: ContractorOption[] }) {
  const close = useClosePanel();
  return <NewSiteInstructionForm projects={projects} contractors={contractors} onSuccess={close} />;
}
