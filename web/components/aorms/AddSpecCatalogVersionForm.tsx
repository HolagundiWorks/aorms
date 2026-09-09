"use client";

import { useClosePanel } from "./ContextPanel";
import { NewSpecCatalogVersionForm } from "./NewSpecCatalogVersionForm";

export function AddSpecCatalogVersionForm() {
  const close = useClosePanel();
  return <NewSpecCatalogVersionForm onSuccess={close} />;
}
