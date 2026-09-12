import { Column, Grid, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { DashboardWidget, EmptyRow, WidgetRow } from "../../../components/aorms/dashboard/DashboardWidget";
import { RecomputeButton } from "../../../components/aorms/pulse/RecomputeButton";
import { MissingParamActions } from "../../../components/aorms/pulse/MissingParamActions";
import { AskPulseForm } from "../../../components/aorms/pulse/AskPulseForm";
import { PRIORITY_BAND_LABEL, type PriorityBand } from "../../../lib/pulse/scoring";
import { getTopPriorityTasks, getLowConfidenceTasks, getBlockedTasks, getOpenMissingParams } from "../../../lib/pulse/queries";

/**
 * ESTI Pulse (2026-09-12) — the Work-hub view docs/esti/ESTI-PULSE.md
 * § 12 describes, ported onto the current stack: Top Priorities, Blocked
 * Tasks, Missing Parameters (grouped display by assignee), Low
 * Confidence Tasks, plus an on-demand recompute trigger and the NL
 * interpreter's own free-text box. See lib/pulse/recompute.ts's own
 * header comment for what this page deliberately does NOT yet cover
 * (Module 3's Standup Agent, Module 4's full question-routing loop —
 * both need a notifications system this app doesn't have).
 */

const BAND_TAG: Record<PriorityBand, "red" | "magenta" | "purple" | "blue" | "gray"> = {
  CRITICAL: "red",
  ACTION_TODAY: "magenta",
  WATCH: "purple",
  NORMAL: "blue",
  BACKLOG: "gray",
};

export default async function PulsePage() {
  const supabase = await createClient();

  const [topPriorities, lowConfidence, blockedTasks, missingParams, { data: projects }] = await Promise.all([
    getTopPriorityTasks(supabase),
    getLowConfidenceTasks(supabase),
    getBlockedTasks(supabase),
    getOpenMissingParams(supabase),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  const criticalCount = topPriorities.filter((t) => t.band === "CRITICAL").length;

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader
          title="Pulse"
          description="ESTI's deterministic task prediction and workflow engine — every score here is computed from real project data, never invented."
          actions={<RecomputeButton />}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <KpiTile label="Critical" value={criticalCount} />
          <KpiTile label="Blocked tasks" value={blockedTasks.length} />
          <KpiTile label="Open gaps" value={missingParams.length} />
          <KpiTile label="Low confidence" value={lowConfidence.length} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(22rem, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <DashboardWidget title="Top priorities">
            {topPriorities.length === 0 ? (
              <EmptyRow text="No open tasks scored yet — run Recompute now." />
            ) : (
              topPriorities.map((t) => (
                <WidgetRow
                  key={t.id}
                  primary={t.title}
                  secondary={t.projectTitle ?? undefined}
                  right={
                    <Tag type={BAND_TAG[t.band]} size="sm">
                      {PRIORITY_BAND_LABEL[t.band]}
                    </Tag>
                  }
                />
              ))
            )}
          </DashboardWidget>

          <DashboardWidget title="Blocked tasks">
            {blockedTasks.length === 0 ? (
              <EmptyRow text="Nothing is blocked on an open dependency right now." />
            ) : (
              blockedTasks.map((b) => <WidgetRow key={b.dependencyId} primary={b.taskTitle} secondary={`Blocked by: ${b.dependsOnTitle}`} />)
            )}
          </DashboardWidget>

          <DashboardWidget title="Missing parameters">
            {missingParams.length === 0 ? (
              <EmptyRow text="No open gaps — every task has its due date, assignee, and dependencies in order." />
            ) : (
              missingParams.map((p) => (
                <WidgetRow
                  key={p.id}
                  primary={p.taskTitle}
                  secondary={`${p.description}${p.assigneeName ? ` — ${p.assigneeName}` : " — Unassigned"}`}
                  right={<MissingParamActions paramId={p.id} />}
                />
              ))
            )}
          </DashboardWidget>

          <DashboardWidget title="Low confidence tasks">
            {lowConfidence.length === 0 ? (
              <EmptyRow text="Nothing is flagged low-confidence right now." />
            ) : (
              lowConfidence.map((t) => (
                <WidgetRow key={t.id} primary={t.title} secondary={t.projectTitle ?? undefined} right={`${t.confidenceScore}%`} />
              ))
            )}
          </DashboardWidget>
        </div>

        <div style={{ maxWidth: "36rem" }}>
          <DashboardWidget title="Ask Pulse">
            <AskPulseForm projects={projects ?? []} />
          </DashboardWidget>
        </div>
      </Column>
    </Grid>
  );
}
