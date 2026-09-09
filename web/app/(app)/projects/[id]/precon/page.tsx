import { notFound } from "next/navigation";
import {
  Column,
  Grid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { createClient } from "../../../../../lib/supabase/server";
import { AddRiskForm } from "../../../../../components/aorms/AddRiskForm";
import { AddOpportunityForm } from "../../../../../components/aorms/AddOpportunityForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../../../components/aorms/ContextPanel";
import { RiskStatusSelect } from "../../../../../components/aorms/RiskStatusSelect";
import { OpportunityStatusSelect } from "../../../../../components/aorms/OpportunityStatusSelect";
import { PageHeader } from "../../../../../components/aorms/PageHeader";
import { PhaseGateChecklist } from "../../../../../components/aorms/PhaseGateChecklist";
import { opportunityPriority } from "../../../../../lib/project-precon";

const PRIORITY_TAG: Record<string, "red" | "magenta" | "purple" | "gray"> = {
  CRITICAL: "red",
  HIGH: "magenta",
  MEDIUM: "purple",
  LOW: "gray",
};

export default async function ProjectPreconPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project, error: projectError }, { data: risks }, { data: opportunities }, { data: gates }] = await Promise.all([
    supabase.from("project_offices").select("id, title").eq("id", id).maybeSingle(),
    supabase.from("project_risks").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("project_opportunities").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("project_phase_gates").select("*").eq("project_id", id),
  ]);

  if (projectError) {
    return (
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load project: {projectError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!project) notFound();

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader
          eyebrow={project.title}
          title="Pre-Construction R&O"
          description="Studio design-stage risk and opportunity registers, plus phase gates — not construction readiness (that's AProc's own delivery-side tracking)."
        />

        <Tabs>
          <TabList aria-label="Precon sections">
            <Tab>Risks</Tab>
            <Tab>Opportunities</Tab>
            <Tab>Phase Gates</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <div style={{ paddingTop: "1.5rem" }}>
                <ContextPanelLayout>
                  <ContextPanel title="Add risk" description="Log a new design-stage risk.">
                    <AddRiskForm projectId={project.id} />
                  </ContextPanel>
                  <ContextPanelContent>
                <div style={{ marginBottom: "1.5rem" }}>
                  <ContextPanelTrigger size="sm">Add risk</ContextPanelTrigger>
                </div>
                <Table aria-label="Risks" className="aorms-table-spaced">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Title</TableHeader>
                      <TableHeader>Likelihood</TableHeader>
                      <TableHeader>Impact</TableHeader>
                      <TableHeader>Response</TableHeader>
                      <TableHeader>Status</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(risks ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.title}</TableCell>
                        <TableCell>{r.likelihood}</TableCell>
                        <TableCell>{r.impact}</TableCell>
                        <TableCell>{r.response}</TableCell>
                        <TableCell>
                          <RiskStatusSelect projectId={project.id} riskId={r.id} status={r.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(risks ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                            No risks logged yet.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                  </ContextPanelContent>
                </ContextPanelLayout>
              </div>
            </TabPanel>

            <TabPanel>
              <div style={{ paddingTop: "1.5rem" }}>
                <ContextPanelLayout>
                  <ContextPanel title="Add opportunity" description="Log a new design-stage opportunity.">
                    <AddOpportunityForm projectId={project.id} />
                  </ContextPanel>
                  <ContextPanelContent>
                <div style={{ marginBottom: "1.5rem" }}>
                  <ContextPanelTrigger size="sm">Add opportunity</ContextPanelTrigger>
                </div>
                <Table aria-label="Opportunities" className="aorms-table-spaced">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Title</TableHeader>
                      <TableHeader>Area</TableHeader>
                      <TableHeader>Priority</TableHeader>
                      <TableHeader>Response</TableHeader>
                      <TableHeader>Status</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(opportunities ?? []).map((o) => {
                      const priority = opportunityPriority(o.probability, o.impact);
                      return (
                        <TableRow key={o.id}>
                          <TableCell>{o.title}</TableCell>
                          <TableCell>{o.area}</TableCell>
                          <TableCell>
                            <Tag type={PRIORITY_TAG[priority]} size="sm">
                              {priority}
                            </Tag>
                          </TableCell>
                          <TableCell>{o.response}</TableCell>
                          <TableCell>
                            <OpportunityStatusSelect projectId={project.id} opportunityId={o.id} status={o.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(opportunities ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                            No opportunities logged yet.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                  </ContextPanelContent>
                </ContextPanelLayout>
              </div>
            </TabPanel>

            <TabPanel>
              <div style={{ paddingTop: "1.5rem" }}>
                <PhaseGateChecklist projectId={project.id} gates={gates ?? []} />
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Column>
    </Grid>
  );
}
