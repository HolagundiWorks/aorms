/**
 * Esti AI Model Connectors — runtime adapter (2026-09-13). The piece that
 * actually calls whichever model a Studio/individual is entitled to use,
 * per migration 0020_ai_model_connectors.sql (aorms-platform). This is
 * the "Esti Provider Interface" the attached mobile-inference development
 * guide's §32 describes in the abstract (LocalA10sProvider/
 * ServerLlamaProvider/OllamaProvider/CloudProvider) — implemented here as
 * one dispatch over `kind` rather than one class per provider, since the
 * actual per-kind logic is a few lines of fetch-shaping each, not
 * separate stateful objects.
 *
 * Reads aorms-platform via the platform service-role client (cross-
 * project, same as web/lib/actions/platform.ts already does elsewhere) —
 * never via the browser's own platform session, since this runs from the
 * Esti API route server-side regardless of which project's cookie the
 * caller happens to hold.
 */
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../platform/service";

export type ChatMessage = { role: string; content: string };
export type CallParameters = { temperature?: number; max_tokens?: number };
export type ConnectorCallResult = { content: string } | { error: string };

export type ResolvedConnector = {
  id: string;
  name: string;
  kind: "openai_compatible" | "anthropic" | "ollama" | "device_gateway" | "custom_http";
  baseUrl: string;
  apiKey: string | null;
  modelName: string;
};

/**
 * Resolution order: an explicit account-level grant beats an explicit
 * studio-level grant (a person-specific override should win over their
 * studio's default), which beats any `default_for_all` connector. Only
 * `enabled` connectors are ever considered.
 */
export async function resolveConnectorForScope(scope: { studioId?: string; accountId?: string }): Promise<ResolvedConnector | null> {
  const platform = createPlatformServiceRoleClient();

  if (scope.accountId) {
    const { data } = await platform
      .from("ai_model_connector_access")
      .select("ai_model_connectors!inner(id, name, kind, base_url, api_key, model_name, enabled)")
      .eq("scope_type", "account")
      .eq("account_id", scope.accountId)
      .eq("ai_model_connectors.enabled", true)
      .limit(1)
      .maybeSingle();
    const connector = data?.ai_model_connectors as unknown as ConnectorTableRow | undefined;
    if (connector) return toResolved(connector);
  }

  if (scope.studioId) {
    const { data } = await platform
      .from("ai_model_connector_access")
      .select("ai_model_connectors!inner(id, name, kind, base_url, api_key, model_name, enabled)")
      .eq("scope_type", "studio")
      .eq("studio_id", scope.studioId)
      .eq("ai_model_connectors.enabled", true)
      .limit(1)
      .maybeSingle();
    const connector = data?.ai_model_connectors as unknown as ConnectorTableRow | undefined;
    if (connector) return toResolved(connector);
  }

  const { data: fallback } = await platform
    .from("ai_model_connectors")
    .select("id, name, kind, base_url, api_key, model_name, enabled")
    .eq("default_for_all", true)
    .eq("enabled", true)
    .limit(1)
    .maybeSingle();
  return fallback ? toResolved(fallback) : null;
}

type ConnectorTableRow = {
  id: string;
  name: string;
  kind: string;
  base_url: string;
  api_key: string | null;
  model_name: string;
  enabled: boolean;
};

function toResolved(row: ConnectorTableRow): ResolvedConnector {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as ResolvedConnector["kind"],
    baseUrl: row.base_url,
    apiKey: row.api_key,
    modelName: row.model_name,
  };
}

async function callOpenAiCompatible(connector: ResolvedConnector, messages: ChatMessage[], params?: CallParameters): Promise<ConnectorCallResult> {
  const res = await fetch(`${connector.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(connector.apiKey ? { Authorization: `Bearer ${connector.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: connector.modelName,
      messages,
      temperature: params?.temperature,
      max_tokens: params?.max_tokens,
    }),
  });
  if (!res.ok) return { error: `${connector.name}: HTTP ${res.status}` };
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== "string") return { error: `${connector.name}: no content in response` };
  return { content };
}

async function callAnthropic(connector: ResolvedConnector, messages: ChatMessage[], params?: CallParameters): Promise<ConnectorCallResult> {
  const system = messages.find((m) => m.role === "system")?.content;
  const rest = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

  const res = await fetch(`${connector.baseUrl.replace(/\/$/, "")}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      ...(connector.apiKey ? { "x-api-key": connector.apiKey } : {}),
    },
    body: JSON.stringify({
      model: connector.modelName,
      system,
      messages: rest,
      max_tokens: params?.max_tokens ?? 1024,
      temperature: params?.temperature,
    }),
  });
  if (!res.ok) return { error: `${connector.name}: HTTP ${res.status}` };
  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = json.content?.find((c) => c.type === "text")?.text;
  if (typeof text !== "string") return { error: `${connector.name}: no text in response` };
  return { content: text };
}

async function callOllama(connector: ResolvedConnector, messages: ChatMessage[], params?: CallParameters): Promise<ConnectorCallResult> {
  const res = await fetch(`${connector.baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: connector.modelName,
      messages,
      stream: false,
      options: { temperature: params?.temperature },
    }),
  });
  if (!res.ok) return { error: `${connector.name}: HTTP ${res.status}` };
  const json = (await res.json()) as { message?: { content?: string } };
  if (typeof json.message?.content !== "string") return { error: `${connector.name}: no content in response` };
  return { content: json.message.content };
}

/** device_gateway connectors point at the Esti device-gateway service's
 * own `POST /infer` control API (device-gateway/src/index.ts) — its
 * `InferHttpRequest`/`InferHttpResponse` shape, kept in sync by hand
 * since the gateway is a separate package outside web/'s own build. */
async function callDeviceGateway(connector: ResolvedConnector, messages: ChatMessage[], params?: CallParameters): Promise<ConnectorCallResult> {
  const res = await fetch(`${connector.baseUrl.replace(/\/$/, "")}/infer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(connector.apiKey ? { Authorization: `Bearer ${connector.apiKey}` } : {}),
    },
    body: JSON.stringify({ model: connector.modelName, messages, parameters: params }),
  });
  const json = (await res.json()) as { status: "completed" | "error"; content?: string; error?: string };
  if (json.status === "completed" && typeof json.content === "string") return { content: json.content };
  return { error: json.error ?? `${connector.name}: gateway returned no result` };
}

export async function callConnector(connector: ResolvedConnector, messages: ChatMessage[], params?: CallParameters): Promise<ConnectorCallResult> {
  try {
    switch (connector.kind) {
      case "openai_compatible":
      case "custom_http":
        return await callOpenAiCompatible(connector, messages, params);
      case "anthropic":
        return await callAnthropic(connector, messages, params);
      case "ollama":
        return await callOllama(connector, messages, params);
      case "device_gateway":
        return await callDeviceGateway(connector, messages, params);
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
