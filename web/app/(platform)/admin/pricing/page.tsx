import { Column, Grid, Stack, Tile } from "@carbon/react";
import { getCurrentPlatformSessionAccount, isSuperAdmin } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { SetPricingForm } from "../../../../components/aorms/platform/SetPricingForm";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { SysDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

/**
 * Edits plan_pricing — three flat prices as of migration
 * 0019_studio_pro_enterprise_tiers.sql (replacing the single AORMS_FIRM
 * tier from 0017 with Pro/Enterprise): AORMS Identity (₹199 one-time,
 * after 100 usage-hours), Studio Pro (₹1,999/year), Studio Enterprise
 * (₹14,999/year, 20+ team members). No per-seat billing on any plan
 * anymore. Nothing elsewhere in the app hardcodes a price.
 */
export default async function AdminPricingPage() {
  const account = await getCurrentPlatformSessionAccount();
  if (!isSuperAdmin(account)) return <AdminAccessDenied title="Pricing" />;

  const platformService = createPlatformServiceRoleClient();
  const { data: pricing } = await platformService.from("plan_pricing").select("plan, base_price_paise").order("plan");

  return (
    <>
      <SysDexPortalHeader />
      <Grid>
      <Column sm={4} md={8} lg={8}>
        <PageHeader title="Pricing" description="A flat fee for each plan — no per-seat billing on any of them." />

        <Stack gap={5}>
          {(pricing ?? []).map((p) => (
            <Tile key={p.plan}>
              <SetPricingForm
                key={p.base_price_paise}
                plan={p.plan as "AORMS_IDENTITY" | "PRO" | "ENTERPRISE"}
                basePricePaise={p.base_price_paise}
              />
            </Tile>
          ))}
        </Stack>
      </Column>
    </Grid>
    </>
  );
}
