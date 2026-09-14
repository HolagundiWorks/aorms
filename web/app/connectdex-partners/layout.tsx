import Link from "next/link";

/**
 * Minimal shell for the ConnectDeX Partners marketing page (2026-09-14) —
 * same pattern as app/blog/layout.tsx: no route group, sits directly
 * under the root layout, just a small header linking back to / and a
 * max-width content column. Kept as its own top-level route (not nested
 * under app/(platform)/connectdex/) because that path is already taken
 * by the authenticated "My ConnectDeX Companies" portal page — this is
 * the public, unauthenticated marketing page instead.
 */
export default function ConnectDexPartnersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1rem" }}>
      <header style={{ padding: "2rem 0 1rem" }}>
        <Link href="/" aria-label="AORMS home">
          {/* Plain <img>, not next/image — a fixed brand asset. */}
          <img src="/aorms-logo.png" alt="AORMS" style={{ height: "28px", width: "auto" }} />
        </Link>
      </header>
      <main style={{ paddingBottom: "4rem" }}>{children}</main>
    </div>
  );
}
