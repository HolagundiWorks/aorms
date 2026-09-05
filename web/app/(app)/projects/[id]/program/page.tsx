import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag, Tile } from "@carbon/react";
import { createClient } from "../../../../../lib/supabase/server";
import { NewProgramSpaceForm } from "../../../../../components/aorms/NewProgramSpaceForm";
import { CreateProgramButton, FreezeProgramButton, NewProgramVersionButton } from "../../../../../components/aorms/ProgramActions";

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project, error: projectError }, { data: program }] = await Promise.all([
    supabase.from("project_offices").select("id, title").eq("id", id).maybeSingle(),
    supabase
      .from("programs")
      .select("id, version, status, max_built_area_sqm")
      .eq("project_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
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

  const { data: spaces } = program
    ? await supabase
        .from("program_spaces")
        .select("id, name, category, floor_level, unit_area_sqm, count")
        .eq("program_id", program.id)
        .order("floor_level")
        .order("sort_order")
    : { data: [] };

  const totalProgrammedAreaSqm = (spaces ?? []).reduce((sum, s) => sum + s.unit_area_sqm * s.count, 0);
  const envelope = program?.max_built_area_sqm ?? 0;
  const utilizationPct = envelope > 0 ? (totalProgrammedAreaSqm / envelope) * 100 : null;
  const overEnvelope = envelope > 0 && totalProgrammedAreaSqm > envelope;

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {project.title}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "1rem" }}>
          Program / Space Schedule
        </h1>
        <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}>
          Formulated within the feasibility envelope — over-allocation is an advisory warning,
          never a hard block.
        </p>

        {!program ? (
          <CreateProgramButton projectId={project.id} />
        ) : (
          <>
            <Tile style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <span className="cds--type-heading-03">Version {program.version}</span>
                <Tag type={program.status === "FROZEN" ? "green" : "blue"} size="sm">
                  {program.status}
                </Tag>
                {overEnvelope && (
                  <Tag type="red" size="sm">
                    Over envelope
                  </Tag>
                )}
              </div>
              <p className="cds--type-body-01">
                {totalProgrammedAreaSqm.toFixed(1)} sqm programmed of {envelope.toFixed(1)} sqm envelope
                {utilizationPct != null ? ` (${utilizationPct.toFixed(0)}%)` : ""}
              </p>
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                {program.status === "DRAFT" ? (
                  <FreezeProgramButton programId={program.id} projectId={project.id} />
                ) : (
                  <NewProgramVersionButton projectId={project.id} />
                )}
              </div>
            </Tile>

            {program.status === "DRAFT" && <NewProgramSpaceForm programId={program.id} projectId={project.id} />}

            <Table aria-label="Program spaces" className="aorms-table-spaced">
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>Floor</TableHeader>
                  <TableHeader>Unit area (sqm)</TableHeader>
                  <TableHeader>Count</TableHeader>
                  <TableHeader>Total (sqm)</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(spaces ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.category}</TableCell>
                    <TableCell>{s.floor_level}</TableCell>
                    <TableCell>{s.unit_area_sqm}</TableCell>
                    <TableCell>{s.count}</TableCell>
                    <TableCell>{(s.unit_area_sqm * s.count).toFixed(1)}</TableCell>
                  </TableRow>
                ))}
                {(spaces ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                        No spaces yet.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )}
      </Column>
    </Grid>
  );
}
