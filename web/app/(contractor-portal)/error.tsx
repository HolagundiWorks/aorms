"use client";

import { RouteError } from "../../components/aorms/RouteError";

/** Route-level error boundary for the Contractor Portal — see
 * RouteError.tsx's own comment. Needs its own "use client" per Next's
 * error.tsx requirement. */
export default function ContractorPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} />;
}
