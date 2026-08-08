// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Human Centric Works, Hospet

import { type SyncEntity } from "@esti/contracts";
import { and, desc, eq, inArray, isNotNull, ne } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import {
  approvals,
  drawings,
  feasibilityReports,
  inspections,
  invoices,
  progressReports,
  runningBills,
  siteVisits,
  tenders,
  transmittals,
} from "../../db/schema.js";
import { env } from "../../env.js";
import { publishedForProject, publishedWherePayload } from "../../modules/sync/service.js";
import { presignedGet } from "../storage.js";

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

export type PortalInvoiceRow = {
  ref: string;
  documentKind: string | null;
  status: string;
  grandTotalPaise: number | null;
  dateInvoice: string | null;
  pdfUrl: string | null;
};

/** ISSUED/PAID invoices — hub published store or live table (+ optional PDF URL). */
export async function portalIssuedInvoices(db: DB, projectId: string): Promise<PortalInvoiceRow[]> {
  if (portalReadsFromHub()) {
    const pub = publishedPayloadRows<{
      ref: string;
      documentKind: string | null;
      status: string;
      grandTotalPaise: number | null;
      dateInvoice: string | null;
      pdfStatus: string;
    }>(await hubPublishedForProject(db, "invoice", projectId));
    return Promise.all(
      pub
        .filter((iv) => iv.status === "ISSUED" || iv.status === "PAID")
        .map(async (iv) => ({
          ref: iv.ref,
          documentKind: iv.documentKind,
          status: iv.status,
          grandTotalPaise: iv.grandTotalPaise,
          dateInvoice: iv.dateInvoice,
          pdfUrl:
            iv.fileKeys[0] && iv.pdfStatus === "READY"
              ? await presignedGet(iv.fileKeys[0]).catch(() => null)
              : null,
        })),
    );
  }
  const invoiceRowsRaw = await db
    .select({
      ref: invoices.ref,
      documentKind: invoices.documentKind,
      status: invoices.status,
      grandTotalPaise: invoices.grandTotalPaise,
      dateInvoice: invoices.dateInvoice,
      pdfKey: invoices.pdfKey,
      pdfStatus: invoices.pdfStatus,
    })
    .from(invoices)
    .where(and(eq(invoices.projectId, projectId), inArray(invoices.status, ["ISSUED", "PAID"])))
    .orderBy(desc(invoices.createdAt));
  return Promise.all(
    invoiceRowsRaw.map(async ({ pdfKey, ...iv }) => ({
      ...iv,
      pdfUrl:
        pdfKey && iv.pdfStatus === "READY"
          ? await presignedGet(pdfKey).catch(() => null)
          : null,
    })),
  );
}

export type PortalApprovalRow = {
  id: string;
  title: string;
  entityType: string;
  status: string;
  sentDate: string | null;
  responseDate: string | null;
};

/** Non-draft approvals — hub published store or live table. */
export async function portalSentApprovals(db: DB, projectId: string): Promise<PortalApprovalRow[]> {
  if (portalReadsFromHub()) {
    return publishedPayloadRows<{
      title: string;
      entityType: string;
      status: string;
      sentDate: string | null;
      responseDate: string | null;
    }>(await hubPublishedForProject(db, "approval", projectId)).map((r) => ({
      id: r.id,
      title: r.title,
      entityType: r.entityType,
      status: r.status,
      sentDate: r.sentDate,
      responseDate: r.responseDate,
    }));
  }
  return db
    .select({
      id: approvals.id,
      title: approvals.title,
      entityType: approvals.entityType,
      status: approvals.status,
      sentDate: approvals.sentDate,
      responseDate: approvals.responseDate,
    })
    .from(approvals)
    .where(and(eq(approvals.projectId, projectId), ne(approvals.status, "DRAFT")))
    .orderBy(desc(approvals.createdAt));
}

const RUNNING_BILL_PORTAL_STATUSES = ["CERTIFIED", "SENT_TO_CLIENT", "CLOSED"] as const;

export type PortalRunningBillRow = {
  id: string;
  ref: string;
  title: string | null;
  billType: string | null;
  status: string;
  measurementDate: string | null;
  totalPaise: number | null;
  netPayablePaise: number | null;
};

/** Consultancy running bills visible to portals (CERTIFIED onward). Note: AProc pmcRaBills are separate. */
export async function portalPublishedRunningBills(
  db: DB,
  projectId: string,
): Promise<PortalRunningBillRow[]> {
  if (portalReadsFromHub()) {
    return publishedPayloadRows<{
      ref: string;
      title: string | null;
      billType: string | null;
      status: string;
      measurementDate: string | null;
      totalPaise: number | null;
      netPayablePaise: number | null;
    }>(await hubPublishedForProject(db, "runningBill", projectId))
      .filter((r) =>
        (RUNNING_BILL_PORTAL_STATUSES as readonly string[]).includes(r.status),
      )
      .map((r) => ({
        id: r.id,
        ref: r.ref,
        title: r.title,
        billType: r.billType,
        status: r.status,
        measurementDate: r.measurementDate,
        totalPaise: r.totalPaise,
        netPayablePaise: r.netPayablePaise,
      }));
  }
  return db
    .select({
      id: runningBills.id,
      ref: runningBills.ref,
      title: runningBills.title,
      billType: runningBills.billType,
      status: runningBills.status,
      measurementDate: runningBills.measurementDate,
      totalPaise: runningBills.totalPaise,
      netPayablePaise: runningBills.netPayablePaise,
    })
    .from(runningBills)
    .where(
      and(
        eq(runningBills.projectId, projectId),
        inArray(runningBills.status, [...RUNNING_BILL_PORTAL_STATUSES]),
      ),
    )
    .orderBy(desc(runningBills.updatedAt));
}

export type PortalInspectionRow = {
  id: string;
  ref: string;
  dateVisit: string | null;
  status: string;
  inspectorName: string | null;
  progress: string | null;
  pdfUrl: string | null;
};

/** ISSUED inspections (PDF issued to portal). */
export async function portalIssuedInspections(
  db: DB,
  projectId: string,
): Promise<PortalInspectionRow[]> {
  if (portalReadsFromHub()) {
    const pub = publishedPayloadRows<{
      ref: string;
      dateVisit: string | null;
      status: string;
      inspectorName: string | null;
      progress: string | null;
      pdfStatus: string;
    }>(await hubPublishedForProject(db, "inspection", projectId));
    return Promise.all(
      pub
        .filter((r) => r.status === "ISSUED")
        .map(async (r) => ({
          id: r.id,
          ref: r.ref,
          dateVisit: r.dateVisit,
          status: r.status,
          inspectorName: r.inspectorName,
          progress: r.progress,
          pdfUrl:
            r.fileKeys[0] && r.pdfStatus === "READY"
              ? await presignedGet(r.fileKeys[0]).catch(() => null)
              : null,
        })),
    );
  }
  const rows = await db
    .select({
      id: inspections.id,
      ref: inspections.ref,
      dateVisit: inspections.dateVisit,
      status: inspections.status,
      inspectorName: inspections.inspectorName,
      progress: inspections.progress,
      pdfKey: inspections.pdfKey,
      pdfStatus: inspections.pdfStatus,
    })
    .from(inspections)
    .where(and(eq(inspections.projectId, projectId), eq(inspections.status, "ISSUED")))
    .orderBy(desc(inspections.createdAt));
  return Promise.all(
    rows.map(async ({ pdfKey, pdfStatus, ...r }) => ({
      ...r,
      pdfUrl:
        pdfKey && pdfStatus === "READY"
          ? await presignedGet(pdfKey).catch(() => null)
          : null,
    })),
  );
}

export type PortalSiteVisitRow = {
  id: string;
  plannedDate: string;
  status: string;
  notes: string | null;
};

/** CONFIRMED site visits. */
export async function portalConfirmedSiteVisits(
  db: DB,
  projectId: string,
): Promise<PortalSiteVisitRow[]> {
  if (portalReadsFromHub()) {
    return publishedPayloadRows<{
      plannedDate: string;
      status: string;
      notes: string | null;
    }>(await hubPublishedForProject(db, "siteVisit", projectId))
      .filter((r) => r.status === "CONFIRMED")
      .map((r) => ({
        id: r.id,
        plannedDate: r.plannedDate,
        status: r.status,
        notes: r.notes,
      }));
  }
  return db
    .select({
      id: siteVisits.id,
      plannedDate: siteVisits.plannedDate,
      status: siteVisits.status,
      notes: siteVisits.notes,
    })
    .from(siteVisits)
    .where(and(eq(siteVisits.projectId, projectId), eq(siteVisits.status, "CONFIRMED")))
    .orderBy(desc(siteVisits.plannedDate));
}

export type PortalTenderRow = {
  id: string;
  title: string;
  category: string | null;
  status: string;
  dueDate: string | null;
  awardedContractorId: string | null;
};

/** AWARDED tenders. */
export async function portalAwardedTenders(db: DB, projectId: string): Promise<PortalTenderRow[]> {
  if (portalReadsFromHub()) {
    return publishedPayloadRows<{
      title: string;
      category: string | null;
      status: string;
      dueDate: string | null;
      awardedContractorId: string | null;
    }>(await hubPublishedForProject(db, "tender", projectId))
      .filter((r) => r.status === "AWARDED")
      .map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        status: r.status,
        dueDate: r.dueDate,
        awardedContractorId: r.awardedContractorId,
      }));
  }
  return db
    .select({
      id: tenders.id,
      title: tenders.title,
      category: tenders.category,
      status: tenders.status,
      dueDate: tenders.dueDate,
      awardedContractorId: tenders.awardedContractorId,
    })
    .from(tenders)
    .where(and(eq(tenders.projectId, projectId), eq(tenders.status, "AWARDED")))
    .orderBy(desc(tenders.updatedAt));
}

export type PortalSiteReferenceRow = {
  id: string;
  pdfStatus: string | null;
  generatedAt: Date | string | null;
  pdfUrl: string | null;
};

/** Frozen feasibility / site-reference PDF (latest published). */
export async function portalSiteReference(
  db: DB,
  projectId: string,
): Promise<PortalSiteReferenceRow | null> {
  if (portalReadsFromHub()) {
    const rows = publishedPayloadRows<{
      pdfStatus: string | null;
      generatedAt: Date | string | null;
    }>(await hubPublishedForProject(db, "siteReference", projectId));
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      pdfStatus: r.pdfStatus,
      generatedAt: r.generatedAt,
      pdfUrl:
        r.fileKeys[0] && r.pdfStatus === "READY"
          ? await presignedGet(r.fileKeys[0]).catch(() => null)
          : null,
    };
  }
  const [r] = await db
    .select({
      id: feasibilityReports.id,
      pdfStatus: feasibilityReports.pdfStatus,
      generatedAt: feasibilityReports.generatedAt,
      pdfKey: feasibilityReports.pdfKey,
    })
    .from(feasibilityReports)
    .where(eq(feasibilityReports.projectId, projectId))
    .orderBy(desc(feasibilityReports.generatedAt))
    .limit(1);
  if (!r) return null;
  return {
    id: r.id,
    pdfStatus: r.pdfStatus,
    generatedAt: r.generatedAt,
    pdfUrl:
      r.pdfKey && r.pdfStatus === "READY"
        ? await presignedGet(r.pdfKey).catch(() => null)
        : null,
  };
}
