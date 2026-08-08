// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Human Centric Works, Hospet

import { type SyncEntity } from "@esti/contracts";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { drawings, progressReports, transmittals } from "../../db/schema.js";
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

export type PortalDrawingRow = { id: string; ref: string; title: string; status: string };

/** READY drawings — hub published store or live table. */
export async function portalReadyDrawings(db: DB, projectId: string): Promise<PortalDrawingRow[]> {
  if (portalReadsFromHub()) {
    return publishedPayloadRows<{
      ref: string;
      title: string;
      status: string;
    }>(await hubPublishedForProject(db, "drawing", projectId))
      .filter((d) => d.status === "READY")
      .map((d) => ({ id: d.id, ref: d.ref, title: d.title, status: d.status }));
  }
  return db
    .select({
      id: drawings.id,
      ref: drawings.ref,
      title: drawings.title,
      status: drawings.status,
    })
    .from(drawings)
    .where(and(eq(drawings.projectId, projectId), eq(drawings.status, "READY")))
    .orderBy(desc(drawings.createdAt));
}

export type PortalTransmittalRow = {
  id: string;
  ref: string;
  recipient: string | null;
  purpose: string | null;
  channel: string | null;
  dateIssued: string | null;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
};

/** Issued transmittals — hub published store or live table. */
export async function portalIssuedTransmittals(
  db: DB,
  projectId: string,
): Promise<PortalTransmittalRow[]> {
  if (portalReadsFromHub()) {
    return publishedPayloadRows<{
      ref: string;
      recipient: string | null;
      purpose: string | null;
      channel: string | null;
      dateIssued: string | null;
    }>(await hubPublishedForProject(db, "transmittal", projectId))
      .filter((t) => t.dateIssued != null && String(t.dateIssued).length > 0)
      .map((t) => ({
        id: t.id,
        ref: t.ref,
        recipient: t.recipient,
        purpose: t.purpose,
        channel: t.channel,
        dateIssued: t.dateIssued,
        acknowledgedAt: null,
        acknowledgedBy: null,
      }));
  }
  return db
    .select({
      id: transmittals.id,
      ref: transmittals.ref,
      recipient: transmittals.recipient,
      purpose: transmittals.purpose,
      channel: transmittals.channel,
      dateIssued: transmittals.dateIssued,
      acknowledgedAt: transmittals.acknowledgedAt,
      acknowledgedBy: transmittals.acknowledgedBy,
    })
    .from(transmittals)
    .where(and(eq(transmittals.projectId, projectId), isNotNull(transmittals.dateIssued)))
    .orderBy(desc(transmittals.dateIssued));
}

export type PortalProgressReportRow = {
  id: string;
  periodStart: string;
  periodEnd: string;
  physicalProgressPct: number | null;
  openSnagCount: number | null;
  status: string;
};

/** ISSUED progress reports — hub published store or live table. */
export async function portalIssuedProgressReports(
  db: DB,
  projectId: string,
): Promise<PortalProgressReportRow[]> {
  if (portalReadsFromHub()) {
    return publishedPayloadRows<{
      periodStart: string;
      periodEnd: string;
      physicalProgressPct: number | null;
      openSnagCount: number | null;
      status: string;
    }>(await hubPublishedForProject(db, "progressReport", projectId))
      .filter((r) => r.status === "ISSUED")
      .map((r) => ({
        id: r.id,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        physicalProgressPct: r.physicalProgressPct,
        openSnagCount: r.openSnagCount,
        status: r.status,
      }));
  }
  return db
    .select({
      id: progressReports.id,
      periodStart: progressReports.periodStart,
      periodEnd: progressReports.periodEnd,
      physicalProgressPct: progressReports.physicalProgressPct,
      openSnagCount: progressReports.openSnagCount,
      status: progressReports.status,
    })
    .from(progressReports)
    .where(
      and(eq(progressReports.projectId, projectId), eq(progressReports.status, "ISSUED")),
    )
    .orderBy(desc(progressReports.periodEnd));
}
