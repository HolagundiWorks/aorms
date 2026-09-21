import { CheckmarkFilled, Close, FolderOpen, UserFollow } from "@carbon/icons-react";
import Link from "next/link";
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
import { AddLeadForm } from "../../../components/aorms/AddLeadForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { LeadStatusSelect } from "../../../components/aorms/LeadStatusSelect";
import { PageHeader } from "../../../components/aorms/PageHeader";

// Roles with has_capability('write') (rank >= 40, or an explicit
// allow-list role — see web/supabase/migrations/0002_capability_helper.sql
// and web/lib/actions/leads.ts's own copy of this set). Gates the "Add
// lead" trigger the same way Clients/Contractors/Projects already gate
// their own create triggers — found missing here by live QA 2026-09-21
// (a VIEWER saw a fully-interactive "Add lead" button/form; the RLS
// write policy already blocks the underlying INSERT, this is the
// matching UI-level fix).
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export default async function LeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: leads, error }, { data: myProfile }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, ref, client_name, lead_source, project_type, city, status, converted_project_id")
      .order("created_at", { ascending: false }),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const canWrite = !!myProfile && WRITE_TIER_ROLES.has(myProfile.role);

  const rows = leads ?? [];
  // Distinct from status === "QUALIFIED" (one stage in the pipeline,
  // LeadStatusSelect's own enum) — this counts leads that have actually
  // been converted into a real project (converted_project_id set), a
  // later, separate milestone. Found live: the KPI tile below used to be
  // labeled "Qualified" too, so a lead sitting at status=QUALIFIED (not
  // yet converted) made "0 Qualified" read as contradicting its own row
  // — same word, two different meanings on one page. Renamed the tile to
  // "Converted" to match what this count actually measures.
  const convertedCount = rows.filter((l) => l.converted_project_id).length;
  const lostCount = rows.filter((l) => l.status === "DROPPED" || l.status === "LOST").length;
  const openCount = rows.length - convertedCount - lostCount;

  return (
    <ContextPanelLayout>
      {canWrite && (
        <ContextPanel title="New lead" description="Log an inbound enquiry.">
          <AddLeadForm />
        </ContextPanel>
      )}
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Leads"
              description="Inbound enquiries, before a client or project exists — the start of the Project OS lead-to-activation pipeline."
              actions={canWrite ? <ContextPanelTrigger size="sm">Add lead</ContextPanelTrigger> : undefined}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 11rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total leads" value={rows.length} icon={UserFollow} />
              <KpiTile label="Open" value={openCount} icon={FolderOpen} />
              <KpiTile label="Converted" value={convertedCount} icon={CheckmarkFilled} />
              <KpiTile label="Lost" value={lostCount} icon={Close} />
            </div>

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load leads: {error.message}
              </p>
            ) : (
              <Table aria-label="Leads" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Ref</TableHeader>
                    <TableHeader>Client</TableHeader>
                    <TableHeader>Source</TableHeader>
                    <TableHeader>Project type</TableHeader>
                    <TableHeader>City</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(leads ?? []).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Link href={`/leads/${l.id}`}>{l.ref}</Link>
                      </TableCell>
                      <TableCell>{l.client_name}</TableCell>
                      <TableCell>{l.lead_source}</TableCell>
                      <TableCell>{l.project_type ?? "—"}</TableCell>
                      <TableCell>{l.city ?? "—"}</TableCell>
                      <TableCell>
                        {l.converted_project_id ? (
                          <Tag type="green" size="sm">
                            QUALIFIED
                          </Tag>
                        ) : (
                          <LeadStatusSelect leadId={l.id} status={l.status} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(leads ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No leads yet.
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
