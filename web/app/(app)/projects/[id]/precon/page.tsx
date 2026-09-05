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
import { NewRiskForm } from "../../../../../components/aorms/NewRiskForm";
import { RiskStatusSelect } from "../../../../../components/aorms/RiskStatusSelect";
import { NewOpportunityForm } from "../../../../../components/aorms/NewOpportunityForm";
import { OpportunityStatusSelect } from "../../../../../components/aorms/OpportunityStatusSelect";
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
      <Grid style={{ padding: "2rem" }}>
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
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {project.title}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "1rem" }}>
          Pre-Construction R&amp;O
        </h1>
        <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}>
          Studio design-stage risk and opportunity registers, plus phase gates — not construction
          readiness (that&apos;s AProc&apos;s own delivery-side tracking).
        </p>

        <Tabs>
          <TabList aria-label="Precon sections">
            <Tab>Risks</Tab>
            <Tab>Opportunities</Tab>
            <Tab>Phase Gates</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <div style={{ paddingTop: "1.5rem" }}>
                <NewRiskForm projectId={project.id} />
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
              </div>
            </TabPanel>

            <TabPanel>
              <div style={{ paddingTop: "1.5rem" }}>
                <NewOpportunityForm projectId={project.id} />
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
