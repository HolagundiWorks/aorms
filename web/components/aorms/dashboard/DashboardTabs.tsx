"use client";

import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@carbon/react";

// Bounded height + internal scroll, not the page itself — same "content
// scrolls inside its own Tile, the page never scrolls" pattern this
// repo's own module map already calls out for StudioAbstract.tsx's
// DataTable (see CLAUDE.md's frontend routes table). Applied here
// (2026-09-13, "single screen" request) so a tab with a long widget list
// doesn't push the rest of the page — and Recent Activity below it — off
// the bottom of a normal laptop viewport.
const PANEL_SCROLL_STYLE: React.CSSProperties = { maxHeight: "18rem", overflowY: "auto", paddingTop: "0.75rem" };

/**
 * Dashboard widget tabs (2026-09-13 restructure, extended 2026-09-14 for
 * the Pulse/Dashboard merge — see app/(app)/pulse/page.tsx's own header
 * comment) — replaces flat, always-all-visible grids of DashboardWidget
 * tiles with switchable groups. All panels' data is already fetched
 * server-side in one Promise.all on page.tsx (nothing here triggers a
 * new request on tab switch — this is purely a client-side visibility
 * toggle over already-rendered content), so panel content is passed in
 * as plain children/props rather than fetched again. Grouped by who'd
 * actually reach for each register, not by table name: Task Prediction
 * (ESTI Pulse's own deterministic scoring — Top priorities/Blocked/
 * Missing parameters/Low confidence + the Ask Pulse NL box), Finance
 * (money), Team & Site (people/delivery), Pipeline & Partners (things
 * owed to/by clients, consultants, contractors), My Work (the signed-in
 * user's own queue), Activity (the audit feed).
 */
export function DashboardTabs({
  taskPrediction,
  finance,
  teamAndSite,
  pipelineAndPartners,
  myWork,
  activity,
}: {
  taskPrediction: React.ReactNode;
  finance: React.ReactNode | null;
  teamAndSite: React.ReactNode;
  pipelineAndPartners: React.ReactNode;
  myWork: React.ReactNode;
  activity: React.ReactNode;
}) {
  return (
    <Tabs>
      <TabList aria-label="Dashboard sections" contained>
        <Tab>Task Prediction</Tab>
        {finance && <Tab>Finance</Tab>}
        <Tab>Team &amp; Site</Tab>
        <Tab>Pipeline &amp; Partners</Tab>
        <Tab>My Work</Tab>
        <Tab>Activity</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <div style={PANEL_SCROLL_STYLE}>{taskPrediction}</div>
        </TabPanel>
        {finance && (
          <TabPanel>
            <div style={PANEL_SCROLL_STYLE}>{finance}</div>
          </TabPanel>
        )}
        <TabPanel>
          <div style={PANEL_SCROLL_STYLE}>{teamAndSite}</div>
        </TabPanel>
        <TabPanel>
          <div style={PANEL_SCROLL_STYLE}>{pipelineAndPartners}</div>
        </TabPanel>
        <TabPanel>
          <div style={PANEL_SCROLL_STYLE}>{myWork}</div>
        </TabPanel>
        <TabPanel>
          <div style={PANEL_SCROLL_STYLE}>{activity}</div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
