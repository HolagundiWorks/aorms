import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewEngagementForm } from "../../../../components/aorms/NewEngagementForm";
import { EngagementStatusSelect } from "../../../../components/aorms/EngagementStatusSelect";
import { RecordEngagementPaymentForm } from "../../../../components/aorms/RecordEngagementPaymentForm";

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function ConsultantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: consultant, error: consultantError }, { data: projects }] = await Promise.all([
    supabase.from("consultants").select("id, name, discipline, firm, email, phone").eq("id", id).maybeSingle(),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  if (consultantError) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load consultant: {consultantError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!consultant) notFound();

  const { data: engagements, error: engagementsError } = await supabase
    .from("engagements")
    .select("id, scope, agreed_fee_paise, paid_paise, status, project_offices(title)")
    .eq("consultant_id", id)
    .order("created_at", { ascending: false });

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "0.5rem" }}>
          {consultant.name}
        </h1>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "2rem" }}>
          {consultant.discipline} · {consultant.firm ?? "—"} · {consultant.email ?? "—"} · {consultant.phone ?? "—"}
        </p>

        <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
          Engagements
        </h2>
        <NewEngagementForm consultantId={consultant.id} projects={projects ?? []} />

        {engagementsError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load engagements: {engagementsError.message}
          </p>
        ) : (
          <div style={{ marginTop: "1.5rem" }}>
          <Table aria-label="Engagements" className="aorms-table-spaced" size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Project</TableHeader>
                <TableHeader>Scope</TableHeader>
                <TableHeader>Agreed fee</TableHeader>
                <TableHeader>Paid</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Record payment</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(engagements ?? []).map((e) => {
                const project = Array.isArray(e.project_offices)
                  ? e.project_offices[0]
                  : (e.project_offices as { title: string } | null);
                return (
                  <TableRow key={e.id}>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>{e.scope ?? "—"}</TableCell>
                    <TableCell>{formatInr(e.agreed_fee_paise)}</TableCell>
                    <TableCell>{formatInr(e.paid_paise)}</TableCell>
                    <TableCell>
                      <EngagementStatusSelect engagementId={e.id} consultantId={consultant.id} status={e.status} />
                    </TableCell>
                    <TableCell>
                      <RecordEngagementPaymentForm engagementId={e.id} consultantId={consultant.id} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {(engagements ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No engagements yet.
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
