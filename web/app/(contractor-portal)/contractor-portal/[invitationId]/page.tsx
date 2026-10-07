import { notFound } from "next/navigation";
import { Column, Grid, Tag } from "@carbon/react";
import { Calendar, Time, Receipt, Send, Layers } from "@carbon/icons-react";
import { createClient } from "../../../../lib/supabase/server";
import { placeholderFor } from "../../../../lib/projects/placeholder";
import { ContractorBidForm } from "../../../../components/aorms/ContractorBidForm";
import { ContractorDeclineButton } from "../../../../components/aorms/ContractorDeclineButton";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { KpiTile } from "../../../../components/aorms/KpiTile";
import { SheetFacts, SheetGroup, SheetPane, SheetSub } from "../../../../components/aorms/PortalSheet";
import { markInvitationViewed } from "../../../../lib/actions/contractor-portal";

const STATUS_TAG: Record<string, "cool-gray" | "blue" | "green" | "red"> = {
  INVITED: "cool-gray",
  VIEWED: "blue",
  SUBMITTED: "green",
  DECLINED: "red",
};

function formatInr(paise: number | null): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/**
 * Contractor Portal tender sheet — port of backend/src/modules/contractor/portal.ts's `getInvitation` (stamps VIEWED on
 * first open, same as the old router) + `submitBid`/`decline`. `projectDetail` (phases/drawings/transmittals), running
 * bills, project team, and coordination-ticket submissions are deferred — see migration 0021's header comment.
 *
 * Layout (2026-10-07): the same sheet as the Client and Collaborator portals — header → KPI rail (left, sticky) → the
 * project image → two numbered groups (The tender · Your bid) beside a side pane (the tender's terms and your bid).
 * A contractor cannot read `project_offices` under RLS, so the image is always the shared placeholder, picked from the
 * project ref `my_tender_projects()` returns; a real cover would need its own security-definer function.
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
      <Grid>
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

  // `project_offices` is not readable by a contractor under RLS (migration 0098's function returns the name).
  const { data: projectRows } = await supabase.rpc("my_tender_projects");
  const ownProject = (projectRows ?? []).find((r: { invitation_id: string }) => r.invitation_id === invitationId) as
    | { project_ref: string; project_title: string }
    | undefined;
  const projectRef = ownProject?.project_ref ?? project?.ref ?? tender?.title ?? invitationId;

  const { data: bid } = await supabase
    .from("tender_bids")
    .select("amount_paise, completion_weeks, notes")
    .eq("invitation_id", invitationId)
    .maybeSingle();

  const canBid = tender?.status === "OPEN" && invitation.status !== "DECLINED";

  const daysLeft = tender?.due_date ? Math.ceil((new Date(`${tender.due_date}T23:59:59`).getTime() - Date.now()) / 86_400_000) : null;
  const dueLabel = daysLeft == null ? "—" : daysLeft < 0 ? "Closed" : daysLeft === 0 ? "Today" : `${daysLeft} d`;

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader
          eyebrow={`${ownProject?.project_title ?? project?.title ?? "—"} (${ownProject?.project_ref ?? project?.ref ?? "—"})`}
          title={tender?.title ?? "Tender"}
          result="A bid you can submit with confidence."
        />

        <div className="aorms-rail-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 9rem)", gap: "1rem", marginBottom: "2rem" }}>
          <KpiTile label="Invitation" value={invitation.status.charAt(0) + invitation.status.slice(1).toLowerCase()} icon={Layers} />
          <KpiTile
            label="Time to bid"
            value={dueLabel}
            icon={Time}
            status={daysLeft != null && daysLeft >= 0 && daysLeft <= 3 && !bid ? "NEEDS_INTERVENTION" : undefined}
            href="#bid"
          />
          <KpiTile label="Due date" value={day(tender?.due_date ?? null)} icon={Calendar} />
          <KpiTile label="Your bid" value={bid ? formatInr(bid.amount_paise) : "—"} icon={Receipt} href="#bid" />
          <KpiTile label="Completion" value={bid?.completion_weeks != null ? `${bid.completion_weeks} wk` : "—"} icon={Send} href="#bid" />
        </div>

        <div className="aorms-cp__hero">
          <div className="aorms-pcard__media">
            {/* Static placeholder — plain <img>, not next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={placeholderFor(projectRef)} alt="" />
          </div>
        </div>

        <div className="aorms-cp">
          <div className="aorms-cp__main">
            <SheetGroup no={1} title="The tender" note="What is being tendered and how the studio wants bids">
              {tender?.scope && (
                <>
                  <SheetSub id="scope">Scope</SheetSub>
                  <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", whiteSpace: "pre-wrap" }}>
                    {tender.scope}
                  </p>
                </>
              )}
              {tender?.instructions && (
                <>
                  <SheetSub id="instructions">Instructions</SheetSub>
                  <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", whiteSpace: "pre-wrap" }}>
                    {tender.instructions}
                  </p>
                </>
              )}
              {!tender?.scope && !tender?.instructions && (
                <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                  The studio hasn&apos;t added a scope or instructions yet.
                </p>
              )}
            </SheetGroup>

            <SheetGroup no={2} title="Your bid" note="Your sealed lump-sum bid for this tender">
              <SheetSub id="bid">{bid ? "Your bid" : "Submit your bid"}</SheetSub>
              {canBid ? (
                <>
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
                  {invitation.status === "DECLINED" ? "You declined this invitation." : "Bidding is closed for this tender."}
                </p>
              )}
            </SheetGroup>
          </div>

          <aside className="aorms-cp__aside" aria-label="Tender summary">
            <SheetPane title="Status">
              <Tag type={STATUS_TAG[invitation.status] ?? "cool-gray"} size="sm">
                {invitation.status}
              </Tag>
              <p className="aorms-cp__pane-empty" style={{ marginBlockStart: "0.5rem" }}>
                {canBid ? (bid ? "Your bid is in. You can revise it until the tender closes." : "Your bid is still to be submitted.") : "Nothing more to do on this tender."}
              </p>
            </SheetPane>
            <SheetPane title="Tender">
              <SheetFacts
                facts={[
                  ["Category", tender?.category ?? "—"],
                  ["Due", day(tender?.due_date ?? null)],
                  ["Tender status", tender?.status?.replaceAll("_", " ") ?? "—"],
                  ["Invited", day(invitation.invited_at)],
                  ["First viewed", day(invitation.viewed_at)],
                ]}
              />
            </SheetPane>
            <SheetPane title="Your bid">
              {bid ? (
                <>
                  <span className="aorms-cp__invoice-amount">{formatInr(bid.amount_paise)}</span>
                  <p className="aorms-cp__pane-empty">{bid.completion_weeks != null ? `${bid.completion_weeks} weeks to complete` : "No completion time given"}</p>
                </>
              ) : (
                <p className="aorms-cp__pane-empty">No bid submitted yet.</p>
              )}
            </SheetPane>
          </aside>
        </div>
      </Column>
    </Grid>
  );
}
