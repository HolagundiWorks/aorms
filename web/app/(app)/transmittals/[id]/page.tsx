import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewTransmittalItemForm } from "../../../../components/aorms/NewTransmittalItemForm";
import { RemoveLineItemButton } from "../../../../components/aorms/RemoveLineItemButton";
import { GeneratePdfButton } from "../../../../components/aorms/GeneratePdfButton";
import { generateTransmittalPdf, removeTransmittalItem } from "../../../../lib/actions/transmittals";

export default async function TransmittalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: transmittal, error: transmittalError } = await supabase
    .from("transmittals")
    .select("id, ref, recipient, purpose, channel, date_issued, acknowledged_at, acknowledged_by, pdf_status, notes, project_offices(id, title)")
    .eq("id", id)
    .maybeSingle();

  if (transmittalError) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load transmittal: {transmittalError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!transmittal) notFound();

  const project = Array.isArray(transmittal.project_offices)
    ? transmittal.project_offices[0]
    : (transmittal.project_offices as { id: string; title: string } | null);

  const [{ data: items, error: itemsError }, { data: drawings }] = await Promise.all([
    supabase
      .from("transmittal_items")
      .select("id, drawing_id, drawing_ref, title, rev, copies")
      .eq("transmittal_id", id)
      .order("created_at"),
    project
      ? supabase.from("drawings").select("id, ref, title").eq("project_id", project.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {transmittal.ref}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "0.5rem" }}>
          {transmittal.purpose}
        </h1>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "2rem" }}>
          <Tag type={transmittal.acknowledged_at ? "green" : "cool-gray"} size="sm">
            {transmittal.acknowledged_at ? `Acknowledged by ${transmittal.acknowledged_by}` : "Pending"}
          </Tag>
          <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            {project?.title ?? "—"} · To: {transmittal.recipient} · {transmittal.channel}
          </span>
          <GeneratePdfButton action={generateTransmittalPdf.bind(null, transmittal.id)} pdfStatus={transmittal.pdf_status} />
        </div>

        <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
          Documents
        </h2>
        <NewTransmittalItemForm transmittalId={transmittal.id} drawings={drawings ?? []} />

        {itemsError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load items: {itemsError.message}
          </p>
        ) : (
          <div style={{ marginTop: "1.5rem" }}>
          <Table aria-label="Transmittal items" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Rev</TableHeader>
                <TableHeader>Copies</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(items ?? []).map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{it.drawing_ref ?? "—"}</TableCell>
                  <TableCell>{it.title}</TableCell>
                  <TableCell>{it.rev ?? "—"}</TableCell>
                  <TableCell>{it.copies}</TableCell>
                  <TableCell>
                    <RemoveLineItemButton action={removeTransmittalItem.bind(null, it.id, transmittal.id)} />
                  </TableCell>
                </TableRow>
              ))}
              {(items ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No documents listed yet.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        )}

        {transmittal.notes && (
          <>
            <h2 className="cds--type-heading-03" style={{ margin: "2rem 0 1rem" }}>
              Notes
            </h2>
            <p className="cds--type-body-01">{transmittal.notes}</p>
          </>
        )}
      </Column>
    </Grid>
  );
}
