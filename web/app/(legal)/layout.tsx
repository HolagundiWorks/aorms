import { PublicShell } from "../../components/aorms/PublicShell";

/**
 * Shared shell for the Legal route group (2026-09-14, explicit
 * direction: "add legal section, add privacy policy") — /privacy and
 * /legal both render inside this one layout. Same minimal pattern as
 * app/blog/layout.tsx and app/connectdex-partners/layout.tsx: no header
 * chrome from the main site, just a way back to / and a readable
 * max-width text column (narrower than the marketing pages — this is
 * prose, not a grid layout).
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell maxWidth={760}>{children}</PublicShell>;
}
