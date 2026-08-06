import {
  MetaCatchUpQuery,
  MetaEventBody,
  MetaWsClientMessage,
  SyncIngestBody,
} from "@esti/contracts";
import type { FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { db } from "../../db/index.js";
import { env } from "../../env.js";
import {
  appendMetaEvent,
  catchUpMetaEvents,
  onMetaEvent,
} from "../../lib/sync/metadata.js";
import { firmFromSyncToken, ingestRecord } from "./service.js";

function bearerFromReq(req: { headers: { authorization?: string }; query?: unknown }): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  const q = req.query as { token?: string } | undefined;
  return q?.token?.trim() || undefined;
}

/**
 * Hub-side sync REST + WebSocket (hub only).
 * - POST /api/sync/ingest — finalized artifacts
 * - POST /api/sync/meta — append metadata event
 * - GET  /api/sync/meta/catch-up — seq catch-up
 * - GET  /api/sync/meta/ws — live push (query ?token=)
 */
export function registerSyncRoutes(app: FastifyInstance): void {
  // Hub authority, or a colocated local smoke box (ESTI_COLOCATED_HUB=1 on a node).
  if (env.ESTI_ROLE !== "hub" && !env.ESTI_COLOCATED_HUB) return;

  app.post("/api/sync/ingest", async (req, reply) => {
    const firmId = await firmFromSyncToken(db, bearerFromReq(req));
    if (!firmId) return reply.code(401).send({ error: "invalid sync token" });

    const parsed = SyncIngestBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid sync body" });

    const remoteId = await ingestRecord(db, firmId, parsed.data);
    return reply.send({ remoteId });
  });

  app.post("/api/sync/meta", async (req, reply) => {
    const firmId = await firmFromSyncToken(db, bearerFromReq(req));
    if (!firmId) return reply.code(401).send({ error: "invalid sync token" });

    const parsed = MetaEventBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid meta body" });

    const event = await appendMetaEvent(db, firmId, parsed.data);
    return reply.send({ event });
  });

  app.get("/api/sync/meta/catch-up", async (req, reply) => {
    const firmId = await firmFromSyncToken(db, bearerFromReq(req));
    if (!firmId) return reply.code(401).send({ error: "invalid sync token" });

    const parsed = MetaCatchUpQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: "invalid catch-up query" });

    const payload = await catchUpMetaEvents(
      db,
      firmId,
      parsed.data.stream,
      parsed.data.afterSeq,
      parsed.data.limit,
    );
    return reply.send(payload);
  });

  void app.register(async (scope) => {
    await scope.register(websocket);
    scope.get("/api/sync/meta/ws", { websocket: true }, (socket, req) => {
      void (async () => {
        const firmId = await firmFromSyncToken(db, bearerFromReq(req));
        if (!firmId) {
          socket.send(JSON.stringify({ type: "error", message: "invalid sync token" }));
          socket.close();
          return;
        }

        let stream = "firm";
        const unsub = onMetaEvent((fid, event) => {
          if (fid !== firmId || event.stream !== stream) return;
          socket.send(JSON.stringify({ type: "event", event }));
        });

        socket.on("message", (raw: Buffer | ArrayBuffer | Buffer[]) => {
          let msg: unknown;
          try {
            msg = JSON.parse(String(raw));
          } catch {
            socket.send(JSON.stringify({ type: "error", message: "invalid json" }));
            return;
          }
          const parsed = MetaWsClientMessage.safeParse(msg);
          if (!parsed.success) {
            socket.send(JSON.stringify({ type: "error", message: "invalid frame" }));
            return;
          }
          if (parsed.data.type === "ping") {
            socket.send(JSON.stringify({ type: "pong" }));
            return;
          }
          stream = parsed.data.stream;
          void catchUpMetaEvents(db, firmId, stream, parsed.data.afterSeq, 100).then((payload) => {
            socket.send(JSON.stringify({ type: "catchup", payload }));
          });
        });

        socket.on("close", () => unsub());
      })();
    });
  });
}
