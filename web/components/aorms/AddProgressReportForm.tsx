"use client";

import { useClosePanel } from "./ContextPanel";
import { NewProgressReportForm } from "./NewProgressReportForm";

type ProjectOption = { id: string; title: string };

export function AddProgressReportForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewProgressReportForm projects={projects} onSuccess={close} />;
}
