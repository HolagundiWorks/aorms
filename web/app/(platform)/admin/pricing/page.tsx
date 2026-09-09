import { Column, Grid, InlineNotification, Stack, Tile } from "@carbon/react";
import { getCurrentPlatformAccount } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { SetPricingForm } from "../../../../components/aorms/platform/SetPricingForm";
import { PageHeader } from "../../../../components/aorms/PageHeader";

/**
 * Edits plan_pricing (platform/supabase/migrations/0010_payments.sql) —
 * the PLACEHOLDER per-seat prices seeded by that migration. This is where
 * real prices get set before this goes live with real money; nothing
 * elsewhere in the app hardcodes a price.
 */
export default async function AdminPricingPage() {
  const account = await getCurrentPlatformAccount();
  if (!account?.is_admin) return <AdminAccessDenied title="Pricing" />;

  const platformService = createPlatformServiceRoleClient();
  const { data: pricing } = await platformService.from("plan_pricing").select("plan, price_per_seat_paise").order("plan");

  return (
    <Grid>
      <Column sm={4} md={8} lg={8}>
        <PageHeader title="Pricing" description="Per-seat price for each paid plan, per 30-day period." />

        <InlineNotification
          kind="warning"
          title="Placeholder prices"
          subtitle="These were seeded as placeholders when payments were built — confirm real prices here before relying on checkout for real revenue."
          lowContrast
          hideCloseButton
          style={{ marginBottom: "1.5rem" }}
        />

        <Stack gap={5}>
          {(pricing ?? []).map((p) => (
            <Tile key={p.plan}>
              <SetPricingForm key={p.price_per_seat_paise} plan={p.plan as "STANDARD" | "PREMIUM"} pricePerSeatPaise={p.price_per_seat_paise} />
            </Tile>
          ))}
        </Stack>
      </Column>
    </Grid>
  );
}
