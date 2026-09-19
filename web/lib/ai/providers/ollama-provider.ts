import { callOllamaChat, checkOllamaHealth, ollamaBaseUrlFromEnv, ollamaModelFromEnv } from "../ollama";
import type { AIProvider, AIProviderResult } from "../provider";

/**
 * Wraps the existing lib/ai/ollama.ts calls behind AIProvider — same
 * self-hosted Ollama container in production / native local Ollama in
 * dev this repo has always used (docs/esti/ROADMAP.md's "Local dev
 * Ollama runs natively" entry), just no longer called ad hoc from three
 * separate Server Actions.
 */
export class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  private readonly baseUrl = ollamaBaseUrlFromEnv();
  private readonly model = ollamaModelFromEnv();

  get modelName(): string {
    return this.model;
  }

  async isHealthy(): Promise<{ ok: boolean; error?: string }> {
    return checkOllamaHealth({ baseUrl: this.baseUrl, model: this.model });
  }

  async chat(input: { system: string; user: string }): Promise<AIProviderResult> {
    return callOllamaChat({ baseUrl: this.baseUrl, model: this.model, system: input.system, user: input.user });
  }
}
