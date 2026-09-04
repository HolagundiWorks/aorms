import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewPackageInviteForm } from "../../../../components/aorms/NewPackageInviteForm";
import { OpenBidsButton, AwardBidButton } from "../../../../components/aorms/PackageBidActions";

/**
 * Bids are read from pmc_package_bids_sealed (migration 0014), NOT the
 * base pmc_package_bids table — the view is the actual seal enforcement
 * (amount_paise/cover_note null while sealed). There's no bid-submission
 * form here: in the current live system, submission only ever happened
 * through pmc/contractorPortal.ts, found dead/unreachable and deleted
 * this session — so nothing in the real app creates these rows either.
 */
export default async function PmcPackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: pkg, error: pkgError },
    { data: invites },
    { data: bids, error: bidsError },
    { data: contractors },
  ] = await Promise.all([
    supabase.from("pmc_packages").select("id, ref, title, trade, status, bids_opened_at, contractor_id, project_offices(title)").eq("id", id).maybeSingle(),
    supabase.from("pmc_package_invites").select("id, status, contractors(id, name)").eq("package_id", id),
    supabase
      .from("pmc_package_bids_sealed")
      .select("id, contractor_id, amount_paise, cover_note, status, sealed, submitted_at")
      .eq("package_id", id)
      .order("submitted_at", { ascending: false }),
    supabase.from("contractors").select("id, name"),
  ]);

  if (pkgError) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load package: {pkgError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!pkg) notFound();

  const project = Array.isArray(pkg.project_offices) ? pkg.project_offices[0] : (pkg.project_offices as { title: string } | null);
  const contractorName = new Map((contractors ?? []).map((c) => [c.id, c.name]));
  const invitedContractorIds = new Set((invites ?? []).map((i) => (Array.isArray(i.contractors) ? i.contractors[0]?.id : (i.contractors as { id: string } | null)?.id)));
  const availableContractors = (contractors ?? []).filter((c) => !invitedContractorIds.has(c.id));

  function formatInr(paise: number): string {
    return `₹${(paise / 100).toLocaleString("en-IN")}`;
  }

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {pkg.ref} · {project?.title ?? "—"}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "1.5rem" }}>
          {pkg.title}
        </h1>

        <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
          Invited contractors
        </h2>
        <NewPackageInviteForm packageId={pkg.id} contractors={availableContractors} />
        <div style={{ marginBottom: "2rem" }}>
          <Table aria-label="Invites" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Contractor</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(invites ?? []).map((i) => {
                const contractor = Array.isArray(i.contractors) ? i.contractors[0] : (i.contractors as { name: string } | null);
                return (
                  <TableRow key={i.id}>
                    <TableCell>{contractor?.name ?? "—"}</TableCell>
                    <TableCell>{i.status}</TableCell>
                  </TableRow>
                );
              })}
              {(invites ?? []).length === 0 && (
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
          Bids {pkg.bids_opened_at ? <Tag type="green" size="sm">Open</Tag> : <Tag type="gray" size="sm">Sealed</Tag>}
        </h2>
        {!pkg.bids_opened_at && <OpenBidsButton packageId={pkg.id} />}
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
                <TableHeader>Cover note</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {(bids ?? []).map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{contractorName.get(b.contractor_id) ?? "—"}</TableCell>
                  <TableCell>{b.sealed ? "🔒 Sealed" : b.amount_paise != null ? formatInr(b.amount_paise) : "—"}</TableCell>
                  <TableCell>{b.sealed ? "🔒 Sealed" : b.cover_note ?? "—"}</TableCell>
                  <TableCell>{b.status}</TableCell>
                  <TableCell>
                    {!b.sealed && b.status === "SUBMITTED" && pkg.status !== "AWARDED" && (
                      <AwardBidButton packageId={pkg.id} bidId={b.id} contractorId={b.contractor_id} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
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
