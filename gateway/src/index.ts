/**
 * Jobs gateway — the enqueue boundary for Phase 6 (docs/esti/
 * NEXTJS-MIGRATION-PHASE6-AUDIT.md § RESOLVED, "What's still open").
 *
 * `web/` deploys to Hostinger Managed App Hosting; `worker/` + Redis stay on
 * the existing VPS (Hostinger is Node-only with no Redis/background-worker
 * support — see the audit). Redis itself is not exposed to the public
 * internet for `web/`'s Server Actions to reach — this tiny, single-purpose
 * HTTP service is the authenticated boundary in front of it instead, the
 * same reason Supabase fronts Postgres with PostgREST rather than exposing
 * the database directly. It does exactly one thing: authenticate a request,
 * validate a job type, and XADD onto the same Redis Stream the old
 * `backend/src/lib/redis.ts`'s `enqueueJob()` used — same stream name, same
 * field names/order (`type`, `payload`), so the existing Python worker
 * (`worker/esti_worker/main.py`) needs zero changes to consume jobs
 * produced here instead of there.
 *
 * No framework — a service this small (one real route) doesn't need one,
 * and fewer dependencies means less to audit on a service whose entire job
 * is standing at a public network boundary.
 */
import crypto from "node:crypto";
import http from "node:http";
import Redis from "ioredis";

const PORT = Number(process.env.PORT ?? 4100);
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const STREAM = process.env.WORKER_JOB_STREAM ?? "esti:jobs";
const TOKEN = process.env.JOBS_GATEWAY_TOKEN;
const MAX_BODY_BYTES = 256 * 1024; // jobs carry ids/small metadata, not file bytes

if (!TOKEN) {
  throw new Error(
    "JOBS_GATEWAY_TOKEN must be set — this is the only thing standing between " +
      "the public internet and the job queue. Refusing to start without it.",
  );
}

// Mirrors backend/src/lib/redis.ts's JobType union exactly — a payload with
// any other `type` is rejected rather than silently queued for a handler
// that doesn't exist (worker/esti_worker/main.py already no-ops on an
// unknown type, but rejecting at the boundary surfaces the mistake to the
// caller immediately instead of a job that logs "skipped" and vanishes).
const JOB_TYPES = new Set(["dxf_to_svg", "render_pdf", "pdf_to_markdown", "reconcile_import"]);

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // Compare against a fixed-length buffer first so the timing-safe compare
  // itself never runs on mismatched lengths (timingSafeEqual throws, it
  // doesn't return false, for unequal-length inputs).
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function isAuthorized(req: http.IncomingMessage): boolean {
  const header = req.headers.authorization ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  return timingSafeEqualStr(header.slice(prefix.length), TOKEN as string);
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res: http.ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(json);
}

async function handleEnqueue(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  if (!isAuthorized(req)) {
    send(res, 401, { error: "unauthorized" });
    return;
  }

  let raw: string;
  try {
    raw = await readBody(req);
  } catch {
    send(res, 413, { error: "payload too large" });
    return;
  }

  let body: unknown;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    send(res, 400, { error: "invalid JSON body" });
    return;
  }

  if (typeof body !== "object" || body === null) {
    send(res, 400, { error: "body must be a JSON object" });
    return;
  }
  const { type, payload, requestId } = body as Record<string, unknown>;

  if (typeof type !== "string" || !JOB_TYPES.has(type)) {
    send(res, 400, { error: `type must be one of: ${[...JOB_TYPES].join(", ")}` });
    return;
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    send(res, 400, { error: "payload must be a JSON object" });
    return;
  }

  const fullPayload =
    typeof requestId === "string" ? { ...payload, request_id: requestId } : payload;

  try {
    // Field order/names match backend/src/lib/redis.ts's enqueueJob() exactly
    // — the Python worker's consumer (worker/esti_worker/main.py) reads
    // `type` and `payload` off the stream entry regardless of who produced it.
    const id = await redis.xadd(STREAM, "*", "type", type, "payload", JSON.stringify(fullPayload));
    send(res, 202, { id });
  } catch (err) {
    send(res, 502, { error: "queue unavailable", detail: err instanceof Error ? err.message : String(err) });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    send(res, 200, { status: "ok" });
    return;
  }
  if (req.method === "POST" && req.url === "/jobs") {
    void handleEnqueue(req, res);
    return;
  }
  send(res, 404, { error: "not found" });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`jobs-gateway listening on :${PORT}, stream=${STREAM}`);
});

function shutdown(): void {
  server.close(() => {
    redis.quit().finally(() => process.exit(0));
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
