"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tab, TabList, Tabs, type TabProps } from "@carbon/react";

/**
 * Project workspace tab strip — replaces the flat `<Link>` list that used
 * to sit at the top of `/projects/[id]`. Each tab is a real route (not a
 * client-side panel swap), using Carbon's own documented pattern for this
 * exact case: `Tab`'s `as` prop rendering a router `Link` instead of its
 * default button ("useful for using Tab along with react-router or other
 * client side router libraries" — Tab.d.ts's own JSDoc). `selectedIndex`
 * is derived from the current pathname on every render, so browser
 * back/forward and direct links land on the right tab automatically.
 * Lives in `projects/[id]/layout.tsx` so every sub-page gets it for free.
 *
 * `Tab.as`'s declared type is `ComponentType<{}>`, which can't express
 * Next's `Link` requiring `href` — TS can't verify the pattern
 * structurally even though it's the officially documented one. One typed
 * local alias widens `Tab`'s own prop type to admit `href`/`as={Link}`;
 * every other `Tab` prop stays exactly as Carbon declares it.
 */
const LinkTab = Tab as unknown as React.ComponentType<Omit<TabProps, "as"> & { as: typeof Link; href: string }>;

const TABS: { slug: string; label: string }[] = [
  { slug: "", label: "Overview" },
  { slug: "brief", label: "Project Brief" },
  { slug: "cpi", label: "CPI" },
  { slug: "dna", label: "Project DNA" },
  { slug: "assessment", label: "Assessment" },
  { slug: "feasibility", label: "Feasibility" },
  { slug: "negotiation", label: "Negotiation" },
  { slug: "program", label: "Program" },
  { slug: "onboarding", label: "Onboarding" },
  { slug: "precon", label: "Pre-Construction R&O" },
  { slug: "decisions", label: "Decisions (CRIF)" },
];

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const rest = pathname.slice(base.length).replace(/^\//, "").split("/")[0] ?? "";
  const activeIndex = Math.max(
    0,
    TABS.findIndex((t) => t.slug === rest),
  );

  return (
    <Tabs selectedIndex={activeIndex} onChange={() => {}}>
      <TabList aria-label="Project sections" scrollDebounceWait={200}>
        {TABS.map((t) => (
          <LinkTab key={t.slug || "overview"} as={Link} href={t.slug ? `${base}/${t.slug}` : base}>
            {t.label}
          </LinkTab>
        ))}
      </TabList>
    </Tabs>
  );
}
