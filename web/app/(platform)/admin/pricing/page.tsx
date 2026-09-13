import { Column, Grid, InlineNotification, Stack, Tile } from "@carbon/react";
import { getCurrentPlatformSessionAccount, isSuperAdmin } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { SetPricingForm } from "../../../../components/aorms/platform/SetPricingForm";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { SysDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

/**
 * Edits plan_pricing (platform/supabase/migrations/0017_identity_and_
 * firm_plans.sql, replacing the original 0010_payments.sql placeholder
 * STANDARD/PREMIUM per-seat rows) — the real AORMS Identity (₹599/year
 * flat) and AORMS Firm (₹1,999/year base + ₹199/user/month, billed as one
 * annual lump sum) prices. Nothing elsewhere in the app hardcodes a price.
 */
export default async function AdminPricingPage() {
  const account = await getCurrentPlatformSessionAccount();
  if (!isSuperAdmin(account)) return <AdminAccessDenied title="Pricing" />;

  const platformService = createPlatformServiceRoleClient();
  const { data: pricing } = await platformService
    .from("plan_pricing")
    .select("plan, base_price_paise, price_per_seat_monthly_paise")
    .order("plan");

  return (
    <>
      <SysDexPortalHeader />
      <Grid>
      <Column sm={4} md={8} lg={8}>
        <PageHeader
          title="Pricing"
          description="Base annual fee, plus a per-seat-per-month rate for AORMS Firm, for each plan."
        />

        <InlineNotification
          kind="info"
          title="Annual billing, not recurring auto-debit"
          subtitle="AORMS Firm's per-seat rate is displayed as a monthly figure but charged as one annual lump sum through the existing one-time Razorpay order flow — there's no recurring/auto-debit billing in this codebase yet."
          lowContrast
          hideCloseButton
          style={{ marginBottom: "1.5rem" }}
        />

        <Stack gap={5}>
          {(pricing ?? []).map((p) => (
            <Tile key={p.plan}>
              <SetPricingForm
                key={`${p.base_price_paise}-${p.price_per_seat_monthly_paise}`}
                plan={p.plan as "AORMS_IDENTITY" | "AORMS_FIRM"}
                basePricePaise={p.base_price_paise}
                pricePerSeatMonthlyPaise={p.price_per_seat_monthly_paise}
              />
            </Tile>
          ))}
        </Stack>
      </Column>
    </Grid>
    </>
  );
}
