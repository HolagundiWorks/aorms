"use client";

import { RouteError } from "../../components/aorms/RouteError";

/** Route-level error boundary for the Client Portal — see RouteError.tsx's
 * own comment. This file needs its own "use client" per Next's error.tsx
 * requirement, even though the actual body is a shared component. */
export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} />;
}
