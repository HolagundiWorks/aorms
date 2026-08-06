import { createHash } from "node:crypto";
import { type SyncEntity, type SyncIngestBody } from "@esti/contracts";
import { and, desc, eq } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { licenseInstalls, licenses, syncRecords } from "../../db/schema.js";
import * as hlp from "../../db/schema/licensing-platform.js";
import { getObjectBuffer, putObject } from "../../lib/storage.js";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function sha256buf(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** Resolve a node's raw sync bearer to the hub-assigned firm id, or null.
 *  Checks legacy `esti_license_install` first, then HCW License Manager devices
 *  (LF4 panel path — firm namespace is the platform organisation id). */
export async function firmFromSyncToken(db: DB, bearer: string | undefined): Promise<string | null> {
  if (!bearer) return null;
  const hash = sha256(bearer);

  const [legacy] = await db
    .select({ firmId: licenses.firmId })
    .from(licenseInstalls)
    .innerJoin(licenses, eq(licenses.id, licenseInstalls.licenseId))
    .where(eq(licenseInstalls.syncTokenHash, hash))
    .limit(1);
  if (legacy?.firmId) return legacy.firmId;

  const [panel] = await db
    .select({ orgId: hlp.licenses.orgId })
    .from(hlp.devices)
    .innerJoin(hlp.licenses, eq(hlp.licenses.id, hlp.devices.licenseId))
    .where(and(eq(hlp.devices.syncTokenHash, hash), eq(hlp.devices.status, "ACTIVE")))
    .limit(1);
  return panel?.orgId ?? null;
}

/**
 * Best-effort mirror of object keys into hub storage. Skips when contentHash
 * matches the existing record (bandwidth optimisation).
 */
async function mirrorFiles(
  fileKeys: string[],
  contentHash: string | undefined,
  existingHash: string | null | undefined,
): Promise<string | null> {
  if (!fileKeys.length) return contentHash ?? null;
  if (contentHash && existingHash && contentHash === existingHash) return existingHash;

  let lastHash: string | null = contentHash ?? null;
  for (const key of fileKeys) {
    try {
      const buf = await getObjectBuffer(key);
      lastHash = sha256buf(buf);
      if (contentHash && existingHash && contentHash === existingHash) continue;
      // Re-put under the same key into hub storage (S3/FS as configured).
      const ext = key.includes(".") ? key.slice(key.lastIndexOf(".")) : "";
      const ctype =
        ext === ".pdf"
          ? "application/pdf"
          : ext === ".svg"
            ? "image/svg+xml"
            : "application/octet-stream";
      await putObject(key, buf, ctype);
    } catch (e) {
      console.warn(`mirrorFiles(${key}) failed:`, String(e));
    }
  }
  return lastHash;
}

/** Upsert (or delete) a published record into the per-firm hub store. Returns the remote id. */
export async function ingestRecord(db: DB, firmId: string, body: SyncIngestBody): Promise<string> {
  const where = and(
    eq(syncRecords.firmId, firmId),
    eq(syncRecords.entity, body.entity),
    eq(syncRecords.entityId, body.entityId),
  );

  if (body.op === "DELETE") {
    await db.delete(syncRecords).where(where);
    return "";
  }

  const [existing] = await db.select().from(syncRecords).where(where).limit(1);
  const hash = await mirrorFiles(
    body.fileKeys ?? [],
    body.contentHash,
    existing?.contentHash,
  );

  if (existing) {
    await db
      .update(syncRecords)
      .set({
        payload: body.payload,
        fileKeys: body.fileKeys,
        contentHash: hash,
        updatedAt: new Date(),
      })
      .where(eq(syncRecords.id, existing.id));
    return existing.id;
  }
  const [created] = await db
    .insert(syncRecords)
    .values({
      firmId,
      entity: body.entity,
      entityId: body.entityId,
      payload: body.payload,
      fileKeys: body.fileKeys,
      contentHash: hash,
    })
    .returning({ id: syncRecords.id });
  return created!.id;
}

/**
 * Read published records for one firm (the seam the hub portals filter on). On a
 * `node` install `firmId` is a constant so behaviour matches today; on the hub it
 * isolates each firm's published data. Portals further filter `payload` by
 * clientId/consultantId/contractorId.
 */
export async function publishedForFirm(db: DB, firmId: string, entity?: SyncEntity) {
  const where = entity
    ? and(eq(syncRecords.firmId, firmId), eq(syncRecords.entity, entity))
    : eq(syncRecords.firmId, firmId);
  return db.select().from(syncRecords).where(where).orderBy(desc(syncRecords.updatedAt));
}

/** Published records whose payload matches a JSON key (clientId / projectId / …). */
export async function publishedWherePayload(
  db: DB,
  firmId: string,
  entity: SyncEntity,
  key: string,
  value: string,
) {
  const rows = await publishedForFirm(db, firmId, entity);
  return rows.filter((r) => {
    const p = r.payload as Record<string, unknown>;
    return p?.[key] === value;
  });
}

/**
 * Hub portal helper: list published artifacts for a project across firms
 * (entity ids are UUIDs; payload.projectId scopes the portal view).
 */
export async function publishedForProject(db: DB, entity: SyncEntity, projectId: string) {
  const rows = await db
    .select()
    .from(syncRecords)
    .where(eq(syncRecords.entity, entity))
    .orderBy(desc(syncRecords.updatedAt));
  return rows.filter((r) => {
    const p = r.payload as Record<string, unknown>;
    return p?.projectId === projectId;
  });
}
