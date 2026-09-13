"use client";

import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@carbon/react";

/**
 * Dashboard widget tabs (2026-09-13 restructure) — replaces two flat,
 * always-all-visible grids of 9 and 4 DashboardWidget tiles (13 registers
 * stacked in one long scroll) with four switchable groups. All four
 * panels' data is already fetched server-side in one Promise.all on
 * page.tsx (nothing here triggers a new request on tab switch — this is
 * purely a client-side visibility toggle over already-rendered content),
 * so panel content is passed in as plain children/props rather than
 * fetched again. Grouped by who'd actually reach for each register, not
 * by table name: Finance (money), Team & Site (people/delivery), Pipeline
 * & Partners (things owed to/by clients, consultants, contractors), My
 * Work (the signed-in user's own queue).
 */
export function DashboardTabs({
  finance,
  teamAndSite,
  pipelineAndPartners,
  myWork,
}: {
  finance: React.ReactNode | null;
  teamAndSite: React.ReactNode;
  pipelineAndPartners: React.ReactNode;
  myWork: React.ReactNode;
}) {
  return (
    <Tabs>
      <TabList aria-label="Dashboard sections" contained>
        {finance && <Tab>Finance</Tab>}
        <Tab>Team &amp; Site</Tab>
        <Tab>Pipeline &amp; Partners</Tab>
        <Tab>My Work</Tab>
      </TabList>
      <TabPanels>
        {finance && <TabPanel>{finance}</TabPanel>}
        <TabPanel>{teamAndSite}</TabPanel>
        <TabPanel>{pipelineAndPartners}</TabPanel>
        <TabPanel>{myWork}</TabPanel>
      </TabPanels>
    </Tabs>
  );
}
