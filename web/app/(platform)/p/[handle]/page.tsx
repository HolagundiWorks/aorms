import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { isIdentityVerified } from "../../../../lib/platform/identity-verified";
import { getSignedFileUrl, getWorkHistory } from "../../../../lib/actions/account-profile";

// Opt-in profiles are not search-indexed by default: the owner chose to share a link, not to be crawled.
export const metadata: Metadata = { robots: { index: false, follow: false } };

const HANDLE = /^AORMS-U-[A-Z0-9]+$/;

/**
 * Public verified profile (roadmap P2). Renders only when the account (a) has a verified
 * AORMS Identity and (b) switched `public_profile` on — both re-checked every request, so
 * revoking either hides the page at once. Anything else is a plain 404 (no hint whether the
 * handle exists). Shows name, photo, COA number, qualifications, certificate titles/issuers
 * and Studio history; never files, contact details or internal ids. Print to PDF = CV.
 */
export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await params;
  const handle = decodeURIComponent(raw).toUpperCase();
  if (!HANDLE.test(handle)) notFound();

  const svc = createPlatformServiceRoleClient();
  const { data: account } = await svc.from("accounts").select("id, public_id, full_name").eq("public_id", handle).maybeSingle();
  if (!account) notFound();

  const { data: details } = await svc
    .from("account_profile_details")
    .select("nickname, degree, qualification, coa_number, additional_qualifications, photo_key, public_profile")
    .eq("account_id", account.id)
    .maybeSingle();
  if (!details?.public_profile || !(await isIdentityVerified(account.id))) notFound();

  const [{ data: certs }, history, photoUrl] = await Promise.all([
    svc.from("account_certificates").select("id, title, issuer, issued_on").eq("account_id", account.id).order("issued_on", { ascending: false }),
    getWorkHistory(account.id, account.public_id),
    details.photo_key ? getSignedFileUrl(details.photo_key) : Promise.resolve(null),
  ]);

  return (
    <Grid>
      <Column sm={4} md={8} lg={10}>
        <Stack gap={6}>
          <Tile>
            <Stack gap={4} orientation="horizontal" style={{ alignItems: "center" }}>
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={account.full_name} style={{ width: "6rem", height: "6rem", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: "6rem", height: "6rem", borderRadius: "50%", background: "var(--cds-layer-accent)", flexShrink: 0 }} />
              )}
              <Stack gap={2}>
                <h1 className="cds--type-heading-05">{account.full_name}</h1>
                <Stack gap={3} orientation="horizontal" style={{ flexWrap: "wrap" }}>
                  <Tag type="purple" size="md">
                    Verified Identity
                  </Tag>
                  <Tag type="cool-gray" size="md">
                    {account.public_id}
                  </Tag>
                  {details.coa_number && (
                    <Tag type="gray" size="md">
                      COA {details.coa_number}
                    </Tag>
                  )}
                </Stack>
                {(details.degree || details.qualification) && <p className="cds--type-body-01">{[details.degree, details.qualification].filter(Boolean).join(" — ")}</p>}
              </Stack>
            </Stack>
          </Tile>

          {details.additional_qualifications && (
            <div>
              <h2 className="cds--type-heading-02" style={{ marginBottom: "0.75rem" }}>
                Summary
              </h2>
              <p className="cds--type-body-01" style={{ whiteSpace: "pre-wrap" }}>
                {details.additional_qualifications}
              </p>
            </div>
          )}

          {history.length > 0 && (
            <div>
              <h2 className="cds--type-heading-02" style={{ marginBottom: "0.75rem" }}>
                Experience
              </h2>
              <Stack gap={4}>
                {history.map((e) => (
                  <div key={e.membershipId} style={{ borderLeft: "0.25rem solid var(--cds-border-subtle)", paddingLeft: "1rem" }}>
                    <strong className="cds--type-body-compact-02">{e.studioName}</strong>
                    <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                      {e.role} · {e.startedAt ? new Date(e.startedAt).getFullYear() : "—"} – {e.isCurrent ? "Present" : e.endedAt ? new Date(e.endedAt).getFullYear() : "—"}
                    </p>
                  </div>
                ))}
              </Stack>
            </div>
          )}

          {(certs ?? []).length > 0 && (
            <div>
              <h2 className="cds--type-heading-02" style={{ marginBottom: "0.75rem" }}>
                Certifications
              </h2>
              <Stack gap={3}>
                {(certs ?? []).map((c) => (
                  <div key={c.id} style={{ borderLeft: "0.25rem solid var(--cds-border-subtle)", paddingLeft: "1rem" }}>
                    <strong className="cds--type-body-compact-02">{c.title}</strong>
                    <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                      {[c.issuer, c.issued_on ? new Date(c.issued_on).getFullYear() : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                ))}
              </Stack>
            </div>
          )}
        </Stack>
      </Column>
    </Grid>
  );
}
