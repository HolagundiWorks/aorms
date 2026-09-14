import { Column, Grid, Stack, Tile } from "@carbon/react";
import { getCurrentPlatformSessionAccount, isSuperAdmin } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { SetPricingForm } from "../../../../components/aorms/platform/SetPricingForm";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { SysDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

/**
 * Edits plan_pricing — five flat prices as of migration
 * 0033_free_studio_professional_tiers.sql (the real pricing restructure,
 * 2026-09-14 — replacing TRIAL/PRO/ENTERPRISE with a real
 * Free/Studio/Professional/Enterprise model): AORMS Identity (₹199
 * one-time, after 100 usage-hours), Free (₹0, permanent — not a
 * countdown), Studio (₹24,990/year), Professional (₹49,990/year),
 * Enterprise (₹1,00,000/year "starting at" — a reference figure only;
 * Enterprise no longer sells through self-serve Razorpay checkout at
 * all, see lib/actions/platform-payments.ts's header comment). No
 * per-seat billing on any plan. Nothing elsewhere in the app hardcodes a
 * price — this page is the one place it lives.
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
                plan={p.plan as "AORMS_IDENTITY" | "FREE" | "STUDIO" | "PROFESSIONAL" | "ENTERPRISE"}
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
