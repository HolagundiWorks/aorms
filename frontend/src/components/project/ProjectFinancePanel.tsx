import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ProjectPurchaseOrders } from "../ProjectPurchaseOrders.js";
import { ProjectFacetTabs } from "./ProjectFacetTabs.js";
import { ProjectInvoicesPanel } from "./ProjectInvoicesPanel.js";

/**
 * Commercial › Finance — Invoices + Purchase Orders nested.
 * Renders a single surface when only one capability is present.
 */
export function ProjectFinancePanel({
  projectId,
  canInvoice,
  canWrite,
  highlightInvoiceId,
  initialFacet,
  onFacetChange,
}: {
  projectId: string;
  canInvoice: boolean;
  canWrite: boolean;
  highlightInvoiceId?: string | null;
  initialFacet?: string | null;
  onFacetChange?: (facet: string) => void;
}) {
  const facets = useMemo(() => {
    const list: { id: string; label: string; panel: ReactNode }[] = [];
    if (canInvoice) {
      list.push({
        id: "invoices",
        label: "Invoices",
        panel: (
          <ProjectInvoicesPanel
            projectId={projectId}
            highlightInvoiceId={highlightInvoiceId}
            canManage={canInvoice}
          />
        ),
      });
    }
    if (canWrite) {
      list.push({
        id: "purchase-orders",
        label: "Purchase Orders",
        panel: <ProjectPurchaseOrders projectId={projectId} />,
      });
    }
    return list;
  }, [projectId, canInvoice, canWrite, highlightInvoiceId]);

  const fallback = facets[0]?.id ?? "invoices";
  const [value, setValue] = useState(
    initialFacet && facets.some((f) => f.id === initialFacet)
      ? initialFacet
      : fallback,
  );

  useEffect(() => {
    if (initialFacet && facets.some((f) => f.id === initialFacet)) {
      setValue(initialFacet);
    } else if (!facets.some((f) => f.id === value)) {
      setValue(fallback);
    }
  }, [initialFacet, facets, fallback, value]);

  return (
    <ProjectFacetTabs
      facets={facets}
      value={value}
      onChange={(id) => {
        setValue(id);
        onFacetChange?.(id);
      }}
      ariaLabel="Finance facets"
    />
  );
}
