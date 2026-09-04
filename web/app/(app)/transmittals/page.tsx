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
import { createClient } from "../../../lib/supabase/server";
import { NewTransmittalForm } from "../../../components/aorms/NewTransmittalForm";

export default async function TransmittalsPage() {
  const supabase = await createClient();

  const [{ data: transmittals, error }, { data: projects }] = await Promise.all([
    supabase
      .from("transmittals")
      .select("id, ref, recipient, purpose, channel, date_issued, acknowledged_at, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Transmittals</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Drawing-issue tracking with client/consultant acknowledgment.
        </p>

        <NewTransmittalForm projects={projects ?? []} />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load transmittals: {error.message}
          </p>
        ) : (
          <Table aria-label="Transmittals" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Recipient</TableHeader>
                <TableHeader>Purpose</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Channel</TableHeader>
                <TableHeader>Acknowledged</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(transmittals ?? []).map((t) => {
                const project = Array.isArray(t.project_offices)
                  ? t.project_offices[0]
                  : (t.project_offices as { title: string } | null);
                return (
                  <TableRow key={t.id}>
                    <TableCell>{t.ref}</TableCell>
                    <TableCell>{t.recipient}</TableCell>
                    <TableCell>{t.purpose}</TableCell>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>{t.channel}</TableCell>
                    <TableCell>
                      <Tag type={t.acknowledged_at ? "green" : "gray"} size="sm">
                        {t.acknowledged_at ? "Acknowledged" : "Pending"}
                      </Tag>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(transmittals ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No transmittals yet.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Column>
    </Grid>
  );
}
