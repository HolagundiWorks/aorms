import { createElement, useEffect } from "react";
import type { ElementType } from "react";
import { Breadcrumb, BreadcrumbItem } from "@carbon/react";

/**
 * Wave 2 adapter — kit `PageBreadcrumb` API → stock Carbon `<Breadcrumb>`.
 *
 * Drop-in for `@hcw/ui-kit`'s PageBreadcrumb. Renders stock Carbon breadcrumbs
 * and keeps the sanctioned `document.title` side-effect (last crumb) — plumbing,
 * not custom UI (§ 0). Link crumbs use the caller's `linkComponent`
 * (e.g. react-router `Link`) via `linkPropName`.
 */
export type Crumb = { label: string; to?: string };

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
    if (last) document.title = last;
  }, [items]);

  if (items.length === 0) return null;

  return (
    <Breadcrumb aria-label={ariaLabel} noTrailingSlash>
      {items.map((crumb, i) => {
        const isLast = i === items.length - 1;
        if (isLast || !crumb.to) {
          return (
            <BreadcrumbItem key={`${crumb.label}-${i}`} isCurrentPage={isLast}>
              {crumb.label}
            </BreadcrumbItem>
          );
        }
        if (linkComponent) {
          return (
            <BreadcrumbItem key={`${crumb.label}-${i}`}>
              {createElement(
                linkComponent,
                { [linkPropName]: crumb.to, className: "cds--link" },
                crumb.label,
              )}
            </BreadcrumbItem>
          );
        }
        return (
          <BreadcrumbItem key={`${crumb.label}-${i}`} href={crumb.to}>
            {crumb.label}
          </BreadcrumbItem>
        );
      })}
    </Breadcrumb>
  );
}

export default PageBreadcrumb;
