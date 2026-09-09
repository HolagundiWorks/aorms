import NextLink from "next/link";

/**
 * Root-level 404 (Next.js not-found.tsx convention) — the fallback of last
 * resort for a URL that doesn't match any route group at all (marketing,
 * `(app)`, any portal, `(platform)`, `(auth)`), or for a group whose own
 * `not-found.tsx` doesn't exist (shouldn't happen now — every group has
 * one — but this is the safety net if a new one is ever added without
 * one). Deliberately standalone, not built on `RouteNotFound`/`PageHeader`:
 * root `layout.tsx` has no header/nav of its own for this to render inside
 * (each route group builds its own shell), and this page doesn't know
 * which "world" — marketing site, office hub, or a portal — the broken URL
 * was even trying to reach, so it can't assume any of their branding or
 * auth state. Plain Carbon-token colors, no component library dependency.
 */
export default function RootNotFound() {
  return (
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
      }}
    >
      {/* Plain <img>, not next/image — a fixed brand asset, not user content. */}
      <img src="/aorms-logo.png" alt="AORMS" style={{ height: "24px", width: "auto" }} />
      <div>
        <p className="cds--type-heading-03 cds--type-semibold" style={{ marginBottom: "0.5rem" }}>
          Page not found
        </p>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
      <NextLink href="/" className="cds--type-body-01" style={{ color: "var(--cds-link-primary)" }}>
        ← Back to aorms.in
      </NextLink>
    </div>
  );
}
