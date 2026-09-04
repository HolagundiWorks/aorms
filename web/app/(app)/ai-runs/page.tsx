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

/**
 * Read-only viewer over ai_runs (migration 0010) — no create form here.
 * Every row is provenance for a generation the AI gateway itself produced;
 * that gateway isn't ported (Phase 7's open architecture question — see
 * NEXTJS-MIGRATION-PHASE7-AUDIT.md), so there's nothing in this app that
 * writes to this table yet. RLS is bare is_office_staff() (any staff can
 * see any run, matching modules/ai/router.ts's actual gating today), so no
 * extra page-level gate is added here either — don't invent a narrower
 * policy the current backend doesn't enforce.
 */
export default async function AiRunsPage() {
  const supabase = await createClient();

  const { data: runs, error } = await supabase
    .from("ai_runs")
    .select(
      "id, kind, provider, model, approval_state, issued_entity_type, created_at, project_offices(title)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">AI Runs</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Provenance for every ESTI generation — most recent 200, newest first.
        </p>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load AI runs: {error.message}
          </p>
        ) : (
          <Table aria-label="AI runs" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>When</TableHeader>
                <TableHeader>Kind</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Provider / model</TableHeader>
                <TableHeader>Approval</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(runs ?? []).map((r) => {
                const project = Array.isArray(r.project_offices)
                  ? r.project_offices[0]
                  : (r.project_offices as { title: string } | null);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.created_at).toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <Link href={`/ai-runs/${r.id}`}>{r.kind}</Link>
                    </TableCell>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>
                      {r.provider} / {r.model}
                    </TableCell>
                    <TableCell>
                      <Tag
                        type={
                          r.approval_state === "APPROVED"
                            ? "green"
                            : r.approval_state === "REJECTED"
                              ? "red"
                              : "gray"
                        }
                        size="sm"
                      >
                        {r.approval_state}
                      </Tag>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(runs ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No AI runs yet.
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
