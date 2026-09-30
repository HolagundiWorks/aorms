"use client";

import type { ReactNode } from "react";
import { PanelSlide } from "../../../../components/aorms/motion/PanelSlide";
import { TABS } from "../../../../components/aorms/ProjectTabs";

const ORDER = TABS.map((t) => t.slug);

/**
 * Re-mounts on every navigation between a project's tabs, which is what lets
 * PanelSlide slide the new tab's content in horizontally. The tab strip lives
 * in layout.tsx, so it stays put while the panel beneath it moves.
 */
export default function ProjectTemplate({ children }: { children: ReactNode }) {
  return (
    <PanelSlide order={ORDER} base={(pathname) => pathname.split("/")[3] ?? ""}>
      {children}
    </PanelSlide>
  );
}
