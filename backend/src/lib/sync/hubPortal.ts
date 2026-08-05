import { type SyncEntity } from "@esti/contracts";
import type { DB } from "../../db/index.js";
import { env } from "../../env.js";
import { publishedForProject, publishedWherePayload } from "../../modules/sync/service.js";

/**
 * When the process is the cloud hub, portal reads should prefer the published
 * artifact store (`esti_sync_record`) so drafts never leak and bandwidth stays
 * on finalized payloads. On a node install, callers keep using live tables.
 */
export function portalReadsFromHub(): boolean {
  return env.ESTI_ROLE === "hub";
}

export async function hubPublishedForScope(
  db: DB,
  args: {
    firmId: string;
    entity: SyncEntity;
    scopeKey: string;
    scopeValue: string;
  },
) {
  return publishedWherePayload(db, args.firmId, args.entity, args.scopeKey, args.scopeValue);
}

export async function hubPublishedForProject(db: DB, entity: SyncEntity, projectId: string) {
  return publishedForProject(db, entity, projectId);
}

/** Map a sync_record row into the shape portal list UIs already expect. */
export function publishedPayloadRows<T extends Record<string, unknown>>(
  rows: Array<{ entityId: string; payload: unknown; fileKeys: unknown; updatedAt: Date }>,
): Array<T & { id: string; fileKeys: string[]; updatedAt: Date }> {
  return rows.map((r) => ({
    id: r.entityId,
    ...(r.payload as T),
    fileKeys: Array.isArray(r.fileKeys) ? (r.fileKeys as string[]) : [],
    updatedAt: r.updatedAt,
  }));
}
