/**
 * AORMS Platform — a genuinely separate portal from the firm app's own
 * Office Hub (AppShell): no SideNav, no Office Hub nav entry links here at
 * all (per explicit request — this portal is reached only by its own
 * direct URL). Covers login/signup and every one of the three branded
 * portals (Identity, ConnectDeX, SysDeX — see
 * docs/esti/AORMS-PLATFORM-ARCHITECTURE.md § Three portals).
 *
 * No shared header here (2026-09-10) — each page renders its own portal
 * header (`components/aorms/platform/PortalHeaders.tsx`), since the three
 * portals now have genuinely distinct branding/nav rather than one
 * undifferentiated bar. This also fixes a small pre-existing redundancy:
 * `/platform-login`/`/platform-signup` already rendered their own
 * logo/heading — under the old shared header they got that AND the
 * layout's bar stacked on top; now they render just their own.
 */
import { BrandWatermark } from "../../components/aorms/BrandWatermark";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      {children}
      {/* Same small, non-interactive AORMS mark Office Hub's own shell
          uses (2026-09-14 branding consistency pass) — rendered once
          here rather than per-portal-header, so it's identical across
          every platform surface including /platform-login/-signup. */}
      <BrandWatermark />
    </div>
  );
}
