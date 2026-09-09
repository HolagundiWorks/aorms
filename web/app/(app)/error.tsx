"use client";

import { RouteError } from "../../components/aorms/RouteError";

/**
 * Route-level error boundary (Next.js error.tsx convention) for every page
 * under the authenticated app shell. See RouteError.tsx's own comment for
 * why the actual body lives there, shared with every other route group's
 * layout shell. This file still needs its own "use client" directive —
 * Next requires the file at this exact path to carry it, a re-export alone
 * isn't enough for error.tsx specifically (unlike not-found.tsx/loading.tsx,
 * which are fine as plain Server Component wrappers around a client body).
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} />;
}
