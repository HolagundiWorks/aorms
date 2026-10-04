import { PublicShell } from "../../components/aorms/PublicShell";

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
  return <PublicShell maxWidth={1200}>{children}</PublicShell>;
}
