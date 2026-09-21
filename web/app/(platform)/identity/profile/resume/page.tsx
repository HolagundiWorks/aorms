import NextLink from "next/link";
import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { createClient as createPlatformClient } from "../../../../../lib/platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../../lib/platform/service";
import { getSignedFileUrl, getWorkHistory } from "../../../../../lib/actions/account-profile";
import { PageHeader } from "../../../../../components/aorms/PageHeader";
import { IdentityPortalHeader } from "../../../../../components/aorms/platform/PortalHeaders";
import { ResumePrintButton } from "../../../../../components/aorms/platform/ResumePrintButton";

const CERTIFICATE_KIND_LABEL: Record<string, string> = {
  DEGREE: "Degree certificate",
  SOFTWARE: "Software certification",
  OTHER: "Other certification",
};

/**
 * AORMS Identity — resume/CV view (2026-09-20, explicit user request: "add
 * profile page in identity ... builds a linkedin profile page kind of a
 * page that shows works as a resume and cv page"). Same data /identity/
 * profile already collects and edits (photo, degree/qualification/COA
 * number/additional qualifications, certificates, auto-generated work
 * history from studio_memberships) — this is a read-only, print-friendly
 * presentation of it, not a new data model or a new write path.
 *
 * Explicitly private (signed-in owner only, same account-resolution gate
 * as /identity/profile) — not a public share-by-link page like a real
 * LinkedIn profile would be. That was a deliberate scope decision: a
 * public route would expose name/photo/COA number/work history to the
 * open internet with no auth, which is a real privacy question the
 * account holder didn't ask to opt into here.
 *
 * "Save as PDF" via the browser's own print dialog (ResumePrintButton)
 * doubles as CV export — no server-side PDF rendering needed for this
 * pass, unlike the office-hub side's WeasyPrint pipeline.
 */
export default async function IdentityResumePage() {
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
            <PageHeader title="Resume / CV" description="Sign in to the AORMS Platform first." />
            <NextLink href="/identity" className="cds--link">
              Back to AORMS Identity →
            </NextLink>
          </Column>
        </Grid>
      </>
    );
  }

  const platformService = createPlatformServiceRoleClient();
  const { data: account } = await platformService
    .from("accounts")
    .select("id, public_id, full_name")
    .eq("id", platformUser.id)
    .maybeSingle();

  if (!account) {
    return (
      <>
        <IdentityPortalHeader />
        <Grid>
          <Column sm={4} md={8} lg={8}>
            <PageHeader title="Resume / CV" description="This login isn't an AORMS Identity account." />
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
      .order("issued_on", { ascending: false }),
    getWorkHistory(account.id, account.public_id),
  ]);

  const photoUrl = profileDetails?.photo_key ? await getSignedFileUrl(profileDetails.photo_key) : null;
  const certificateFileUrls = await Promise.all(
    (certificateRows ?? []).map((c) => (c.file_key ? getSignedFileUrl(c.file_key) : Promise.resolve(null))),
  );

  return (
    <>
      <div className="aorms-print-hide">
        <IdentityPortalHeader />
      </div>
      <Grid>
        <Column sm={4} md={8} lg={10}>
          <div className="aorms-print-hide">
            <PageHeader
              title="Resume / CV"
              description="A read-only, printable view of your AORMS Identity profile."
              actions={
                <Stack gap={4} orientation="horizontal">
                  <NextLink href="/identity/profile" className="cds--type-body-01">
                    ← Edit profile
                  </NextLink>
                  <ResumePrintButton />
                </Stack>
              }
            />
          </div>

          <Stack gap={6}>
            <Tile>
              <Stack gap={4} orientation="horizontal" style={{ alignItems: "center" }}>
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={account.full_name}
                    style={{ width: "6rem", height: "6rem", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: "6rem",
                      height: "6rem",
                      borderRadius: "50%",
                      background: "var(--cds-layer-accent)",
                      flexShrink: 0,
                    }}
                  />
                )}
                <Stack gap={2}>
                  <h1 className="cds--type-heading-05">{account.full_name}</h1>
                  {profileDetails?.nickname && (
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      {profileDetails.nickname}
                    </p>
                  )}
                  <Stack gap={3} orientation="horizontal" style={{ flexWrap: "wrap" }}>
                    <Tag type="cool-gray" size="md">
                      {account.public_id}
                    </Tag>
                    {profileDetails?.coa_number && (
                      <Tag type="purple" size="md">
                        COA {profileDetails.coa_number}
                      </Tag>
                    )}
                  </Stack>
                  {(profileDetails?.degree || profileDetails?.qualification) && (
                    <p className="cds--type-body-01">{[profileDetails?.degree, profileDetails?.qualification].filter(Boolean).join(" — ")}</p>
                  )}
                </Stack>
              </Stack>
            </Tile>

            {profileDetails?.additional_qualifications && (
              <div>
                <h2 className="cds--type-heading-02" style={{ marginBottom: "0.75rem" }}>
                  Summary
                </h2>
                <p className="cds--type-body-01" style={{ whiteSpace: "pre-wrap" }}>
                  {profileDetails.additional_qualifications}
                </p>
              </div>
            )}

            <div>
              <h2 className="cds--type-heading-02" style={{ marginBottom: "0.75rem" }}>
                Experience
              </h2>
              {workHistory.length === 0 ? (
                <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                  No Studio history yet.
                </p>
              ) : (
                <Stack gap={4}>
                  {workHistory.map((entry) => (
                    <div key={entry.membershipId} style={{ borderLeft: "0.25rem solid var(--cds-border-subtle)", paddingLeft: "1rem" }}>
                      <Stack gap={1} orientation="horizontal" style={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                        <strong className="cds--type-body-compact-02">{entry.studioName}</strong>
                        <Tag type={entry.role === "OWNER" ? "purple" : "gray"} size="sm">
                          {entry.role}
                        </Tag>
                      </Stack>
                      <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                        {entry.startedAt ? new Date(entry.startedAt).toLocaleDateString() : "—"}
                        {" – "}
                        {entry.isCurrent ? "Present" : entry.endedAt ? new Date(entry.endedAt).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  ))}
                </Stack>
              )}
            </div>

            {(certificateRows ?? []).length > 0 && (
              <div>
                <h2 className="cds--type-heading-02" style={{ marginBottom: "0.75rem" }}>
                  Certifications
                </h2>
                <Stack gap={3}>
                  {(certificateRows ?? []).map((c, i) => (
                    <div key={c.id} style={{ borderLeft: "0.25rem solid var(--cds-border-subtle)", paddingLeft: "1rem" }}>
                      <Stack gap={1} orientation="horizontal" style={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                        <strong className="cds--type-body-compact-02">{c.title}</strong>
                        <Tag type="gray" size="sm">
                          {CERTIFICATE_KIND_LABEL[c.kind] ?? c.kind}
                        </Tag>
                      </Stack>
                      <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                        {[c.issuer, c.issued_on ? new Date(c.issued_on).toLocaleDateString() : null].filter(Boolean).join(" · ")}
                      </p>
                      {certificateFileUrls[i] && (
                        <a href={certificateFileUrls[i] ?? undefined} target="_blank" rel="noreferrer" className="cds--link cds--type-helper-text-01 aorms-print-hide">
                          View file →
                        </a>
                      )}
                    </div>
                  ))}
                </Stack>
              </div>
            )}
          </Stack>
        </Column>
      </Grid>
    </>
  );
}
