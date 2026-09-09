import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { getCurrentPlatformAccount } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { UpdateLicenceForm } from "../../../../components/aorms/platform/UpdateLicenceForm";
import { PageHeader } from "../../../../components/aorms/PageHeader";

function isLicenceActive(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

/**
 * Every studio's licence, admin-overridable — the counterpart to
 * app/(platform)/licences/page.tsx (owner self-view, Razorpay checkout
 * only). UpdateLicenceForm now calls adminUpdateLicence
 * (lib/actions/platform-payments.ts), gated by both an app-level is_admin
 * check and the "licences: admin update" RLS policy.
 */
export default async function AdminLicencesPage() {
  const account = await getCurrentPlatformAccount();
  if (!account?.is_admin) return <AdminAccessDenied title="Licences" />;

  const platformService = createPlatformServiceRoleClient();
  const { data: licences } = await platformService
    .from("licences")
    .select("studio_id, plan, seats, expires_at, studios(name, public_id)")
    .order("expires_at", { ascending: true, nullsFirst: false });

  return (
    <Grid>
      <Column sm={4} md={8} lg={10}>
        <PageHeader title="Licences" description="Every studio's licence — override plan, seats, or expiry directly." />

        <Stack gap={5}>
          {(licences ?? []).map((l) => {
            const studio = (Array.isArray(l.studios) ? l.studios[0] : l.studios) as { name: string; public_id: string } | null;
            if (!studio) return null;
            const active = isLicenceActive(l.expires_at);

            return (
              <Tile key={l.studio_id}>
                <Stack gap={4}>
                  <Stack gap={2} orientation="horizontal">
                    <h2 className="cds--type-heading-02">{studio.name}</h2>
                    <Tag type="cool-gray" size="sm">
                      {studio.public_id}
                    </Tag>
                    <Tag type={l.plan === "PREMIUM" ? "purple" : l.plan === "STANDARD" ? "blue" : "gray"} size="sm">
                      {l.plan}
                    </Tag>
                    <Tag type={active ? "green" : "red"} size="sm">
                      {active ? "ACTIVE" : "EXPIRED"}
                    </Tag>
                  </Stack>
                  <UpdateLicenceForm
                    key={`${l.plan}-${l.seats}-${l.expires_at}`}
                    studioId={l.studio_id}
                    licence={{ plan: l.plan, seats: l.seats, expires_at: l.expires_at }}
                  />
                </Stack>
              </Tile>
            );
          })}
          {(licences ?? []).length === 0 && (
            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
              No studios yet.
            </p>
          )}
        </Stack>
      </Column>
    </Grid>
  );
}
