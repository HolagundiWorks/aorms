/**
 * PageBreadcrumb adapter — kit primitive + react-router Link (same as
 * `components/PageBreadcrumb`). Replaces the Carbon Breadcrumb shim (S12).
 */
import { useEffect, type ElementType } from "react";
import { Link as RouterLink } from "react-router-dom";
import { PageBreadcrumb as KitPageBreadcrumb, type Crumb } from "@hcw/ui-kit";

export type { Crumb };

export function PageBreadcrumb({
  items,
  linkComponent,
  linkPropName = "to",
  "aria-label": ariaLabel = "Breadcrumb",
}: {
  items: Crumb[];
  linkComponent?: ElementType;
  linkPropName?: "href" | "to";
  "aria-label"?: string;
}) {
  useEffect(() => {
    const last = items[items.length - 1]?.label;
    if (last) document.title = `${last} · AORMS`;
  }, [items]);

  if (items.length === 0) return null;

  return (
    <KitPageBreadcrumb
      items={items}
      linkComponent={linkComponent ?? RouterLink}
      linkPropName={linkPropName}
      aria-label={ariaLabel}
    />
  );
}

export default PageBreadcrumb;
