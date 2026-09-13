"use client";

import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@carbon/react";

/**
 * KPI tabs (2026-09-13, extended 2026-09-14 for the Pulse/Dashboard
 * merge) — groups the headline-number tiles into Pulse | Finance | Team |
 * Others instead of one flat multi-row grid, the same "group by who'd
 * reach for it, show one group at a time" idea as DashboardTabs.tsx,
 * applied to the numbers instead of the registers. Independent Tabs
 * instance from DashboardTabs — different content shape (a KPI grid vs a
 * widget list), not meant to be the same tab strip.
 */
export function KpiTabs({
  pulse,
  finance,
  team,
  others,
}: {
  pulse: React.ReactNode;
  finance: React.ReactNode | null;
  team: React.ReactNode;
  others: React.ReactNode;
}) {
  return (
    <Tabs>
      <TabList aria-label="KPI groups" contained>
        <Tab>Pulse</Tab>
        {finance && <Tab>Finance</Tab>}
        <Tab>Team</Tab>
        <Tab>Others</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>{pulse}</TabPanel>
        {finance && <TabPanel>{finance}</TabPanel>}
        <TabPanel>{team}</TabPanel>
        <TabPanel>{others}</TabPanel>
      </TabPanels>
    </Tabs>
  );
}
