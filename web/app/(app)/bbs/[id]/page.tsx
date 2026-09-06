import { notFound } from "next/navigation";
import {
  Column,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewBbsMemberForms } from "../../../../components/aorms/NewBbsMemberForms";
import { NewBbsItemForm } from "../../../../components/aorms/NewBbsItemForm";
import { BbsMemberActions } from "../../../../components/aorms/BbsMemberActions";
import { BbsStatusSelect } from "../../../../components/aorms/BbsStatusSelect";
import { bbsDiameterSummary } from "../../../../lib/bbs/formulas";
import { computeMember, type BbsMemberStored } from "../../../../lib/bbs/engine";

const ELEMENT_LABEL: Record<string, string> = {
  COLUMN: "Column",
  BEAM: "Beam",
  SLAB: "Slab",
  FOOTING: "Footing",
  WALL: "Retaining wall",
  STAIR: "Staircase",
};

export default async function BbsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: schedule, error: scheduleError } = await supabase
    .from("bbs_schedules")
    .select("id, ref, title, status, notes, project_offices(title)")
    .eq("id", id)
    .maybeSingle();

  if (scheduleError) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load BBS schedule: {scheduleError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!schedule) notFound();

  const project = Array.isArray(schedule.project_offices)
    ? schedule.project_offices[0]
    : (schedule.project_offices as { title: string } | null);

  const [{ data: members, error: membersError }, { data: items, error: itemsError }] = await Promise.all([
    supabase
      .from("bbs_members")
      .select("id, element, mark, input, sort_order")
      .eq("bbs_id", id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("bbs_items")
      .select("id, member_id, bar_mark, member, element, role, dia_mm, no_of_members, bars_per_member, cutting_length_mm, weight_kg, floor, shape")
      .eq("bbs_id", id)
      .order("created_at"),
  ]);

  const rows = items ?? [];
  const summary = bbsDiameterSummary(
    rows.map((it) => ({
      diaMm: it.dia_mm,
      weightKg: it.weight_kg,
      noOfMembers: it.no_of_members,
      barsPerMember: it.bars_per_member,
      cuttingLengthMm: it.cutting_length_mm,
    })),
  );
  const totalWeightKg = summary.reduce((s, r) => s + r.weightKg, 0);

  const memberChecks = (members ?? []).flatMap((m, i) => {
    try {
      const stored = { element: m.element, input: m.input } as BbsMemberStored;
      return computeMember(stored, i).checks.map((c) => ({ ...c, memberId: m.id }));
    } catch {
      return [];
    }
  });

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {schedule.ref}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "0.5rem" }}>
          {schedule.title}
        </h1>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.5rem" }}>
          <BbsStatusSelect bbsId={schedule.id} status={schedule.status} />
          <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            {project?.title ?? "—"}
          </span>
        </div>
        {schedule.notes && (
          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "1.5rem" }}>
            {schedule.notes}
          </p>
        )}

        <h2 className="cds--type-heading-03" style={{ margin: "2rem 0 1rem" }}>
          Add member
        </h2>
        <NewBbsMemberForms bbsId={schedule.id} />

        <h2 className="cds--type-heading-03" style={{ margin: "2rem 0 1rem" }}>
          Members
        </h2>
        {membersError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load members: {membersError.message}
          </p>
        ) : (
          <Table aria-label="BBS members" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Mark</TableHeader>
                <TableHeader>Element</TableHeader>
                <TableHeader>Bar lines</TableHeader>
                <TableHeader>Checks</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(members ?? []).map((m) => {
                const barCount = rows.filter((it) => it.member_id === m.id).length;
                const checks = memberChecks.filter((c) => c.memberId === m.id);
                return (
                  <TableRow key={m.id}>
                    <TableCell>{m.mark ?? "—"}</TableCell>
                    <TableCell>{ELEMENT_LABEL[m.element] ?? m.element}</TableCell>
                    <TableCell>{barCount}</TableCell>
                    <TableCell>
                      {checks.length === 0 ? (
                        "—"
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          {checks.map((c, i) => (
                            <Tag key={i} type={c.ok ? "green" : "red"} size="sm">
                              {c.label}: {c.message}
                            </Tag>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <BbsMemberActions memberId={m.id} bbsId={schedule.id} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {(members ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No members yet — add a column, beam, slab or footing above.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        <h2 className="cds--type-heading-03" style={{ margin: "2rem 0 1rem" }}>
          Add manual bar line
        </h2>
        <NewBbsItemForm bbsId={schedule.id} />

        <h2 className="cds--type-heading-03" style={{ margin: "2rem 0 1rem" }}>
          Bar schedule
        </h2>
        {itemsError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load bar schedule: {itemsError.message}
          </p>
        ) : (
          <Table aria-label="Bar schedule" className="aorms-table-spaced" size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Bar mark</TableHeader>
                <TableHeader>Member</TableHeader>
                <TableHeader>Role</TableHeader>
                <TableHeader>Dia (mm)</TableHeader>
                <TableHeader>Nos</TableHeader>
                <TableHeader>Cutting length (mm)</TableHeader>
                <TableHeader>Weight (kg)</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{it.bar_mark}</TableCell>
                  <TableCell>{it.member ?? "—"}</TableCell>
                  <TableCell>{it.role ?? "—"}</TableCell>
                  <TableCell>{it.dia_mm}</TableCell>
                  <TableCell>{it.no_of_members * it.bars_per_member}</TableCell>
                  <TableCell>{it.cutting_length_mm}</TableCell>
                  <TableCell>{it.weight_kg.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No bar lines yet.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        <h2 className="cds--type-heading-03" style={{ margin: "2rem 0 1rem" }}>
          Diameter-wise summary
        </h2>
        <Table aria-label="Diameter summary" className="aorms-table-spaced" size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Dia (mm)</TableHeader>
              <TableHeader>Nos</TableHeader>
              <TableHeader>Total length (m)</TableHeader>
              <TableHeader>Weight (kg)</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {summary.map((r) => (
              <TableRow key={r.diaMm}>
                <TableCell>{r.diaMm}</TableCell>
                <TableCell>{r.nos}</TableCell>
                <TableCell>{r.totalLengthM.toFixed(2)}</TableCell>
                <TableCell>{r.weightKg.toFixed(2)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} style={{ fontWeight: 600 }}>
                Total
              </TableCell>
              <TableCell style={{ fontWeight: 600 }}>{totalWeightKg.toFixed(2)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Column>
    </Grid>
  );
}
