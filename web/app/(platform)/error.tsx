"use client";

import { RouteError } from "../../components/aorms/RouteError";

/** Route-level error boundary for the AORMS Platform — see RouteError.tsx's
 * own comment. Needs its own "use client" per Next's error.tsx
 * requirement. */
export default function PlatformError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} />;
}
