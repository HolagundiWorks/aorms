"use client";

import { useClosePanel } from "./ContextPanel";
import { NewExpenseForm } from "./NewExpenseForm";

type ProjectOption = { id: string; title: string };
type AccountOption = { id: string; code: string; name: string };

export function AddExpenseForm({ projects, accounts }: { projects: ProjectOption[]; accounts: AccountOption[] }) {
  const close = useClosePanel();
  return <NewExpenseForm projects={projects} accounts={accounts} onSuccess={close} />;
}
