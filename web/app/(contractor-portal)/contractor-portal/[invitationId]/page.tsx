import { notFound } from "next/navigation";
import { Column, Grid, Tag } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { ContractorBidForm } from "../../../../components/aorms/ContractorBidForm";
import { ContractorDeclineButton } from "../../../../components/aorms/ContractorDeclineButton";
import { markInvitationViewed } from "../../../../lib/actions/contractor-portal";

const STATUS_TAG: Record<string, "cool-gray" | "blue" | "green" | "red"> = {
  INVITED: "cool-gray",
  VIEWED: "blue",
  SUBMITTED: "green",
  DECLINED: "red",
};

/**
 * Contractor Portal invitation detail — port of backend/src/modules/
 * contractor/portal.ts's `getInvitation` (stamps VIEWED on first open,
 * same as the old router) + `submitBid`/`decline`. `projectDetail`
 * (phases/drawings/transmittals), running bills, project team, and
 * coordination-ticket submissions are deferred — see migration 0021's
 * header comment.
 */
export default async function ContractorInvitationDetailPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  const supabase = await createClient();

  const { data: invitation, error } = await supabase
    .from("tender_invitations")
    .select(
      "id, status, invited_at, viewed_at, tenders(id, title, category, scope, status, due_date, instructions, project_offices(ref, title))",
    )
    .eq("id", invitationId)
    .maybeSingle();

  if (error) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load this invitation: {error.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!invitation) notFound();

  if (invitation.status === "INVITED") {
    void markInvitationViewed(invitationId);
  }

  const tender = Array.isArray(invitation.tenders) ? invitation.tenders[0] : invitation.tenders;
  const project = tender
    ? Array.isArray(tender.project_offices)
      ? tender.project_offices[0]
      : tender.project_offices
    : null;

  const { data: bid } = await supabase
    .from("tender_bids")
    .select("amount_paise, completion_weeks, notes")
    .eq("invitation_id", invitationId)
    .maybeSingle();

  const canBid = tender?.status === "OPEN" && invitation.status !== "DECLINED";

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {project?.title ?? "—"} ({project?.ref ?? "—"})
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "0.5rem" }}>
          {tender?.title ?? "Tender"}
        </h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1.5rem" }}>
          <Tag type={STATUS_TAG[invitation.status] ?? "cool-gray"} size="sm">
            {invitation.status}
          </Tag>
          <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            {tender?.category ?? "—"} · Due {tender?.due_date ?? "—"}
          </span>
        </div>

        {tender?.scope && (
          <>
            <h2 className="cds--type-heading-03" style={{ marginBottom: "0.5rem" }}>
              Scope
            </h2>
            <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", whiteSpace: "pre-wrap" }}>
              {tender.scope}
            </p>
          </>
        )}
        {tender?.instructions && (
          <>
            <h2 className="cds--type-heading-03" style={{ marginBottom: "0.5rem" }}>
              Instructions
            </h2>
            <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", whiteSpace: "pre-wrap" }}>
              {tender.instructions}
            </p>
          </>
        )}

        {canBid ? (
          <>
            <h2 className="cds--type-heading-03" style={{ margin: "1.5rem 0 1rem" }}>
              {bid ? "Your bid" : "Submit your bid"}
            </h2>
            <ContractorBidForm
              invitationId={invitationId}
              existing={bid ? { amountPaise: bid.amount_paise, completionWeeks: bid.completion_weeks, notes: bid.notes } : null}
            />
            {invitation.status !== "SUBMITTED" && (
              <div style={{ marginTop: "1rem" }}>
                <ContractorDeclineButton invitationId={invitationId} />
              </div>
            )}
          </>
        ) : (
          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            {invitation.status === "DECLINED"
              ? "You declined this invitation."
              : "Bidding is closed for this tender."}
          </p>
        )}
      </Column>
    </Grid>
  );
}
