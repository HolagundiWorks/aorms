"use server";

/**
 * Esti AI Model Connectors — platform-admin management (2026-09-13).
 * Lives in aorms-platform (migration 0020_ai_model_connectors.sql), not
 * aorms-web — a generic "connect any model over an API" registry, plus
 * entitlements deciding which Studio (company) or individual Account may
 * use each one. Every write here uses the platform service-role client,
 * same as the rest of app/(platform)/admin/* — these Server Actions are
 * themselves the authorization boundary (isSuperAdmin), not RLS acting
 * on a signed-in browser session.
 */
import { revalidatePath } from "next/cache";
import { getCurrentPlatformSessionAccount, isSuperAdmin } from "../platform/account";
import { createServiceRoleClient } from "../platform/service";
import { toSafeErrorMessage } from "../security/safe-error";

export type ConnectorKind = "openai_compatible" | "anthropic" | "ollama" | "device_gateway" | "custom_http";

export type ActionResult = { error?: string };

async function requireSuperAdmin(): Promise<ActionResult | null> {
  const account = await getCurrentPlatformSessionAccount();
  if (!isSuperAdmin(account)) return { error: "Super admin access required." };
  return null;
}

export async function createModelConnector(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "") as ConnectorKind;
  const baseUrl = String(formData.get("baseUrl") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim() || null;
  const modelName = String(formData.get("modelName") ?? "").trim();
  const defaultForAll = formData.get("defaultForAll") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) return { error: "Name is required." };
  if (!["openai_compatible", "anthropic", "ollama", "device_gateway", "custom_http"].includes(kind)) {
    return { error: "Invalid connector kind." };
  }
  if (!baseUrl) return { error: "Base URL is required." };
  if (!modelName) return { error: "Model name is required." };

  const platform = createServiceRoleClient();
  const { error } = await platform.from("ai_model_connectors").insert({
    name,
    kind,
    base_url: baseUrl,
    api_key: apiKey,
    model_name: modelName,
    default_for_all: defaultForAll,
    notes,
  });
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath("/admin/ai-connectors");
  return {};
}

export async function updateModelConnectorEnabled(connectorId: string, enabled: boolean): Promise<ActionResult> {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const platform = createServiceRoleClient();
  const { error } = await platform.from("ai_model_connectors").update({ enabled }).eq("id", connectorId);
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath("/admin/ai-connectors");
  return {};
}

export async function deleteModelConnector(connectorId: string): Promise<ActionResult> {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const platform = createServiceRoleClient();
  const { error } = await platform.from("ai_model_connectors").delete().eq("id", connectorId);
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath("/admin/ai-connectors");
  return {};
}

/**
 * `scopeValue` is a company_id or account_id (uuid) depending on
 * scopeType — the admin UI resolves a Studio/individual's public handle
 * (AORMS-C-.../AORMS-U-...) to that internal id before calling this, same
 * as every other platform-admin lookup-by-handle flow already does.
 */
export async function grantConnectorAccess(
  connectorId: string,
  scopeType: "company" | "account",
  scopeValue: string,
): Promise<ActionResult> {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const platform = createServiceRoleClient();
  const { error } = await platform.from("ai_model_connector_access").insert({
    connector_id: connectorId,
    scope_type: scopeType,
    company_id: scopeType === "company" ? scopeValue : null,
    account_id: scopeType === "account" ? scopeValue : null,
  });
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath("/admin/ai-connectors");
  return {};
}

export async function revokeConnectorAccess(accessId: string): Promise<ActionResult> {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const platform = createServiceRoleClient();
  const { error } = await platform.from("ai_model_connector_access").delete().eq("id", accessId);
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath("/admin/ai-connectors");
  return {};
}

/** Resolves a public handle (AORMS-C-xxxx / AORMS-U-xxxx) to its internal
 * id — the admin UI never asks for a raw uuid. */
export async function resolveHandleToId(scopeType: "company" | "account", handle: string): Promise<{ id?: string; error?: string }> {
  const denied = await requireSuperAdmin();
  if (denied) return { error: denied.error };

  const platform = createServiceRoleClient();
  const table = scopeType === "company" ? "companies" : "accounts";
  const { data, error } = await platform.from(table).select("id").eq("public_id", handle.trim()).maybeSingle();
  if (error) return { error: toSafeErrorMessage(error) };
  if (!data) return { error: `No ${scopeType} found for handle "${handle}".` };
  return { id: data.id };
}
