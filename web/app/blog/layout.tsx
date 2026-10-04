import { PublicShell } from "../../components/aorms/PublicShell";

/**
 * Minimal blog shell — no route group, sits directly under the root
 * layout (plain html/body, no header/nav of its own — same as app/page.tsx).
 * Just a small header linking back to / (2026-09-10, same "no way back to
 * home" gap fixed on the login pages) and a max-width content column
 * matching the landing page's own visual language, without pulling in
 * that page's full section/CTA apparatus.
 */
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell maxWidth={760}>{children}</PublicShell>;
}
