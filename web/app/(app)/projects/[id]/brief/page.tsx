import { notFound } from "next/navigation";
import { Accordion, AccordionItem, Column, Grid, Tag } from "@carbon/react";
import { createClient } from "../../../../../lib/supabase/server";
import { BasicInfoForm } from "../../../../../components/aorms/brief/BasicInfoForm";
import { ProjectInfoForm } from "../../../../../components/aorms/brief/ProjectInfoForm";
import { OccupantsSection } from "../../../../../components/aorms/brief/OccupantsSection";
import { DesignPrefsForm } from "../../../../../components/aorms/brief/DesignPrefsForm";
import { SpaceScheduleTable, type SpaceRow } from "../../../../../components/aorms/brief/SpaceScheduleTable";
import { MaterialsForm } from "../../../../../components/aorms/brief/MaterialsForm";
import { RoomDetailsTable } from "../../../../../components/aorms/brief/RoomDetailsTable";
import { AssumptionsForm } from "../../../../../components/aorms/brief/AssumptionsForm";
import { ApprovalSection } from "../../../../../components/aorms/brief/ApprovalSection";
import { ExportBriefButton } from "../../../../../components/aorms/brief/ExportBriefButton";

/**
 * The router's own `getByProject` also returns an `aggregates` bundle
 * (appointment scope/status, permit count) for a context strip — omitted
 * here because neither `appointments` nor `permits` exist on Supabase yet
 * (both unported domains). Add the strip back once either lands, rather
 * than fabricating a context row with nothing real behind it.
 */
export default async function ProjectBriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project, error: projectError }, { data: brief }] = await Promise.all([
    supabase.from("project_offices").select("id, title, ref").eq("id", id).maybeSingle(),
    supabase.from("project_briefs").select("*").eq("project_id", id).maybeSingle(),
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

  const basicInfo = (brief?.basic_info as Record<string, unknown>) ?? {};
  const projectInfo = (brief?.project_info as Record<string, unknown>) ?? {};
  const occupants = (brief?.occupants as { household?: unknown[]; staffRequirements?: string }) ?? {};
  const household = Array.isArray(occupants.household) ? (occupants.household as SpaceRow[]) : [];
  const designPrefs = (brief?.design_prefs as Record<string, unknown>) ?? {};
  const spaceSchedule = Array.isArray(brief?.space_schedule) ? (brief!.space_schedule as SpaceRow[]) : [];
  const materials = (brief?.materials as Record<string, unknown>) ?? {};
  const roomDetails = Array.isArray(brief?.room_details) ? brief!.room_details : [];
  const readOnly = !!brief?.approved_at;

  const hasData = (v: Record<string, unknown> | undefined): boolean =>
    !!v && Object.values(v).some((x) => x != null && x !== "" && x !== false);

  const sectionTitle = (no: number, label: string, saved: boolean) =>
    `${no}. ${label}${saved ? " ✓" : ""}`;

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {project.ref}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h1 className="cds--type-heading-05">{project.title} — Project Brief</h1>
          <ExportBriefButton projectId={project.id} />
        </div>
        <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}>
          Questionnaire answers and site context — the single source for project briefing data.
        </p>

        {readOnly && (
          <div style={{ marginBottom: "1.5rem" }}>
            <Tag type="green">Approved {brief?.approved_at}</Tag>
          </div>
        )}

        <Accordion>
          <AccordionItem title={sectionTitle(1, "Basic Info", hasData(basicInfo))}>
            <div style={{ paddingTop: "1rem" }}>
              <BasicInfoForm projectId={project.id} values={basicInfo} readOnly={readOnly} />
            </div>
          </AccordionItem>

          <AccordionItem title={sectionTitle(2, "Project Info", hasData(projectInfo))}>
            <div style={{ paddingTop: "1rem" }}>
              <ProjectInfoForm projectId={project.id} values={projectInfo} readOnly={readOnly} />
            </div>
          </AccordionItem>

          <AccordionItem title={sectionTitle(3, "Occupants", household.length > 0 || !!occupants.staffRequirements)}>
            <div style={{ paddingTop: "1rem" }}>
              <OccupantsSection
                projectId={project.id}
                household={household as never}
                staffRequirements={occupants.staffRequirements ?? null}
                readOnly={readOnly}
              />
            </div>
          </AccordionItem>

          <AccordionItem title={sectionTitle(4, "Design Preferences", hasData(designPrefs))}>
            <div style={{ paddingTop: "1rem" }}>
              <DesignPrefsForm projectId={project.id} values={designPrefs} readOnly={readOnly} />
            </div>
          </AccordionItem>

          <AccordionItem title={sectionTitle(5, "Accommodation Schedule", spaceSchedule.length > 0)}>
            <div style={{ paddingTop: "1rem" }}>
              <SpaceScheduleTable projectId={project.id} rows={spaceSchedule} readOnly={readOnly} />
            </div>
          </AccordionItem>

          <AccordionItem title={sectionTitle(6, "Room Details", roomDetails.length > 0)}>
            <div style={{ paddingTop: "1rem" }}>
              <RoomDetailsTable projectId={project.id} rows={roomDetails as never} spaces={spaceSchedule} readOnly={readOnly} />
            </div>
          </AccordionItem>

          <AccordionItem title={sectionTitle(7, "Materials", hasData(materials))}>
            <div style={{ paddingTop: "1rem" }}>
              <MaterialsForm projectId={project.id} values={materials} readOnly={readOnly} />
            </div>
          </AccordionItem>

          <AccordionItem title={sectionTitle(8, "Assumptions", !!brief?.assumptions)}>
            <div style={{ paddingTop: "1rem" }}>
              <AssumptionsForm projectId={project.id} value={brief?.assumptions ?? null} readOnly={readOnly} />
            </div>
          </AccordionItem>

          <AccordionItem title={sectionTitle(9, "Approval", readOnly)} open={readOnly}>
            <div style={{ paddingTop: "1rem" }}>
              <ApprovalSection
                projectId={project.id}
                approvalNote={brief?.approval_note ?? null}
                approvedAt={brief?.approved_at ?? null}
              />
            </div>
          </AccordionItem>
        </Accordion>
      </Column>
    </Grid>
  );
}
