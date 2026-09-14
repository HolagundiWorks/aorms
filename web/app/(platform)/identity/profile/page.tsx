import NextLink from "next/link";
import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { createClient as createPlatformClient } from "../../../../lib/platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { getSignedFileUrl, getWorkHistory } from "../../../../lib/actions/account-profile";
import { AccountProfileForm } from "../../../../components/aorms/platform/AccountProfileForm";
import { AccountPhotoUpload } from "../../../../components/aorms/platform/AccountPhotoUpload";
import { AddCertificateForm } from "../../../../components/aorms/platform/AddCertificateForm";
import { CertificateList, type CertificateRow } from "../../../../components/aorms/platform/CertificateList";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { IdentityPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

/**
 * AORMS Identity — professional profile (2026-09-14, explicit user
 * request). Same account-resolution fix as /identity's own 2026-09-14
 * remediation — the Platform's own session first, no Office Hub link
 * required — since this page has the identical "reached directly via
 * identity.aorms.in" shape that bug affected.
 *
 * Three sections: editable info (name/nickname/degree/qualification/COA
 * number/photo/additional qualifications), certificates (degree +
 * software/other, each an optional uploaded file), and an auto-generated
 * work history — the last one is a pure read off `studio_memberships`
 * (see lib/actions/account-profile.ts's getWorkHistory()), not a form at
 * all, since every field it shows already exists the moment someone
 * joins/leaves a Studio elsewhere in the app.
 */
export default async function IdentityProfilePage() {
  const platformSupabase = await createPlatformClient();
  const {
    data: { user: platformUser },
  } = await platformSupabase.auth.getUser();

  if (!platformUser) {
    return (
      <>
        <IdentityPortalHeader />
        <Grid>
          <Column sm={4} md={8} lg={8}>
            <PageHeader title="My Profile" description="Sign in to the AORMS Platform first." />
            <NextLink href="/identity" className="cds--link">
              Back to AORMS Identity →
            </NextLink>
          </Column>
        </Grid>
      </>
    );
  }

  const platformService = createPlatformServiceRoleClient();
  const { data: account } = await platformService.from("accounts").select("id, public_id, full_name").eq("id", platformUser.id).maybeSingle();

  if (!account) {
    return (
      <>
        <IdentityPortalHeader />
        <Grid>
          <Column sm={4} md={8} lg={8}>
            <PageHeader title="My Profile" description="This login isn't an AORMS Identity account." />
          </Column>
        </Grid>
      </>
    );
  }

  const [{ data: profileDetails }, { data: certificateRows }, workHistory] = await Promise.all([
    platformService
      .from("account_profile_details")
      .select("nickname, degree, qualification, coa_number, additional_qualifications, photo_key")
      .eq("account_id", account.id)
      .maybeSingle(),
    platformService
      .from("account_certificates")
      .select("id, kind, title, issuer, issued_on, file_key")
      .eq("account_id", account.id)
      .order("created_at", { ascending: false }),
    getWorkHistory(account.id),
  ]);

  const photoUrl = profileDetails?.photo_key ? await getSignedFileUrl(profileDetails.photo_key) : null;

  const certificates: CertificateRow[] = await Promise.all(
    (certificateRows ?? []).map(async (c) => ({
      id: c.id,
      kind: c.kind as CertificateRow["kind"],
      title: c.title,
      issuer: c.issuer,
      issued_on: c.issued_on,
      fileUrl: c.file_key ? await getSignedFileUrl(c.file_key) : null,
    })),
  );

  return (
    <>
      <IdentityPortalHeader />
      <Grid>
        <Column sm={4} md={8} lg={10}>
          <PageHeader
            title="My Profile"
            description="Professional info, credentials, and your work history — carries with your portable AORMS Identity."
            actions={
              <Tag type="cool-gray" size="md">
                {account.public_id}
              </Tag>
            }
          />

          <Stack gap={6}>
            <NextLink href="/identity" className="cds--type-body-01">
              ← Back to AORMS Identity
            </NextLink>

            <div>
              <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                Photo
              </h2>
              <Tile>
                <AccountPhotoUpload photoUrl={photoUrl} />
              </Tile>
            </div>

            <div>
              <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                Info
              </h2>
              <Tile>
                <AccountProfileForm
                  profile={{
                    nickname: profileDetails?.nickname ?? null,
                    degree: profileDetails?.degree ?? null,
                    qualification: profileDetails?.qualification ?? null,
                    coa_number: profileDetails?.coa_number ?? null,
                    additional_qualifications: profileDetails?.additional_qualifications ?? null,
                  }}
                />
              </Tile>
            </div>

            <div>
              <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                Certificates
              </h2>
              <Stack gap={4}>
                <CertificateList certificates={certificates} />
                <Tile>
                  <h3 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                    Add a certificate
                  </h3>
                  <AddCertificateForm />
                </Tile>
              </Stack>
            </div>

            <div>
              <h2 className="cds--type-heading-02" style={{ marginBottom: "0.25rem" }}>
                Work history
              </h2>
              <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "1rem" }}>
                Auto-generated from your Studio memberships — nothing here is manually entered.
              </p>
              {workHistory.length === 0 ? (
                <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                  No Studio history yet.
                </p>
              ) : (
                <Stack gap={3}>
                  {workHistory.map((entry) => (
                    <Tile key={entry.membershipId}>
                      <Stack gap={2} orientation="horizontal" style={{ alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <NextLink href={`/studios/${entry.studioId}`}>
                            <strong>{entry.studioName}</strong>
                          </NextLink>{" "}
                          <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                            {entry.studioPublicId}
                          </span>
                          <div className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                            {entry.startedAt ? new Date(entry.startedAt).toLocaleDateString() : "—"}
                            {" – "}
                            {entry.isCurrent ? "Present" : entry.endedAt ? new Date(entry.endedAt).toLocaleDateString() : "—"}
                          </div>
                        </div>
                        <Tag type={entry.role === "OWNER" ? "purple" : "gray"} size="sm">
                          {entry.role}
                        </Tag>
                      </Stack>
                    </Tile>
                  ))}
                </Stack>
              )}
            </div>
          </Stack>
        </Column>
      </Grid>
    </>
  );
}
