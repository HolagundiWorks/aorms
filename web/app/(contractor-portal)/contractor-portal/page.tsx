import Link from "next/link";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { BigStat } from "../../../components/aorms/BigStat";

const STATUS_TAG: Record<string, "cool-gray" | "blue" | "green" | "red"> = {
  INVITED: "cool-gray",
  VIEWED: "blue",
  SUBMITTED: "green",
  DECLINED: "red",
};

export default async function ContractorPortalHomePage() {
  const supabase = await createClient();

  const { data: invitations, error } = await supabase
    .from("tender_invitations")
    .select("id, status, invited_at, tenders(title, category, status, due_date, project_offices(title))")
    .order("invited_at", { ascending: false });

  // `project_offices` is not readable by a contractor under RLS; this security-definer function (migration 0098)
  // returns the project name for the caller's own invitations only.
  const { data: projectRows } = await supabase.rpc("my_tender_projects");
  const projectByInvitation = new Map((projectRows ?? []).map((r: { invitation_id: string; project_title: string }) => [r.invitation_id, r.project_title]));

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader title="Your tender invitations" result="A bid you can submit with confidence." description="Tenders you've been invited to bid on." />

        <div className="aorms-bigstat-row">
          <BigStat value={(invitations ?? []).length} label="Invitations" />
          <BigStat value={(invitations ?? []).filter((i) => i.status === "INVITED" || i.status === "VIEWED").length} label="Awaiting your bid" active />
          <BigStat value={(invitations ?? []).filter((i) => i.status === "SUBMITTED").length} label="Bids submitted" />
          <BigStat value={(invitations ?? []).filter((i) => i.status === "DECLINED").length} label="Declined" />
        </div>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load your invitations: {error.message}
          </p>
        ) : (
          <Table aria-label="Your tender invitations" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Project</TableHeader>
                <TableHeader>Tender</TableHeader>
                <TableHeader>Category</TableHeader>
                <TableHeader>Due date</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(invitations ?? []).map((inv) => {
                const tender = Array.isArray(inv.tenders) ? inv.tenders[0] : (inv.tenders as {
                  title: string;
                  category: string | null;
                  status: string;
                  due_date: string | null;
                  project_offices: { title: string } | { title: string }[] | null;
                } | null);
                const project = tender
                  ? Array.isArray(tender.project_offices)
                    ? tender.project_offices[0]
                    : tender.project_offices
                  : null;
                return (
                  <TableRow key={inv.id}>
                    <TableCell>{projectByInvitation.get(inv.id) ?? project?.title ?? "—"}</TableCell>
                    <TableCell>
                      <Link href={`/contractor-portal/${inv.id}`}>{tender?.title ?? "—"}</Link>
                    </TableCell>
                    <TableCell>{tender?.category ?? "—"}</TableCell>
                    <TableCell>{tender?.due_date ?? "—"}</TableCell>
                    <TableCell>
                      <Tag type={STATUS_TAG[inv.status] ?? "cool-gray"} size="sm">
                        {inv.status}
                      </Tag>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(invitations ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No tender invitations yet.
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
