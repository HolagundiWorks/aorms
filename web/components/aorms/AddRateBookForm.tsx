"use client";

import { useClosePanel } from "./ContextPanel";
import { NewRateBookForm } from "./NewRateBookForm";

export function AddRateBookForm() {
  const close = useClosePanel();
  return <NewRateBookForm onSuccess={close} />;
}
