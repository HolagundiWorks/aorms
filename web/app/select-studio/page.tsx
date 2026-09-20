import { redirect } from "next/navigation";
import { Column, Grid, Stack } from "@carbon/react";
import { createClient } from "../../lib/supabase/server";
import { getStudioAccessOptions } from "../../lib/studio-access";
import { SwitchFirmTile, JoinStudioTile } from "../../components/aorms/StudioAccessTiles";

/**
 * Multi-tenancy studio picker (migration 0055) — reached from
 * lib/actions/auth.ts's resolveSignInDestination() whenever a signed-in
 * profile has more than one firm membership, or is linked to a Platform
 * Identity account with a Studio it hasn't joined/provisioned in Office
 * Hub yet. Deliberately outside the `(app)` route group: a profile
 * landing here may have no active firm_id at all yet, and `(app)/layout.
 * tsx`'s own firm/project queries assume one already exists.
 */
export default async function SelectStudioPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const { firms, joinable } = await getStudioAccessOptions();

  return (
    <div style={{ minHeight: "100vh", padding: "3rem 1rem" }}>
      <Grid>
        <Column sm={4} md={6} lg={8} style={{ margin: "0 auto" }}>
          <Stack gap={6}>
            <div>
              <img src="/aorms-logo.png" alt="AORMS" style={{ height: "28px", width: "auto", marginBottom: "1.5rem" }} />
              <h1 className="cds--type-heading-04">Choose a studio</h1>
              <p className="cds--type-body-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
                Your account has access to more than one studio — pick which one to open.
              </p>
            </div>

            {firms.length > 0 ? (
              <div style={{ maxHeight: "45vh", overflowY: "auto" }}>
                <Stack gap={3}>
                  {firms.map((f) => (
                    <SwitchFirmTile key={f.firmId} firmId={f.firmId} name={f.name} role={f.role} />
                  ))}
                </Stack>
              </div>
            ) : null}

            {joinable.length > 0 ? (
              <Stack gap={3}>
                <p className="cds--type-heading-compact-02">Available to set up</p>
                <div style={{ maxHeight: "45vh", overflowY: "auto" }}>
                  <Stack gap={3}>
                    {joinable.map((s) => (
                      <JoinStudioTile key={s.publicId} publicId={s.publicId} name={s.name} />
                    ))}
                  </Stack>
                </div>
              </Stack>
            ) : null}

            {firms.length === 0 && joinable.length === 0 ? (
              <p className="cds--type-body-01">No studios found for this account yet — contact your studio's owner for an invite.</p>
            ) : null}
          </Stack>
        </Column>
      </Grid>
    </div>
  );
}
