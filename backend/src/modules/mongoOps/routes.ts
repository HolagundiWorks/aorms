import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import { env } from "../../env.js";
import {
  listOpsTasksForFirm,
  listOpsTasksForProject,
  listPublishedArtifacts,
  upsertOpsTask,
  upsertPublishedArtifact,
} from "../../lib/mongo/ops.js";
import { firmFromSyncToken } from "../sync/service.js";

function bearerFromReq(req: { headers: { authorization?: string } }): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return undefined;
}

const TaskBody = z.object({
  projectId: z.string().min(1),
  taskId: z.string().min(1),
  title: z.string().min(1),
  status: z.string().min(1),
  updatedAt: z.string().optional(),
});

const ArtifactBody = z.object({
  projectId: z.string().min(1),
  entity: z.string().min(1),
  entityId: z.string().min(1),
  title: z.string().min(1),
  storageKey: z.string().optional(),
  contentHash: z.string().optional(),
  drawingPackageId: z.string().optional(),
  vdbUri: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * Suite Mongo ops REST (hub / colocated hub).
 * POST /api/ops/tasks — publish task (Bearer syncToken)
 * GET  /api/ops/tasks?projectId= — list (Bearer syncToken)
 * POST /api/ops/artifacts — publish drawing/PDF pointer
 * GET  /api/ops/artifacts?projectId=&entity=
 */
export function registerMongoOpsRoutes(app: FastifyInstance): void {
  if (env.ESTI_ROLE !== "hub" && !env.ESTI_COLOCATED_HUB) return;

  app.post("/api/ops/tasks", async (req, reply) => {
    const firmId = await firmFromSyncToken(db, bearerFromReq(req));
    if (!firmId) return reply.code(401).send({ error: "invalid sync token" });
    const parsed = TaskBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid task body" });
    const now = new Date().toISOString();
    await upsertOpsTask({
      firmId,
      projectId: parsed.data.projectId,
      taskId: parsed.data.taskId,
      title: parsed.data.title,
      status: parsed.data.status,
      updatedAt: parsed.data.updatedAt ?? now,
      publishedAt: now,
    });
    return reply.send({ ok: true });
  });

  app.get("/api/ops/tasks", async (req, reply) => {
    const firmId = await firmFromSyncToken(db, bearerFromReq(req));
    if (!firmId) return reply.code(401).send({ error: "invalid sync token" });
    const q = req.query as { projectId?: string };
    const tasks = q.projectId
      ? await listOpsTasksForProject(firmId, q.projectId)
      : await listOpsTasksForFirm(firmId);
    return reply.send({ tasks });
  });

  app.post("/api/ops/artifacts", async (req, reply) => {
    const firmId = await firmFromSyncToken(db, bearerFromReq(req));
    if (!firmId) return reply.code(401).send({ error: "invalid sync token" });
    const parsed = ArtifactBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid artifact body" });
    const now = new Date().toISOString();
    await upsertPublishedArtifact({
      firmId,
      projectId: parsed.data.projectId,
      entity: parsed.data.entity,
      entityId: parsed.data.entityId,
      title: parsed.data.title,
      storageKey: parsed.data.storageKey,
      contentHash: parsed.data.contentHash,
      drawingPackageId: parsed.data.drawingPackageId,
      vdbUri: parsed.data.vdbUri,
      updatedAt: parsed.data.updatedAt ?? now,
    });
    return reply.send({ ok: true });
  });

  app.get("/api/ops/artifacts", async (req, reply) => {
    const firmId = await firmFromSyncToken(db, bearerFromReq(req));
    if (!firmId) return reply.code(401).send({ error: "invalid sync token" });
    const q = req.query as { projectId?: string; entity?: string };
    if (!q.projectId) return reply.code(400).send({ error: "projectId required" });
    const artifacts = await listPublishedArtifacts(firmId, q.projectId, q.entity);
    return reply.send({ artifacts });
  });
}
