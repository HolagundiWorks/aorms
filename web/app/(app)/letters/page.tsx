import { DocumentPdf, Email, UserMultiple } from "@carbon/icons-react";
import {
  Column,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { AddLetterForm } from "../../../components/aorms/AddLetterForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { GeneratePdfButton } from "../../../components/aorms/GeneratePdfButton";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { generateLetterPdf } from "../../../lib/actions/letters";

// Roles with has_capability('write') (rank >= 40, or an explicit
// allow-list role — see web/supabase/migrations/0002_capability_helper.sql
// and web/lib/actions/letters.ts's own copy of this set). Gates the "Add
// letter" trigger the same way Clients/Contractors/Projects already gate
// their own create triggers — found missing here by live QA 2026-09-21
// (a VIEWER saw a fully-interactive "Add letter" button/form; the RLS
// write policy already blocks the underlying INSERT, this is the
// matching UI-level fix).
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export default async function LettersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: letters, error }, { data: projects }, { data: myProfile }] = await Promise.all([
    supabase
      .from("letters")
      .select("id, ref, recipient, subject, date_letter, pdf_status, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const canWrite = !!myProfile && WRITE_TIER_ROLES.has(myProfile.role);

  const rows = letters ?? [];
  const readyCount = rows.filter((l) => l.pdf_status === "READY").length;
  const recipientCount = new Set(rows.map((l) => l.recipient).filter(Boolean)).size;

  return (
    <ContextPanelLayout>
      {canWrite && (
        <ContextPanel title="New letter" description="Add a correspondence record.">
          <AddLetterForm projects={projects ?? []} />
        </ContextPanel>
      )}
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Letters"
              description="Office correspondence register."
              actions={canWrite ? <ContextPanelTrigger size="sm">Add letter</ContextPanelTrigger> : undefined}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 11rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total letters" value={rows.length} icon={Email} />
              <KpiTile label="PDF ready" value={readyCount} icon={DocumentPdf} />
              <KpiTile label="Recipients" value={recipientCount} icon={UserMultiple} />
            </div>

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load letters: {error.message}
              </p>
            ) : (
              <Table aria-label="Letters" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Ref</TableHeader>
                    <TableHeader>Recipient</TableHeader>
                    <TableHeader>Subject</TableHeader>
                    <TableHeader>Project</TableHeader>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>PDF</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(letters ?? []).map((l) => {
                    const project = Array.isArray(l.project_offices)
                      ? l.project_offices[0]
                      : (l.project_offices as { title: string } | null);
                    return (
                      <TableRow key={l.id}>
                        <TableCell>{l.ref}</TableCell>
                        <TableCell>{l.recipient}</TableCell>
                        <TableCell>{l.subject}</TableCell>
                        <TableCell>{project?.title ?? "—"}</TableCell>
                        <TableCell>{l.date_letter ?? "—"}</TableCell>
                        <TableCell>
                          <GeneratePdfButton action={generateLetterPdf.bind(null, l.id)} pdfStatus={l.pdf_status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(letters ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No letters yet.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Column>
        </Grid>
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
