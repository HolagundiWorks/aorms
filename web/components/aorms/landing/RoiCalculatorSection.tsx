import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../lib/platform/service";
import { RoiCalculator } from "./RoiCalculator";

/**
 * Server Component wrapper — reads the live PROFESSIONAL price from
 * `plan_pricing` so the ROI calculator's value/cost multiplier is never
 * a hardcoded number that drifts from what /admin/pricing actually sets.
 */
export async function RoiCalculatorSection() {
  const platformService = createPlatformServiceRoleClient();
  const { data: pricing } = await platformService.from("plan_pricing").select("base_price_paise").eq("plan", "PROFESSIONAL").maybeSingle();

  return <RoiCalculator professionalPricePaise={pricing?.base_price_paise ?? 0} />;
}
