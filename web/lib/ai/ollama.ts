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

export type OllamaChatInput = {
  baseUrl: string;
  model: string;
  system: string;
  user: string;
  timeoutMs?: number;
};

export type OllamaChatResult = { text: string; tokens: number | null };

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
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ollama HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { message?: { content?: string }; eval_count?: number };
  const text = data.message?.content?.trim() ?? "";
  if (!text) {
    throw new Error("Ollama returned empty content — pull the model with `ollama pull`");
  }
  return { text, tokens: data.eval_count ?? null };
}
