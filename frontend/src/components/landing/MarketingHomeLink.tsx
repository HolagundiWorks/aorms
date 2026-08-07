import { Link as RouterLink } from "react-router-dom";
import { type CSSProperties, type ReactNode } from "react";
import { AORMS_PLATFORM } from "../../lib/product-nomenclature.js";
import { isPlatformHost, platformHomeHref } from "../../lib/aorms-surface-urls.js";

/** Logo / brand link back to platform landing (SPA `/` on apex; absolute on studio hosts). */
export function MarketingHomeLink({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const label = `${AORMS_PLATFORM.name} home`;
  if (isPlatformHost()) {
    return (
      <RouterLink to="/" aria-label={label} className={className} style={style}>
        {children}
      </RouterLink>
    );
  }
  return (
    <a href={platformHomeHref()} aria-label={label} className={className} style={style}>
      {children}
    </a>
  );
}
