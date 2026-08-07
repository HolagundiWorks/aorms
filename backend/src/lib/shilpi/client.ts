/**
 * Thin client for ShilpiDB HTTP gateway (shilpi-http).
 * Canon: docs/esti/SHILPI-WIRE.md
 */
import { env } from "../../env.js";

export type ShilpiHealth = { ok: boolean; url: string; detail?: string };

export function shilpiHttpConfigured(): boolean {
  return Boolean(env.SHILPI_HTTP_URL?.trim());
}

export async function shilpiHealth(): Promise<ShilpiHealth> {
  const base = env.SHILPI_HTTP_URL?.replace(/\/+$/, "") ?? "";
  if (!base) return { ok: false, url: "", detail: "SHILPI_HTTP_URL unset" };
  try {
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return { ok: false, url: base, detail: `HTTP ${res.status}` };
    return { ok: true, url: base };
  } catch (e) {
    return { ok: false, url: base, detail: String(e) };
  }
}

/** Bbox query proxy — returns ids from shilpi-http when configured. */
export async function shilpiQueryBbox(args: {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}): Promise<{ ids: number[] } | { error: string }> {
  const base = env.SHILPI_HTTP_URL?.replace(/\/+$/, "") ?? "";
  if (!base) return { error: "SHILPI_HTTP_URL unset" };
  const q = new URLSearchParams({
    minX: String(args.minX),
    minY: String(args.minY),
    maxX: String(args.maxX),
    maxY: String(args.maxY),
  });
  try {
    const res = await fetch(`${base}/query/bbox?${q}`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const body = (await res.json()) as { ids?: number[] };
    return { ids: body.ids ?? [] };
  } catch (e) {
    return { error: String(e) };
  }
}
