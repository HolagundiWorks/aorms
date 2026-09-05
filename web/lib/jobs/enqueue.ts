/**
 * Client for the Phase 6 enqueue boundary (docs/esti/
 * NEXTJS-MIGRATION-PHASE6-AUDIT.md § RESOLVED, "What's still open").
 *
 * `web/` deploys to Hostinger; the Python worker + Redis stay on the
 * existing VPS. This calls the small authenticated `gateway/` service in
 * front of Redis instead of talking to Redis directly (Hostinger's outbound
 * network policy for arbitrary TCP ports is unconfirmed, and even where
 * outbound TCP works, fronting an internal queue with HTTP is the safer,
 * more portable boundary — see the gateway's own module docstring).
 *
 * Server-only — never import this from a Client Component (the gateway
 * token would leak to the browser bundle otherwise). Call it from inside a
 * `"use server"` Server Action, the same way every other job-producing
 * mutation in this codebase already works (matches web/lib/supabase/
 * service.ts's own server-only convention — a doc warning, not the
 * `server-only` package, since nothing else here uses that dependency).
 */

export type JobType = "dxf_to_svg" | "render_pdf" | "pdf_to_markdown" | "reconcile_import";

export class JobEnqueueError extends Error {}

/**
 * Enqueue a job. Throws JobEnqueueError on any non-2xx response or network
 * failure — callers (Server Actions) should catch it and surface a plain
 * `{ error: string }` to the form, the same pattern used everywhere else in
 * this codebase, rather than letting a queue outage crash the request.
 */
export async function enqueueJob(
  type: JobType,
  payload: Record<string, unknown>,
  requestId?: string,
): Promise<string> {
  const url = process.env.JOBS_GATEWAY_URL;
  const token = process.env.JOBS_GATEWAY_TOKEN;
  if (!url || !token) {
    throw new JobEnqueueError(
      "JOBS_GATEWAY_URL/JOBS_GATEWAY_TOKEN are not configured — the enqueue " +
        "boundary isn't deployed yet (see the Phase 6 audit's 'What's still " +
        "open' section).",
    );
  }

  let res: Response;
  try {
    res = await fetch(`${url.replace(/\/$/, "")}/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type, payload, requestId }),
    });
  } catch (err) {
    throw new JobEnqueueError(
      `Could not reach the job queue: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new JobEnqueueError(`Job queue rejected the request (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}
