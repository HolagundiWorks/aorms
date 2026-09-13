"use server";

/**
 * Esti Mobile Inference — device registration (2026-09-13), per the
 * attached development guide's § 8 Device Authentication: "Do not
 * authenticate devices using a shared API key." Each device gets its own
 * random secret, generated here, hashed before storage, and returned to
 * the caller exactly once (the standard "shown once, never retrievable
 * again" API-key UX — same reasoning as a cloud provider's own API-key
 * issuance flow). The device gateway service (`device-gateway/`) is the
 * only thing that ever checks a device's secret again after this point,
 * by hashing what the device presents and comparing to
 * `device_secret_hash`.
 *
 * Registration happens here (staff-authenticated, RLS-backed) rather
 * than by having a phone self-register on first connect — a device
 * shouldn't be able to grant itself access to Esti; a staff member
 * deciding to add one is the actual security boundary.
 */
import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type RegisterDeviceResult = { error: string } | { deviceId: string; secret: string };

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export async function registerAiDevice(deviceName: string, deviceType: string): Promise<RegisterDeviceResult> {
  const name = deviceName.trim();
  if (!name) return { error: "Device name is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  // Human-readable but still unique enough for this scale (a handful of
  // devices, not a fleet) — matches the guide's own "esti-a10s-001" style.
  const deviceId = `esti-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${randomBytes(2).toString("hex")}`;
  const secret = randomBytes(24).toString("base64url");

  const { error } = await supabase.from("ai_devices").insert({
    device_id: deviceId,
    device_name: name,
    device_type: deviceType || "android",
    device_secret_hash: hashSecret(secret),
    status: "offline",
  });
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "ai_device",
    p_entity_id: deviceId,
    p_action: "CREATE",
    p_before: null,
    p_after: { deviceName: name, deviceType },
  });

  revalidatePath("/ai-devices");
  return { deviceId, secret };
}

export async function deleteAiDevice(deviceId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("ai_devices").delete().eq("device_id", deviceId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "ai_device",
    p_entity_id: deviceId,
    p_action: "DELETE",
    p_before: null,
    p_after: null,
  });

  revalidatePath("/ai-devices");
  return {};
}
