"use client";

import { useClosePanel } from "./ContextPanel";
import { NewPackageForm } from "./NewPackageForm";

type ProjectOption = { id: string; title: string };

export function AddPackageForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewPackageForm projects={projects} onSuccess={close} />;
}
