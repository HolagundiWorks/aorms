/**
 * Esti Device Gateway — the WSS boundary between AORMS and inference
 * devices (phones, later servers), per the attached development guide's
 * §6 Device Gateway / §9-11 (connection lifecycle, WebSocket protocol).
 *
 * Two responsibilities, same as the guide describes:
 *   1. WSS server (`/ws`) — devices dial OUT to this (guide §4: "the
 *      phone initiates the connection," never the reverse), authenticate
 *      with their own per-device secret (§8, never a shared API key),
 *      heartbeat, and receive/answer inference requests.
 *   2. HTTP control API (`POST /infer`) — the AORMS Esti API's own way
 *      in: hand it a prompt, get back whichever connected device's
 *      answer, without the Esti API needing to know anything about
 *      WebSockets or which device is actually online.
 *
 * No framework, same reasoning as gateway/src/index.ts (jobs-gateway):
 * a service this small doesn't need one, and this sits at a public
 * network boundary where fewer dependencies means less to audit.
 *
 * Routing/session state (which devices are connected, pending request
 * promises) lives in memory only — restarting this process drops every
 * live connection and in-flight request, which is fine and expected
 * (devices reconnect with their own backoff per guide §9; nothing here
 * is meant to survive a restart). Supabase (`ai_devices`) is the
 * *durable* record of device identity/credentials/health, never the
 * live routing table.
 */
import crypto from "node:crypto";
import http from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import type { DeviceToGatewayMessage, GatewayToDeviceMessage, InferHttpRequest, InferHttpResponse } from "./types";
import {
  authenticateDevice,
  findOnlineDevice,
  markDeviceBusy,
  markDeviceHeartbeat,
  markDeviceOffline,
  markDeviceOnline,
  recordInferenceResult,
} from "./devices";

const PORT = Number(process.env.PORT ?? 4200);
const CONTROL_TOKEN = process.env.DEVICE_GATEWAY_CONTROL_TOKEN;
const INFERENCE_TIMEOUT_MS = Number(process.env.INFERENCE_TIMEOUT_MS ?? 180_000); // guide §27: 2-5 min, not normal web-request expectations
const MAX_BODY_BYTES = 64 * 1024; // a chat-style prompt + small context, not file uploads

if (!CONTROL_TOKEN) {
  throw new Error(
    "DEVICE_GATEWAY_CONTROL_TOKEN must be set — this is what stops an arbitrary caller from submitting inference " +
      "requests through this gateway. Refusing to start without it.",
  );
}

type PendingRequest = {
  resolve: (result: { content: string } | { error: string }) => void;
  timer: NodeJS.Timeout;
};

type ConnectedDevice = {
  ws: WebSocket;
  deviceId: string;
  pending: Map<string, PendingRequest>;
};

const connected = new Map<string, ConnectedDevice>();

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function send(ws: WebSocket, msg: GatewayToDeviceMessage): void {
  ws.send(JSON.stringify(msg));
}

async function handleDeviceMessage(entry: ConnectedDevice, raw: string): Promise<void> {
  let msg: DeviceToGatewayMessage;
  try {
    msg = JSON.parse(raw);
  } catch {
    return; // malformed frame — ignore rather than kill the connection over one bad message
  }

  if (msg.type === "heartbeat") {
    void markDeviceHeartbeat(entry.deviceId);
    return;
  }

  if (msg.type === "inference_response") {
    const pending = entry.pending.get(msg.request_id);
    if (!pending) return; // late/duplicate response for a request we already timed out
    clearTimeout(pending.timer);
    entry.pending.delete(msg.request_id);
    if (msg.status === "completed") {
      pending.resolve({ content: msg.result.content });
    } else {
      pending.resolve({ error: msg.error.message });
    }
  }
}

function startWsServer(server: http.Server): void {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    let authedDeviceId: string | null = null;

    ws.once("message", async (raw) => {
      let msg: DeviceToGatewayMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        ws.close(4000, "first message must be JSON");
        return;
      }
      if (msg.type !== "auth") {
        ws.close(4001, "first message must be type=auth");
        return;
      }

      const device = await authenticateDevice(msg.device_id, msg.device_secret);
      if (!device) {
        send(ws, { type: "auth_ack", ok: false, error: "invalid device_id or secret" });
        ws.close(4003, "unauthorized");
        return;
      }

      // One live connection per device — a reconnect (e.g. after a
      // network blip, guide §9) supersedes the old socket rather than
      // running both.
      const existing = connected.get(device.device_id);
      if (existing) existing.ws.close(4009, "superseded by new connection");

      authedDeviceId = device.device_id;
      const entry: ConnectedDevice = { ws, deviceId: device.device_id, pending: new Map() };
      connected.set(device.device_id, entry);

      await markDeviceOnline(device.device_id, { app_version: msg.app_version, capabilities: msg.capabilities });
      send(ws, { type: "auth_ack", ok: true });

      ws.on("message", (raw2) => void handleDeviceMessage(entry, raw2.toString()));
    });

    ws.on("close", () => {
      if (!authedDeviceId) return;
      const entry = connected.get(authedDeviceId);
      // Only clear/mark-offline if this socket is still the one on
      // record — a superseded old socket closing shouldn't clobber the
      // new connection's state.
      if (entry && entry.ws === ws) {
        connected.delete(authedDeviceId);
        for (const p of entry.pending.values()) {
          clearTimeout(p.timer);
          p.resolve({ error: "device disconnected" });
        }
        void markDeviceOffline(authedDeviceId);
      }
    });
  });
}

function submitInference(deviceId: string, body: InferHttpRequest): Promise<{ content: string } | { error: string }> {
  const entry = connected.get(deviceId);
  if (!entry) return Promise.resolve({ error: "device not connected" });

  const requestId = `req_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      entry.pending.delete(requestId);
      resolve({ error: "inference timed out" });
    }, INFERENCE_TIMEOUT_MS);

    entry.pending.set(requestId, { resolve, timer });
    void markDeviceBusy(deviceId, true);
    send(entry.ws, {
      type: "inference_request",
      request_id: requestId,
      model: body.model,
      messages: body.messages,
      parameters: body.parameters,
    });
  });
}

function isAuthorized(req: http.IncomingMessage): boolean {
  const header = req.headers.authorization ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  return timingSafeEqualStr(header.slice(prefix.length), CONTROL_TOKEN as string);
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

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function handleInfer(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: "unauthorized" });
    return;
  }

  let raw: string;
  try {
    raw = await readBody(req);
  } catch {
    sendJson(res, 413, { error: "payload too large" });
    return;
  }

  let body: InferHttpRequest;
  try {
    body = JSON.parse(raw);
  } catch {
    sendJson(res, 400, { error: "invalid JSON body" });
    return;
  }
  if (!body || typeof body.model !== "string" || !Array.isArray(body.messages)) {
    sendJson(res, 400, { error: "model (string) and messages (array) are required" });
    return;
  }

  const targetDeviceId = body.device_id
    ? (connected.has(body.device_id) ? body.device_id : null)
    : ([...connected.keys()][0] ?? null);

  if (!targetDeviceId) {
    // Fall back to checking Supabase in case a device shows "online" in
    // the durable record but isn't actually in our in-memory map for
    // some reason (e.g. this process restarted) — report the real,
    // more specific error either way rather than a generic 503.
    const dbDevice = await findOnlineDevice(body.device_id);
    const reply: InferHttpResponse = {
      status: "error",
      error: dbDevice ? "device registered online but not connected to this gateway instance" : "no online device available",
    };
    sendJson(res, 503, reply);
    return;
  }

  const start = Date.now();
  const result = await submitInference(targetDeviceId, body);
  const latencyMs = Date.now() - start;
  const ok = "content" in result;
  await recordInferenceResult(targetDeviceId, ok, latencyMs, ok ? undefined : result.error);

  const reply: InferHttpResponse = ok
    ? { status: "completed", device_id: targetDeviceId, content: result.content, latency_ms: latencyMs }
    : { status: "error", error: result.error };
  sendJson(res, ok ? 200 : 502, reply);
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    sendJson(res, 200, { status: "ok", connected_devices: connected.size });
    return;
  }
  if (req.method === "POST" && req.url === "/infer") {
    void handleInfer(req, res);
    return;
  }
  sendJson(res, 404, { error: "not found" });
});

startWsServer(server);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`device-gateway listening on :${PORT} (ws path /ws, control API /infer)`);
});

function shutdown(): void {
  for (const entry of connected.values()) entry.ws.close(1001, "gateway shutting down");
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
