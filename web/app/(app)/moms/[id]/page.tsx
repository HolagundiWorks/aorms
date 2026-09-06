import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewMomActionForm } from "../../../../components/aorms/NewMomActionForm";
import { MomActionStatusSelect } from "../../../../components/aorms/MomActionStatusSelect";
import { RemoveLineItemButton } from "../../../../components/aorms/RemoveLineItemButton";
import { removeMomAction } from "../../../../lib/actions/moms";

export default async function MomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: mom, error: momError } = await supabase
    .from("moms")
    .select("id, ref, title, meeting_date, venue, attendees, minutes, status, project_offices(title)")
    .eq("id", id)
    .maybeSingle();

  if (momError) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load meeting minutes: {momError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!mom) notFound();

  const project = Array.isArray(mom.project_offices) ? mom.project_offices[0] : (mom.project_offices as { title: string } | null);

  const { data: actions, error: actionsError } = await supabase
    .from("mom_actions")
    .select("id, description, assignee_name, due_date, status")
    .eq("mom_id", id)
    .order("sort_order");

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {mom.ref}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "0.5rem" }}>
          {mom.title}
        </h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "2rem" }}>
          <Tag type={mom.status === "DRAFT" ? "cool-gray" : "green"} size="sm">
            {mom.status}
          </Tag>
          <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            {project?.title ?? "—"} · {mom.meeting_date ?? "—"} · {mom.venue ?? "—"}
          </span>
        </div>

        {mom.attendees && (
          <>
            <h2 className="cds--type-heading-03" style={{ marginBottom: "0.5rem" }}>
              Attendees
            </h2>
            <p className="cds--type-body-01" style={{ marginBottom: "1.5rem" }}>
              {mom.attendees}
            </p>
          </>
        )}

        <h2 className="cds--type-heading-03" style={{ marginBottom: "0.5rem" }}>
          Minutes
        </h2>
        <p className="cds--type-body-01" style={{ marginBottom: "2rem", whiteSpace: "pre-wrap" }}>
          {mom.minutes}
        </p>

        <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
          Action items
        </h2>
        <NewMomActionForm momId={mom.id} />

        {actionsError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load action items: {actionsError.message}
          </p>
        ) : (
          <div style={{ marginTop: "1.5rem" }}>
          <Table aria-label="Action items" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Action</TableHeader>
                <TableHeader>Assignee</TableHeader>
                <TableHeader>Due</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Remove</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(actions ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.description}</TableCell>
                  <TableCell>{a.assignee_name ?? "—"}</TableCell>
                  <TableCell>{a.due_date ?? "—"}</TableCell>
                  <TableCell>
                    <MomActionStatusSelect actionId={a.id} momId={mom.id} status={a.status} />
                  </TableCell>
                  <TableCell>
                    <RemoveLineItemButton action={removeMomAction.bind(null, a.id, mom.id)} />
                  </TableCell>
                </TableRow>
              ))}
              {(actions ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No action items yet.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        )}
      </Column>
    </Grid>
  );
}
