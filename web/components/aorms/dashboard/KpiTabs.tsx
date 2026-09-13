"use client";

import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@carbon/react";

/**
 * KPI tabs (2026-09-13) — groups the headline-number tiles into Finance |
 * Team | Others instead of one flat multi-row grid, the same "group by
 * who'd reach for it, show one group at a time" idea as
 * DashboardTabs.tsx, applied to the numbers instead of the registers.
 * Independent Tabs instance from DashboardTabs — different content shape
 * (a KPI grid vs a widget list), not meant to be the same tab strip.
 */
export function KpiTabs({
  finance,
  team,
  others,
}: {
  finance: React.ReactNode | null;
  team: React.ReactNode;
  others: React.ReactNode;
}) {
  return (
    <Tabs>
      <TabList aria-label="KPI groups" contained>
        {finance && <Tab>Finance</Tab>}
        <Tab>Team</Tab>
        <Tab>Others</Tab>
      </TabList>
      <TabPanels>
        {finance && <TabPanel>{finance}</TabPanel>}
        <TabPanel>{team}</TabPanel>
        <TabPanel>{others}</TabPanel>
      </TabPanels>
    </Tabs>
  );
}
