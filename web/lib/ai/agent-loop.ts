import { callOllamaChat, checkOllamaHealth, ollamaBaseUrlFromEnv, ollamaModelFromEnv, type OllamaHistoryMessage } from "./ollama";
import { redactPii } from "./redact";
import type { AITool, AIToolContext } from "./tools/types";

const MAX_TOOL_ITERATIONS = 3;

export type AgentChatResult = {
  output: string;
  provider: string;
  model: string;
  tokenEstimate: number | null;
  toolsUsed: string[];
};

/**
 * The tool-calling counterpart to lib/ai/run-chat.ts's plain chat —
 * same health-check/fallback discipline, but loops: ask the model, and
 * if it asks for a tool instead of answering, run the tool (from
 * tools/*.ts, each wrapping an existing read path) and feed the result
 * back, up to MAX_TOOL_ITERATIONS times before falling back rather than
 * looping forever. Not yet wired into any live Server Action — see
 * LIGHTWEIGHT-ARCHITECTURE-PLAN.md phase 6 for why that migration is
 * separate from adding this.
 */
export async function runAgenticChat(input: {
  system: string;
  user: string;
  tools: AITool[];
  context: AIToolContext;
  fallback: string;
}): Promise<AgentChatResult> {
  const baseUrl = ollamaBaseUrlFromEnv();
  const model = ollamaModelFromEnv();
  const toolsUsed: string[] = [];

  const health = await checkOllamaHealth({ baseUrl, model });
  if (!health.ok) {
    return { output: input.fallback, provider: "mock", model: "template-fallback", tokenEstimate: null, toolsUsed };
  }

  const toolDefs = input.tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
  const history: OllamaHistoryMessage[] = [];
  let totalTokens = 0;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    let result;
    try {
      result = await callOllamaChat({ baseUrl, model, system: input.system, user: input.user, tools: toolDefs, history });
    } catch {
      return { output: input.fallback, provider: "mock", model: "template-fallback", tokenEstimate: totalTokens || null, toolsUsed };
    }
    totalTokens += result.tokens ?? 0;

    if (!result.toolCalls || result.toolCalls.length === 0) {
      return { output: redactPii(result.text), provider: "ollama", model, tokenEstimate: totalTokens || null, toolsUsed };
    }

    history.push({ role: "assistant", content: result.text });
    for (const call of result.toolCalls) {
      const tool = input.tools.find((t) => t.name === call.function.name);
      const toolResult = tool
        ? await tool.execute(call.function.arguments, input.context).catch((err) => `Tool error: ${err instanceof Error ? err.message : "failed"}`)
        : `Unknown tool: ${call.function.name}`;
      if (tool) toolsUsed.push(tool.name);
      history.push({ role: "tool", content: toolResult, tool_name: call.function.name });
    }
  }

  return { output: input.fallback, provider: "mock", model: "template-fallback", tokenEstimate: totalTokens || null, toolsUsed };
}
