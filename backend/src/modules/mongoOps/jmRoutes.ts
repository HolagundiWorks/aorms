/**
 * Desktop joint-measurement pull (Bearer syncToken).
 * Canon: docs/esti/AQC-JM-SYNC.md · ROADMAP S11
 */
import type { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import { env } from "../../env.js";
import { loadJmBundle } from "../jointMeasurement/service.js";
import { firmFromSyncToken, publishedWherePayload } from "../sync/service.js";

function bearerFromReq(req: { headers: { authorization?: string } }): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return undefined;
}

/**
 * GET /api/ops/joint-measurements?projectId= — APPROVED JM bundles firm-scoped via sync publish.
 */
export function registerJmOpsRoutes(app: FastifyInstance): void {
  if (env.ESTI_ROLE !== "hub" && !env.ESTI_COLOCATED_HUB) return;

  app.get("/api/ops/joint-measurements", async (req, reply) => {
    const firmId = await firmFromSyncToken(db, bearerFromReq(req));
    if (!firmId) return reply.code(401).send({ error: "invalid sync token" });
    const q = req.query as { projectId?: string };
    if (!q.projectId?.trim()) return reply.code(400).send({ error: "projectId required" });

    const published = await publishedWherePayload(
      db,
      firmId,
      "jointMeasurement",
      "projectId",
      q.projectId.trim(),
    );

    const jointMeasurements = [];
    for (const rec of published) {
      try {
        const { header, lines } = await loadJmBundle(db, rec.entityId);
        if (header.status !== "APPROVED") continue;
        jointMeasurements.push({
          id: header.id,
          projectId: header.projectId,
          contractorId: header.contractorId,
          subject: header.subject,
          measuredOn: header.measuredOn,
          status: header.status,
          reviewedAt: header.reviewedAt?.toISOString?.() ?? header.reviewedAt,
          lines: lines.map((line) => ({
            id: line.id,
            code: line.code,
            description: line.description,
            uom: line.uom,
            measureKind: line.measureKind,
            lengthMm: line.lengthMm,
            breadthMm: line.breadthMm,
            heightMm: line.heightMm,
            countNos: line.countNos,
            quantity: line.quantity,
            sortOrder: line.sortOrder,
          })),
        });
      } catch {
        /* skip missing / deleted */
      }
    }

    return reply.send({ jointMeasurements });
  });
}
