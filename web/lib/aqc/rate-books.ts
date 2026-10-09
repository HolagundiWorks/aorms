/**
 * Firm-level rate-book library (AQC `RateBookStore`): helpers shared by the route and tests. The server computes the
 * content hash itself — a canonical, order-independent digest of the items — so "nothing changed" is decided by AORMS, not
 * trusted from the client. Rates stay AQC's raw rupee values; AORMS never prices from them.
 */
import { createHash } from "node:crypto";
import { z } from "zod";

export const RateItem = z.object({
  code: z.string().min(1).max(64),
  category: z.string().max(120).default(""),
  description: z.string().max(500).default(""),
  unit: z.string().max(24).default(""),
  rate: z.number().min(0).max(1e12),
});
export type RateItem = z.infer<typeof RateItem>;

export const PublishRateBookBody = z.object({
  clientId: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  notes: z.string().max(2000).default(""),
  items: z.array(RateItem).max(20000),
  activate: z.boolean().default(false),
});

/** Digest of the items independent of their order; later duplicates of a code are rejected by `findDuplicateCodes`. */
export function hashRateItems(name: string, notes: string, items: RateItem[]): string {
  const canon = [...items]
    .sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0))
    .map((i) => [i.code, i.category, i.description, i.unit, Math.round(i.rate * 10000)]);
  return createHash("sha256").update(JSON.stringify([name, notes, canon])).digest("hex");
}

export function findDuplicateCodes(items: RateItem[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const i of items) (seen.has(i.code) ? dup : seen).add(i.code);
  return [...dup];
}
