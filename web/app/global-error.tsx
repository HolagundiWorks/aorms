"use client";

import { useEffect } from "react";

/**
 * Root-level error boundary (Next.js `global-error.tsx` convention) — the
 * one case none of the per-route-group `error.tsx` files can catch: an
 * exception in the root `layout.tsx` itself (or anywhere above every
 * group's own error boundary). Vanishingly rare in practice — root
 * `layout.tsx` here is just an `<html>`/`<body>` wrapper importing
 * `globals.scss`, nothing that plausibly throws — but its absence meant
 * that one failure mode had zero handling at all, not even Next's default,
 * since `global-error.tsx` is the only boundary Next lets replace the root
 * layout. Must render its own `<html>`/`<body>` (Next's own requirement —
 * this file substitutes for the root layout that failed, so nothing above
 * it exists to provide those tags) and can't import `globals.scss`-
 * dependent Carbon components for the same reason a failed root layout
 * can't be trusted to have gotten that far — plain inline styles only.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en-IN">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
            padding: "2rem 1rem",
            textAlign: "center",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div>
            <p style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Something went wrong</p>
            <p style={{ color: "#525252" }}>{error.message || "An unexpected error occurred."}</p>
          </div>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#0f62fe",
              color: "#fff",
              border: 0,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
