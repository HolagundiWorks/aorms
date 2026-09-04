import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewTenderInviteForm } from "../../../../components/aorms/NewTenderInviteForm";
import { CloseTenderButton, AwardTenderButton } from "../../../../components/aorms/TenderBidActions";

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

/**
 * Bids are read from tender_bids_sealed (migration 0012), the actual seal
 * enforcement — not the base tender_bids table. No bid-submission form
 * here: the RPC the schema's own comment names (submit_tender_bid) was
 * never built, and no contractor-portal RLS shape exists yet either
 * (Phase 9 audit's own note) — nothing in the real system creates these
 * rows today.
 */
export default async function TenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: tender, error: tenderError }, { data: invitations }, { data: contractors }] = await Promise.all([
    supabase.from("tenders").select("id, title, category, status, project_offices(title)").eq("id", id).maybeSingle(),
    supabase.from("tender_invitations").select("id, status, contractors(id, name)").eq("tender_id", id),
    supabase.from("contractors").select("id, name"),
  ]);

  if (tenderError) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load tender: {tenderError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!tender) notFound();

  const project = Array.isArray(tender.project_offices) ? tender.project_offices[0] : (tender.project_offices as { title: string } | null);
  const contractorName = new Map((contractors ?? []).map((c) => [c.id, c.name]));
  const invitedContractorIds = new Set(
    (invitations ?? []).map((i) => (Array.isArray(i.contractors) ? i.contractors[0]?.id : (i.contractors as { id: string } | null)?.id)),
  );
  const availableContractors = (contractors ?? []).filter((c) => !invitedContractorIds.has(c.id));

  const invitationIds = (invitations ?? []).map((i) => i.id);
  const invitationContractor = new Map(
    (invitations ?? []).map((i) => [i.id, Array.isArray(i.contractors) ? i.contractors[0]?.id : (i.contractors as { id: string } | null)?.id]),
  );

  const { data: bids, error: bidsError } = invitationIds.length
    ? await supabase
        .from("tender_bids_sealed")
        .select("id, invitation_id, amount_paise, completion_weeks, notes, sealed")
        .in("invitation_id", invitationIds)
    : { data: [], error: null };

  const sealed = tender.status !== "CLOSED" && tender.status !== "AWARDED";

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {project?.title ?? "—"} {tender.category ? `· ${tender.category}` : ""}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <h1 className="cds--type-heading-05">{tender.title}</h1>
          <Tag type={tender.status === "AWARDED" ? "green" : tender.status === "CLOSED" ? "purple" : "blue"} size="sm">
            {tender.status}
          </Tag>
        </div>

        <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
          Invited contractors
        </h2>
        <NewTenderInviteForm tenderId={tender.id} contractors={availableContractors} />
        <div style={{ marginBottom: "2rem" }}>
          <Table aria-label="Invitations" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Contractor</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(invitations ?? []).map((i) => {
                const contractor = Array.isArray(i.contractors) ? i.contractors[0] : (i.contractors as { name: string } | null);
                return (
                  <TableRow key={i.id}>
                    <TableCell>{contractor?.name ?? "—"}</TableCell>
                    <TableCell>{i.status}</TableCell>
                  </TableRow>
                );
              })}
              {(invitations ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={2}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No contractors invited yet.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
          Bids {sealed ? <Tag type="gray" size="sm">Sealed</Tag> : <Tag type="green" size="sm">Open</Tag>}
        </h2>
        {sealed && tender.status === "OPEN" && <CloseTenderButton tenderId={tender.id} />}
        {bidsError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load bids: {bidsError.message}
          </p>
        ) : (
          <Table aria-label="Bids" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Contractor</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Completion (weeks)</TableHeader>
                <TableHeader>Notes</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {(bids ?? []).map((b) => {
                const contractorId = invitationContractor.get(b.invitation_id);
                return (
                  <TableRow key={b.id}>
                    <TableCell>{contractorId ? contractorName.get(contractorId) ?? "—" : "—"}</TableCell>
                    <TableCell>{b.sealed ? "🔒 Sealed" : b.amount_paise != null ? formatInr(b.amount_paise) : "—"}</TableCell>
                    <TableCell>{b.completion_weeks ?? "—"}</TableCell>
                    <TableCell>{b.sealed ? "🔒 Sealed" : b.notes ?? "—"}</TableCell>
                    <TableCell>
                      {!b.sealed && tender.status !== "AWARDED" && contractorId && (
                        <AwardTenderButton tenderId={tender.id} contractorId={contractorId} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(bids ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No bids submitted yet.
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
