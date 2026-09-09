"use client";

import { useClosePanel } from "./ContextPanel";
import { NewPayslipForm } from "./NewPayslipForm";

type MemberOption = { id: string; name: string };

export function AddPayslipForm({ members }: { members: MemberOption[] }) {
  const close = useClosePanel();
  return <NewPayslipForm members={members} onSuccess={close} />;
}
