import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { AqcReleaseButton } from "../../../components/aorms/AqcReleaseButton";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { BigStat } from "../../../components/aorms/BigStat";

const KIND_LABEL: Record<string, string> = { estimate: "Estimate", boq: "BOQ", bbs: "BBS schedule", schedule: "Schedule", running_bill: "Running bill", ipc: "Certificate (IPC)", final_account: "Final account", joint_measurement: "Joint measurement" };
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const inr = (paise: unknown) => (typeof paise === "number" ? `₹${(paise / 100).toLocaleString("en-IN")}` : null);

/**
 * AQC · Costing (2026-10-09) — what AQC has synced for each bound project: versions (estimate, BOQ, certified bills, final
 * account) with the headline figure AQC computed, and the staff action to release an estimate or schedule to the client.
 * Estimation and costing are done in AQC; this page only shows and releases (docs/esti/AQC-CONNECT-PLAN.md).
 */
export default async function AqcPage() {
  const supabase = await createClient();
  const [{ data: projects, error }, { data: versions }] = await Promise.all([
    supabase.from("aqc_projects").select("id, head_seq, updated_at, lease_expires_at, project_offices(ref, title)").order("updated_at", { ascending: false }),
    supabase.from("aqc_versions").select("id, aqc_project_id, kind, version, summary, client_visible, created_at").order("created_at", { ascending: false }),
  ]);
  const rows = projects ?? [];
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader title="AQC · Costing" result="Estimation and costing, done in AQC." description="Projects synced from AQC, their issued versions, and what has been released to the client." />
        <div className="aorms-bigstat-row">
          <BigStat value={rows.length} label="Projects in AQC" />
          <BigStat value={(versions ?? []).length} label="Versions" active />
          <BigStat value={(versions ?? []).filter((v) => v.client_visible).length} label="Released to clients" />
        </div>
        {error && <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>Couldn&apos;t load AQC projects: {error.message}</p>}
        {rows.length === 0 && !error && (
          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            No project has been pushed from AQC yet. Sign in to AQC with your AORMS account, open a project online, or push a local project online.
          </p>
        )}
        {rows.map((p) => {
          const po = one(p.project_offices as { ref: string; title: string } | { ref: string; title: string }[] | null);
          const vs = (versions ?? []).filter((v) => v.aqc_project_id === p.id);
          const editing = !!p.lease_expires_at && new Date(p.lease_expires_at) > new Date();
          return (
            <section key={p.id} style={{ marginBottom: "2rem" }}>
              <h2 className="cds--type-heading-02" style={{ marginBottom: "0.5rem" }}>
                {po?.title ?? "Project"} <span className="cds--type-helper-text-01">{po?.ref}</span>{" "}
                {editing && <Tag type="blue" size="sm">Being edited in AQC</Tag>}
              </h2>
              <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.5rem" }}>
                Synced {day(p.updated_at)} · change {p.head_seq}
              </p>
              <Table aria-label={`Versions for ${po?.title ?? "project"}`} size="sm" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Version</TableHeader>
                    <TableHeader>Figure from AQC</TableHeader>
                    <TableHeader>Issued</TableHeader>
                    <TableHeader>Client</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vs.map((v) => {
                    const s = v.summary as Record<string, unknown>;
                    const figure = inr(s.grandTotalPaise) ?? inr(s.netPaise) ?? inr(s.finalValuePaise) ?? "—";
                    const releasable = ["estimate", "schedule"].includes(v.kind);
                    return (
                      <TableRow key={v.id}>
                        <TableCell>{KIND_LABEL[v.kind] ?? v.kind} · v{v.version}</TableCell>
                        <TableCell className="aorms-num">{figure}</TableCell>
                        <TableCell>{day(v.created_at)}</TableCell>
                        <TableCell>
                          {releasable ? <AqcReleaseButton versionId={v.id} visible={v.client_visible} /> : <span className="cds--type-helper-text-01">Staff only</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {vs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}><p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>No version issued from AQC yet.</p></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </section>
          );
        })}
      </Column>
    </Grid>
  );
}
