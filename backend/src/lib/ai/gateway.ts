import { callOllamaChat } from "@hcw/aorms-ai-kit/ollama";
import type { AiSettings } from "@esti/contracts";
import { assembleAiContext, generateMockOutput } from "./context.js";
import { ollamaBaseUrlFromEnv, ollamaModelFromEnv } from "./ollama-config.js";
import type { DB } from "../../db/index.js";
import type { AiDraftKind, AiSourceRef } from "@esti/contracts";

export type GatewayInput = {
  kind: AiDraftKind;
  mode?: "draft" | "agent";
  projectId?: string;
  drawingId?: string;
  prompt?: string;
  contextQuery?: string;
};

export type GatewayResult = {
  output: string;
  sources: AiSourceRef[];
  promptSummary: string;
  provider: string;
  model: string;
  usedExternalApi: boolean;
  tokenEstimate: number | null;
};

// Desktop-first, local-only: AI resolves to a local Ollama model or the
// deterministic mock template. There is no external/cloud provider, so
// usedExternalApi is always false.
type RuntimeMode =
  | { mode: "ollama"; provider: "ollama"; model: string; baseUrl: string; usedExternalApi: false }
  | { mode: "mock"; provider: "mock"; model: "template"; usedExternalApi: false };

function ollamaBaseUrl(settings: AiSettings): string {
  return settings.ollamaBaseUrl?.trim() || ollamaBaseUrlFromEnv();
}

function resolveRuntime(settings: AiSettings): RuntimeMode {
  const model = settings.model || ollamaModelFromEnv();

  if (settings.provider === "mock") {
    return { mode: "mock", provider: "mock", model: "template", usedExternalApi: false };
  }

  return {
    mode: "ollama",
    provider: "ollama",
    model,
    baseUrl: ollamaBaseUrl(settings),
    usedExternalApi: false,
  };
}

export async function runAiGateway(
  db: DB,
  user: { id: string; role: string; email?: string; fullName?: string; isDemo?: boolean },
  settings: AiSettings,
  input: GatewayInput,
): Promise<GatewayResult> {
  if (!settings.enabled) {
    throw new Error("AI Studio is disabled for this firm");
  }

  const runtime = resolveRuntime(settings);
  const bundle = await assembleAiContext(db, user, input);

  if (runtime.mode === "ollama") {
    try {
      const { text, tokens } = await callOllamaChat({
        baseUrl: runtime.baseUrl,
        model: runtime.model,
        system: bundle.systemPrompt,
        user: bundle.userPrompt,
      });
      return {
        output: text,
        sources: bundle.sources,
        promptSummary: bundle.promptSummary,
        provider: runtime.provider,
        model: runtime.model,
        usedExternalApi: false,
        tokenEstimate: tokens,
      };
    } catch (err) {
      const mock = await generateMockOutput(db, user, input);
      const hint =
        err instanceof Error ? err.message : "Ollama unavailable";
      const output = `${mock.output}\n\n---\n*Ollama fallback (${hint.slice(0, 120)})*`;
      return {
        output,
        sources: mock.sources,
        promptSummary: mock.promptSummary,
        provider: "mock",
        model: "template-fallback",
        usedExternalApi: false,
        tokenEstimate: null,
      };
    }
  }

  const mock = await generateMockOutput(db, user, input);
  return {
    output: mock.output,
    sources: mock.sources,
    promptSummary: mock.promptSummary,
    provider: "mock",
    model: "template",
    usedExternalApi: false,
    tokenEstimate: null,
  };
}
