import { type SyncEntity } from "@esti/contracts";
import { eq } from "drizzle-orm";
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
import { enqueuePublish } from "./outbox.js";

type Dto = { payload: Record<string, unknown>; fileKeys: string[]; contentHash?: string };

/**
 * Build the portal-shaped DTO for a finalized record. The payload carries the
 * scoping keys the hub portals filter on (projectId / clientId / contractorId)
 * plus the fields the portal renders; `fileKeys` are object keys to mirror to
 * hub storage when available.
 */
async function buildDto(db: DB, entity: SyncEntity, id: string): Promise<Dto | null> {
  switch (entity) {
    case "invoice": {
      const [r] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
      if (!r) return null;
      return {
        payload: {
          ref: r.ref,
          status: r.status,
          projectId: r.projectId,
          clientId: r.clientId,
          documentKind: r.documentKind,
          dateInvoice: r.dateInvoice,
          grandTotalPaise: r.grandTotalPaise,
          netReceivablePaise: r.netReceivablePaise,
          pdfStatus: r.pdfStatus,
        },
        fileKeys: r.pdfKey ? [r.pdfKey] : [],
      };
    }
    case "transmittal": {
      const [r] = await db.select().from(transmittals).where(eq(transmittals.id, id)).limit(1);
      if (!r) return null;
      return {
        payload: {
          ref: r.ref,
          projectId: r.projectId,
          recipient: r.recipient,
          purpose: r.purpose,
          channel: r.channel,
          dateIssued: r.dateIssued,
          notes: r.notes,
          pdfStatus: r.pdfStatus,
        },
        fileKeys: r.pdfKey ? [r.pdfKey] : [],
      };
    }
    case "approval": {
      const [r] = await db.select().from(approvals).where(eq(approvals.id, id)).limit(1);
      if (!r) return null;
      return {
        payload: {
          projectId: r.projectId,
          entityType: r.entityType,
          title: r.title,
          recipient: r.recipient,
          status: r.status,
          sentDate: r.sentDate,
          responseDate: r.responseDate,
          remarks: r.remarks,
        },
        fileKeys: [],
      };
    }
    case "drawing": {
      const [r] = await db.select().from(drawings).where(eq(drawings.id, id)).limit(1);
      if (!r) return null;
      return {
        payload: {
          ref: r.ref,
          projectId: r.projectId,
          title: r.title,
          status: r.status,
          revNo: r.revNo,
          issuePdfStatus: r.issuePdfStatus,
        },
        fileKeys: r.issuePdfKey ? [r.issuePdfKey] : [],
      };
    }
    case "inspection": {
      const [r] = await db.select().from(inspections).where(eq(inspections.id, id)).limit(1);
      if (!r) return null;
      return {
        payload: {
          ref: r.ref,
          projectId: r.projectId,
          dateVisit: r.dateVisit,
          status: r.status,
          inspectorName: r.inspectorName,
          progress: r.progress,
          pdfStatus: r.pdfStatus,
        },
        fileKeys: r.pdfKey ? [r.pdfKey] : [],
      };
    }
    case "siteVisit": {
      const [r] = await db.select().from(siteVisits).where(eq(siteVisits.id, id)).limit(1);
      if (!r) return null;
      return {
        payload: {
          projectId: r.projectId,
          plannedDate: r.plannedDate,
          status: r.status,
          contractorId: r.contractorId,
          supervisorUserId: r.supervisorUserId,
          notes: r.notes,
        },
        fileKeys: [],
      };
    }
    case "tender": {
      const [r] = await db.select().from(tenders).where(eq(tenders.id, id)).limit(1);
      if (!r) return null;
      return {
        payload: {
          projectId: r.projectId,
          title: r.title,
          category: r.category,
          status: r.status,
          dueDate: r.dueDate,
          awardedContractorId: r.awardedContractorId,
        },
        fileKeys: [],
      };
    }
    case "runningBill": {
      const [r] = await db.select().from(runningBills).where(eq(runningBills.id, id)).limit(1);
      if (!r) return null;
      return {
        payload: {
          ref: r.ref,
          projectId: r.projectId,
          contractorId: r.contractorId,
          title: r.title,
          billType: r.billType,
          status: r.status,
          measurementDate: r.measurementDate,
          totalPaise: r.totalPaise,
          netPayablePaise: r.netPayablePaise,
        },
        fileKeys: [],
      };
    }
    case "siteReference": {
      const [r] = await db
        .select()
        .from(feasibilityReports)
        .where(eq(feasibilityReports.id, id))
        .limit(1);
      if (!r) return null;
      return {
        payload: {
          projectId: r.projectId,
          pdfStatus: r.pdfStatus,
          generatedAt: r.generatedAt,
        },
        fileKeys: r.pdfKey ? [r.pdfKey] : [],
      };
    }
    case "progressReport": {
      const [r] = await db.select().from(progressReports).where(eq(progressReports.id, id)).limit(1);
      if (!r) return null;
      return {
        payload: {
          projectId: r.projectId,
          status: r.status,
          periodStart: r.periodStart,
          periodEnd: r.periodEnd,
          physicalProgressPct: r.physicalProgressPct,
          pdfStatus: r.pdfStatus,
        },
        fileKeys: r.pdfKey ? [r.pdfKey] : [],
      };
    }
    default:
      return null;
  }
}

/**
 * Best-effort publish of a finalized record to the outbox. Never throws — a
 * publish failure must not break the finalize/issue mutation that called it.
 */
export async function publishEntity(db: DB, entity: SyncEntity, id: string): Promise<void> {
  try {
    const dto = await buildDto(db, entity, id);
    if (!dto) return;
    await enqueuePublish(db, {
      entity,
      entityId: id,
      payload: dto.payload,
      fileKeys: dto.fileKeys,
      contentHash: dto.contentHash,
    });
  } catch (e) {
    console.warn(`publishEntity(${entity}, ${id}) failed:`, String(e));
  }
}
