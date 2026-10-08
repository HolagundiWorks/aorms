/**
 * AQC connected mode ("Pro") entitlement — the AORMS login is the licence (D4), so there is no key to check: a signed-in
 * hub user whose firm is linked to a Platform Studio on a paid plan that has not expired. FREE/trial or expired Studios
 * lose connected mode (D7) and AQC falls back to Community behaviour. Pure evaluation is separated from the Platform
 * lookup so it can be tested without a network.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient as createPlatformService } from "../platform/service";

export const CONNECTED_PLANS: ReadonlySet<string> = new Set(["STUDIO", "PROFESSIONAL", "ENTERPRISE"]);

export type EntitlementReason = "OK" | "NO_STUDIO" | "PLAN_NOT_CONNECTED" | "EXPIRED";
export type Entitlement = { connected: boolean; reason: EntitlementReason; plan: string | null; studioPublicId: string | null; expiresAt: string | null };

export function evaluateEntitlement(input: { studioPublicId: string | null; plan: string | null; expiresAt: string | null; now?: Date }): Entitlement {
  const { studioPublicId, plan, expiresAt } = input;
  const base = { plan, studioPublicId, expiresAt };
  if (!studioPublicId || !plan) return { connected: false, reason: "NO_STUDIO", ...base };
  if (expiresAt && new Date(expiresAt).getTime() < (input.now ?? new Date()).getTime()) return { connected: false, reason: "EXPIRED", ...base };
  if (!CONNECTED_PLANS.has(plan)) return { connected: false, reason: "PLAN_NOT_CONNECTED", ...base };
  return { connected: true, reason: "OK", ...base };
}

/**
 * Looks the firm's Studio link up as the caller (RLS: a member can read their own firm) and the Studio's licence on the
 * Platform with its service-role client — the only service-role use, read-only.
 */
export async function resolveEntitlement(supabase: SupabaseClient, firmId: string): Promise<Entitlement> {
  const { data: firm } = await supabase.from("firms").select("platform_studio_public_id").eq("id", firmId).maybeSingle();
  const handle = firm?.platform_studio_public_id ?? null;
  if (!handle) return evaluateEntitlement({ studioPublicId: null, plan: null, expiresAt: null });
  const platform = createPlatformService();
  const { data: studio } = await platform.from("studios").select("id").eq("public_id", handle).maybeSingle();
  if (!studio) return evaluateEntitlement({ studioPublicId: null, plan: null, expiresAt: null });
  const { data: licence } = await platform.from("licences").select("plan, expires_at").eq("studio_id", studio.id).maybeSingle();
  return evaluateEntitlement({ studioPublicId: handle, plan: licence?.plan ?? "FREE", expiresAt: licence?.expires_at ?? null });
}
