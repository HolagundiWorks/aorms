import { redirect } from "next/navigation";
import { Stack } from "@carbon/react";
import { createClient } from "../../lib/supabase/server";
import { getStudioAccessOptions } from "../../lib/studio-access";
import { SwitchFirmTile, JoinStudioTile } from "../../components/aorms/StudioAccessTiles";
import { AuthHead } from "../../components/aorms/AuthHead";
import { TitleBlock } from "../../components/aorms/TitleBlock";
import { BrandWatermark } from "../../components/aorms/BrandWatermark";

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
    <>
      <div className="aorms-auth">
          <Stack gap={6}>
            <AuthHead title={<>Choose a studio</>} description={<>Your account has access to more than one studio — pick which one to open.</>} result="The right studio open, ready for work." />

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
        </div>
      <TitleBlock companyName="" />
      <BrandWatermark />
    </>
  );
}
