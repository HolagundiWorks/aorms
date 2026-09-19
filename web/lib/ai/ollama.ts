/**
 * Ollama HTTP client — ported verbatim from vendor/hcw-aorms-ai-kit's
 * `dist/ollama/{chat,config}.js` (that package has no `src/`, only a
 * compiled `dist/`; this is a straight re-transcription of the compiled
 * output, not a guess at its shape). Framework-agnostic — no drizzle/DB
 * dependency, unlike backend/src/lib/ai/gateway.ts, so it ports as-is.
 *
 * One shared, self-hosted Ollama instance per deployment (CLAUDE.md § AORMS
 * AI) — reached over plain HTTP, called server-side from a Next.js Server
 * Action, never from the browser.
 */

export const DEFAULT_OLLAMA_MODEL = "llama3.2";

export function ollamaBaseUrlFromEnv(): string {
  return (
    process.env.OLLAMA_BASE_URL?.trim() ||
    process.env.OLLAMA_HOST?.trim() ||
    "http://127.0.0.1:11434"
  );
}

export function ollamaModelFromEnv(): string {
  return process.env.OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL;
}

export type OllamaHealth = {
  ok: boolean;
  baseUrl: string;
  model: string;
  modelsAvailable: string[];
  error?: string;
};

/** Probe Ollama /api/tags and confirm the configured model is pulled. */
export async function checkOllamaHealth(input?: { baseUrl?: string; model?: string }): Promise<OllamaHealth> {
  const baseUrl = (input?.baseUrl ?? ollamaBaseUrlFromEnv()).replace(/\/$/, "");
  const model = input?.model ?? ollamaModelFromEnv();
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      return { ok: false, baseUrl, model, modelsAvailable: [], error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { models?: { name: string }[] };
    const names = (data.models ?? []).map((m) => m.name);
    const hasModel = names.some((n) => n === model || n.startsWith(`${model}:`));
    return {
      ok: hasModel,
      baseUrl,
      model,
      modelsAvailable: names,
      error: hasModel ? undefined : `Model "${model}" not pulled — run: ollama pull ${model}`,
    };
  } catch (err) {
    return {
      ok: false,
      baseUrl,
      model,
      modelsAvailable: [],
      error: err instanceof Error ? err.message : "Ollama unreachable",
    };
  }
}

/** Ollama /api/chat tool-calling shapes — see https://github.com/ollama/ollama/blob/main/docs/api.md#chat-request-with-tools */
export type OllamaToolDefinition = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type OllamaToolCall = { function: { name: string; arguments: Record<string, unknown> } };

/** A prior turn in a multi-step tool-calling exchange, appended after system/user. */
export type OllamaHistoryMessage = { role: "assistant" | "tool"; content: string; tool_name?: string };

export type OllamaChatInput = {
  baseUrl: string;
  model: string;
  system: string;
  user: string;
  timeoutMs?: number;
  /** Only present for a tool-calling call (lib/ai/agent-loop.ts) — every existing caller omits this. */
  tools?: OllamaToolDefinition[];
  history?: OllamaHistoryMessage[];
};

export type OllamaChatResult = { text: string; tokens: number | null; toolCalls?: OllamaToolCall[] };

export async function callOllamaChat(input: OllamaChatInput): Promise<OllamaChatResult> {
  const url = `${input.baseUrl.replace(/\/$/, "")}/api/chat`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(input.timeoutMs ?? 120_000),
    body: JSON.stringify({
      model: input.model,
      stream: false,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
        ...(input.history ?? []),
      ],
      ...(input.tools ? { tools: input.tools } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ollama HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { message?: { content?: string; tool_calls?: OllamaToolCall[] }; eval_count?: number };
  const text = data.message?.content?.trim() ?? "";
  const toolCalls = data.message?.tool_calls;
  // A tool-calling turn legitimately has empty content (the model asked to
  // call a tool instead of answering) — only the no-tools, no-tool-call
  // shape (every existing caller, since none pass `tools`) still treats
  // empty content as an error.
  if (!text && !(toolCalls && toolCalls.length > 0)) {
    throw new Error("Ollama returned empty content — pull the model with `ollama pull`");
  }
  return { text, tokens: data.eval_count ?? null, ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : {}) };
}
