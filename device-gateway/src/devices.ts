/**
 * Device registry access — the ONLY thing this gateway ever touches in
 * Supabase (never project/task/client data — see the guide's §13 RAG
 * Boundary and §18 "should not host ... project authorization ...
 * business logic"). Service-role key, since this is a trusted server
 * process, not the phone itself (§33: never place service-role
 * credentials on the device).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "node:crypto";

const SUPABASE_URL = process.env.AORMS_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.AORMS_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "AORMS_SUPABASE_URL and AORMS_SUPABASE_SERVICE_ROLE_KEY must both be set — " +
      "this gateway can't authenticate devices or record status without them.",
  );
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export type DeviceRow = {
  id: string;
  device_id: string;
  device_secret_hash: string;
  model_name: string | null;
  runtime: string | null;
};

/** Verifies a device's presented secret against its stored hash. Returns
 * the device row on success, null on any mismatch (unknown device_id or
 * wrong secret) — deliberately the same "null" for both so a caller can't
 * distinguish "device doesn't exist" from "wrong secret" (avoids leaking
 * which device_ids are registered). */
export async function authenticateDevice(deviceId: string, secret: string): Promise<DeviceRow | null> {
  const { data, error } = await supabase
    .from("ai_devices")
    .select("id, device_id, device_secret_hash, model_name, runtime")
    .eq("device_id", deviceId)
    .maybeSingle();
  if (error || !data) return null;
  if (!timingSafeEqualHex(hashSecret(secret), data.device_secret_hash)) return null;
  return data as DeviceRow;
}

export async function markDeviceOnline(
  deviceId: string,
  patch: { app_version?: string; capabilities?: Record<string, unknown>; model_name?: string; runtime?: string },
): Promise<void> {
  const { data } = await supabase.from("ai_devices").select("connection_count").eq("device_id", deviceId).maybeSingle();
  await supabase
    .from("ai_devices")
    .update({
      status: "online",
      connection_count: (data?.connection_count ?? 0) + 1,
      last_seen_at: new Date().toISOString(),
      last_error: null,
      ...(patch.app_version ? { app_version: patch.app_version } : {}),
      ...(patch.capabilities ? { capabilities: patch.capabilities } : {}),
      ...(patch.model_name ? { model_name: patch.model_name } : {}),
      ...(patch.runtime ? { runtime: patch.runtime } : {}),
    })
    .eq("device_id", deviceId);
}

export async function markDeviceOffline(deviceId: string): Promise<void> {
  await supabase.from("ai_devices").update({ status: "offline" }).eq("device_id", deviceId);
}

export async function markDeviceHeartbeat(deviceId: string): Promise<void> {
  await supabase.from("ai_devices").update({ last_seen_at: new Date().toISOString() }).eq("device_id", deviceId);
}

export async function markDeviceBusy(deviceId: string, busy: boolean): Promise<void> {
  await supabase
    .from("ai_devices")
    .update({ status: busy ? "busy" : "online", last_seen_at: new Date().toISOString() })
    .eq("device_id", deviceId);
}

export async function recordInferenceResult(
  deviceId: string,
  ok: boolean,
  latencyMs: number,
  errorMessage?: string,
): Promise<void> {
  const { data } = await supabase
    .from("ai_devices")
    .select("inference_count, successful_requests, failed_requests, average_latency_ms")
    .eq("device_id", deviceId)
    .maybeSingle();
  const prevCount = data?.inference_count ?? 0;
  const prevAvg = data?.average_latency_ms ?? 0;
  const newCount = prevCount + 1;
  // Running average, not a stored sum — fine at this scale (a handful of
  // devices, per the guide's own prototype framing) and avoids an
  // unbounded-growth column.
  const newAvg = prevAvg ? (prevAvg * prevCount + latencyMs) / newCount : latencyMs;

  await supabase
    .from("ai_devices")
    .update({
      inference_count: newCount,
      successful_requests: (data?.successful_requests ?? 0) + (ok ? 1 : 0),
      failed_requests: (data?.failed_requests ?? 0) + (ok ? 0 : 1),
      average_latency_ms: newAvg,
      status: "online",
      last_error: ok ? null : (errorMessage ?? "inference failed"),
      last_seen_at: new Date().toISOString(),
    })
    .eq("device_id", deviceId);
}

export async function findOnlineDevice(preferredDeviceId?: string): Promise<DeviceRow | null> {
  let query = supabase.from("ai_devices").select("id, device_id, device_secret_hash, model_name, runtime").eq("status", "online");
  if (preferredDeviceId) query = query.eq("device_id", preferredDeviceId);
  const { data } = await query.limit(1).maybeSingle();
  return (data as DeviceRow | null) ?? null;
}
