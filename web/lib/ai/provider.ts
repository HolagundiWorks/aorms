/**
 * AI provider abstraction (2026-09-20, phase 5 of docs/esti/
 * LIGHTWEIGHT-ARCHITECTURE-PLAN.md). One capability today — chat — since
 * that's the only one any real call site uses; embed/transcribe/vision
 * aren't declared here until something actually needs them (a stub
 * method with no implementation isn't a smaller version of this
 * abstraction, it's a promise this repo can't yet keep).
 */

export type AIProviderResult = { text: string; tokens: number | null };

export interface AIProvider {
  readonly name: string;
  readonly modelName: string;
  chat(input: { system: string; user: string }): Promise<AIProviderResult>;
  isHealthy(): Promise<{ ok: boolean; error?: string }>;
}
