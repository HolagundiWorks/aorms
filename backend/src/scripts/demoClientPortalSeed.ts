/**
 * Client portal demo extras — Kapoor Residence rows that pass portal visibility
 * filters (ISSUED / READY / SENT / CERTIFIED / AWARDED / CONFIRMED / visibility ALL).
 * Consumed by seedDemo.ts (full seed + backfill).
 */
import { and, count, eq } from "drizzle-orm";
import type { DB } from "../db/index.js";
import {
  activities,
  approvals,
  clients,
  contractors,
  drawings,
  feasibilityReports,
  inspections,
  moms,
  pmcRaBills,
  pmcRaLines,
  pmcSteelCerts,
  portalSubmissions,
  progressReports,
  projectOffices,
  runningBillItems,
  runningBills,
  siteVisits,
  tenders,
  users,
} from "../db/schema.js";
import { emailMatches } from "../lib/email.js";
import { nextRef } from "../lib/numbering.js";
import { dayOffset } from "./demoStudioSeed.js";

const CLIENT_PORTAL_EMAIL = "client@demo.aorms.in";
const MARKER_SUMMARY = "Kapoor portal demo — schematic package ready for review";

/**
 * Enrich Kapoor Residence so `client@demo.aorms.in` can exercise every firm-portal
 * tab (Updates · Project · Progress · Drawings · Documents). Idempotent.
 */
export async function seedDemoClientPortalExtras(
  db: DB,
  principalId: string,
): Promise<void> {
  // Prefer the Kapoor CRM row that owns Kapoor Residence (duplicate email rows can exist).
  const [kapoor] = await db
    .select({
      clientId: clients.id,
      clientName: clients.name,
      projectId: projectOffices.id,
      projectTitle: projectOffices.title,
    })
    .from(projectOffices)
    .innerJoin(clients, eq(clients.id, projectOffices.clientId))
    .where(eq(projectOffices.title, "Kapoor Residence — Sarjapur"))
    .limit(1);
  if (!kapoor) {
    console.log("  client portal extras: skipped (Kapoor Residence project missing)");
    return;
  }

  const projectId = kapoor.projectId;
  const kapoorClient = { id: kapoor.clientId, name: kapoor.clientName };
  const [clientUser] = await db
    .select({ id: users.id, clientId: users.clientId })
    .from(users)
    .where(emailMatches(users.email, CLIENT_PORTAL_EMAIL))
    .limit(1);
  // Bind portal login to the project-owning client so myProjects sees Kapoor Residence.
  if (clientUser && clientUser.clientId !== kapoor.clientId) {
    await db
      .update(users)
      .set({ clientId: kapoor.clientId, role: "CLIENT", fullName: kapoor.clientName })
      .where(eq(users.id, clientUser.id));
  }
  const [contractor] = await db
    .select({ id: contractors.id, name: contractors.name })
    .from(contractors)
    .limit(1);

  // Approvals — promote DRAFT → SENT; ensure one REVISIONS row for respond demo.
  const approvalRows = await db
    .select({ id: approvals.id, status: approvals.status, title: approvals.title })
    .from(approvals)
    .where(eq(approvals.projectId, projectId));
  for (const row of approvalRows) {
    if (row.status === "DRAFT") {
      await db
        .update(approvals)
        .set({
          status: "SENT",
          sentDate: dayOffset(-4),
          channel: "Client portal",
          responseDate: null,
          remarks: null,
        })
        .where(eq(approvals.id, row.id));
    }
  }
  if (!approvalRows.some((a) => a.status === "REVISIONS" || a.status === "SENT")) {
    await db.insert(approvals).values({
      projectId,
      entityType: "DRAWING_SET",
      title: "Schematic design package",
      recipient: kapoorClient.name,
      channel: "Client portal",
      status: "SENT",
      sentDate: dayOffset(-4),
      createdById: principalId,
    });
  }
  if (!approvalRows.some((a) => a.status === "REVISIONS")) {
    await db.insert(approvals).values({
      projectId,
      entityType: "DRAWING_SET",
      title: "Material palette — client comments",
      recipient: kapoorClient.name,
      channel: "Client portal",
      status: "REVISIONS",
      sentDate: dayOffset(-11),
      remarks: "Prefer warmer oak tone; stone sample B rejected.",
      createdById: principalId,
    });
  }

  // Inspections — ISSUED (portal Progress / Documents).
  const inspectionRows = await db
    .select({ id: inspections.id, status: inspections.status })
    .from(inspections)
    .where(eq(inspections.projectId, projectId));
  if (inspectionRows.length === 0) {
    const { ref } = await nextRef(db, "inspection", "SIR");
    await db.insert(inspections).values({
      ref,
      projectId,
      dateVisit: dayOffset(-3),
      weather: "Clear",
      attendees: "Rahul Menon, site supervisor, Kapoor family representative",
      progress: "Site clearing complete; footing layout marked.",
      observations: "Boundary wall alignment confirmed against survey.",
      instructions: "Submit soil investigation before footing pour.",
      nextVisit: dayOffset(7),
      inspectorName: "Rahul Menon",
      status: "ISSUED",
    });
  } else {
    for (const row of inspectionRows) {
      if (row.status !== "ISSUED") {
        await db.update(inspections).set({ status: "ISSUED" }).where(eq(inspections.id, row.id));
      }
    }
  }

  // READY drawings (+ revision chain for revision dashboard).
  const drawingCount =
    (await db.select({ n: count() }).from(drawings).where(eq(drawings.projectId, projectId)))[0]
      ?.n ?? 0;
  if (drawingCount === 0) {
    const { ref: r1 } = await nextRef(db, "drawing", "DRW");
    const [root] = await db
      .insert(drawings)
      .values({
        ref: r1,
        projectId,
        title: "Ground floor plan — Kapoor Residence",
        fileName: "KR-A-101-R1.dxf",
        fileHash: "demo-kapoor-a101-r1",
        storageKey: "demo/kapoor/KR-A-101-R1.dxf",
        sizeBytes: 48_120,
        status: "READY",
        revNo: 1,
        isCurrent: false,
        reviewStatus: "APPROVED",
        reviewedById: principalId,
        reviewedAt: new Date(),
      })
      .returning({ id: drawings.id });
    if (root) {
      const { ref: r2 } = await nextRef(db, "drawing", "DRW");
      await db.insert(drawings).values({
        ref: r2,
        projectId,
        title: "Ground floor plan — Kapoor Residence",
        fileName: "KR-A-101-R2.dxf",
        fileHash: "demo-kapoor-a101-r2",
        storageKey: "demo/kapoor/KR-A-101-R2.dxf",
        sizeBytes: 51_400,
        status: "READY",
        revNo: 2,
        rootId: root.id,
        revisionNote: "Client-driven: kitchen island relocated 900mm south.",
        isCurrent: true,
        reviewStatus: "APPROVED",
        reviewedById: principalId,
        reviewedAt: new Date(),
      });
    }
    const { ref: elevRef } = await nextRef(db, "drawing", "DRW");
    await db.insert(drawings).values({
      ref: elevRef,
      projectId,
      title: "Front elevation — Kapoor Residence",
      fileName: "KR-A-201-R0.dxf",
      fileHash: "demo-kapoor-a201-r0",
      storageKey: "demo/kapoor/KR-A-201-R0.dxf",
      sizeBytes: 36_800,
      status: "READY",
      revNo: 1,
      isCurrent: true,
      reviewStatus: "APPROVED",
      reviewedById: principalId,
      reviewedAt: new Date(),
    });
  }

  // ISSUED progress report.
  const prCount =
    (
      await db
        .select({ n: count() })
        .from(progressReports)
        .where(eq(progressReports.projectId, projectId))
    )[0]?.n ?? 0;
  if (prCount === 0) {
    await db.insert(progressReports).values({
      projectId,
      periodStart: dayOffset(-30),
      periodEnd: dayOffset(-1),
      narrative:
        "Inception wrap-up: survey coordinated, concept Option B preferred. Site clearing started; footing layout next fortnight.",
      physicalProgressPct: 8,
      scheduleProgressPct: 10,
      openSnagCount: 1,
      openRfiCount: 0,
      status: "ISSUED",
      createdById: principalId,
    });
  }

  // CONFIRMED site visit.
  const visitCount =
    (await db.select({ n: count() }).from(siteVisits).where(eq(siteVisits.projectId, projectId)))[0]
      ?.n ?? 0;
  if (visitCount === 0) {
    await db.insert(siteVisits).values([
      {
        projectId,
        plannedDate: dayOffset(-2),
        status: "CONFIRMED",
        notes: "Boundary & setback walk-through with Kapoor Family",
        createdById: principalId,
      },
      {
        projectId,
        plannedDate: dayOffset(5),
        status: "PLANNED",
        notes: "Footing layout check",
        createdById: principalId,
      },
    ]);
  }

  // ISSUED MoM (portal listMoms filters ISSUED, not FINAL).
  const momCount =
    (await db.select({ n: count() }).from(moms).where(eq(moms.projectId, projectId)))[0]?.n ?? 0;
  if (momCount === 0) {
    const { ref } = await nextRef(db, "mom", "MOM");
    await db.insert(moms).values({
      ref,
      projectId,
      title: "Concept review — Kapoor Residence",
      meetingDate: dayOffset(-6),
      venue: "Studio Sharma & Associates / video",
      attendees: "Rohit Kapoor, Meera Kapoor, Vihaan Sharma, Ananya Iyer",
      minutes:
        "Option B courtyard villa confirmed. Client requested warmer oak palette. Next: schematic package via client portal for approval.",
      status: "ISSUED",
    });
  }

  // CERTIFIED consultancy running bill on Kapoor.
  if (contractor) {
    const [existingRa] = await db
      .select({ id: runningBills.id })
      .from(runningBills)
      .where(eq(runningBills.projectId, projectId))
      .limit(1);
    if (!existingRa) {
      const raItems = [
        { description: "Site clearing & excavation to formation", unit: "cum", qty: 85, ratePaise: 420_00 },
        { description: "PCC 1:4:8 under footings", unit: "cum", qty: 12, ratePaise: 5_200_00 },
      ];
      const lineAmounts = raItems.map((it) => Math.round(it.qty * it.ratePaise));
      const totalPaise = lineAmounts.reduce((a, b) => a + b, 0);
      const retentionPaise = Math.round(totalPaise * 0.05);
      const taxTdsPaise = Math.round(totalPaise * 0.02);
      const netPayablePaise = totalPaise - retentionPaise - taxTdsPaise;
      const { ref } = await nextRef(db, "runningbill", "RA");
      const [raBill] = await db
        .insert(runningBills)
        .values({
          ref,
          projectId,
          contractorId: contractor.id,
          title: "RA Bill 01 — Site clearing & PCC",
          billType: "RA",
          status: "CERTIFIED",
          measurementDate: dayOffset(-5),
          notes: "Demo RA for Kapoor client portal Documents tab.",
          totalPaise,
          retentionPaise,
          taxTdsPaise,
          netPayablePaise,
          createdById: principalId,
        })
        .returning();
      if (raBill) {
        await db.insert(runningBillItems).values(
          raItems.map((it, idx) => ({
            runningBillId: raBill.id,
            sortOrder: idx,
            description: it.description,
            unit: it.unit,
            qty: it.qty,
            ratePaise: it.ratePaise,
            amountPaise: lineAmounts[idx]!,
            previousBilledQty: 0,
            cumulativeBilledQty: it.qty,
          })),
        );
      }
    }
  }

  // AWARDED tender (Project tab).
  if (contractor) {
    const [existingTender] = await db
      .select({ id: tenders.id })
      .from(tenders)
      .where(and(eq(tenders.projectId, projectId), eq(tenders.status, "AWARDED")))
      .limit(1);
    if (!existingTender) {
      await db.insert(tenders).values({
        projectId,
        title: "Civil package — site & foundations",
        category: "Civil",
        scope: "Site clearing, PCC, and RCC foundations per schematic set.",
        status: "AWARDED",
        dueDate: dayOffset(-10),
        instructions: "Awarded after lump-sum comparison.",
        awardedContractorId: contractor.id,
        createdById: principalId,
      });
    }
  }

  // Site reference (feasibility).
  const siteRefCount =
    (
      await db
        .select({ n: count() })
        .from(feasibilityReports)
        .where(eq(feasibilityReports.projectId, projectId))
    )[0]?.n ?? 0;
  if (siteRefCount === 0) {
    await db.insert(feasibilityReports).values({
      projectId,
      snapshot: {
        plotAreaSqm: 420,
        jurisdiction: "BBMP",
        notes: "Demo site reference for Kapoor Residence portal Project tab.",
      },
      generatedAt: new Date(),
      shareToken: "demo-kapoor-site-ref",
      pdfStatus: "NONE",
      createdById: principalId,
    });
  }

  // AProc CERTIFIED RA + steel (Documents / Updates certifications).
  const pmcRaCount =
    (await db.select({ n: count() }).from(pmcRaBills).where(eq(pmcRaBills.projectId, projectId)))[0]
      ?.n ?? 0;
  if (pmcRaCount === 0) {
    const { ref } = await nextRef(db, "pmc_ra_bill", "RA");
    const [bill] = await db
      .insert(pmcRaBills)
      .values({
        projectId,
        ref,
        billNo: "KR-RA-01",
        periodStart: dayOffset(-28),
        periodEnd: dayOffset(-1),
        status: "CERTIFIED",
        grossPaise: 4_85_000_00,
        retentionPaise: 24_250_00,
        narrative: "Certified civil bill — site & PCC (AProc demo).",
        certifiedAt: new Date(),
        certifiedById: principalId,
        createdById: principalId,
      })
      .returning();
    if (bill) {
      await db.insert(pmcRaLines).values([
        {
          billId: bill.id,
          sortOrder: 0,
          description: "Site clearing",
          unit: "cum",
          previousQty: 0,
          thisQty: 85,
          ratePaise: 420_00,
          amountPaise: 85 * 420_00,
        },
        {
          billId: bill.id,
          sortOrder: 1,
          description: "PCC under footings",
          unit: "cum",
          previousQty: 0,
          thisQty: 12,
          ratePaise: 5_200_00,
          amountPaise: 12 * 5_200_00,
        },
      ]);
    }
  }

  const steelCount =
    (
      await db
        .select({ n: count() })
        .from(pmcSteelCerts)
        .where(eq(pmcSteelCerts.projectId, projectId))
    )[0]?.n ?? 0;
  if (steelCount === 0) {
    const { ref } = await nextRef(db, "pmc_steel_cert", "STL");
    await db.insert(pmcSteelCerts).values({
      projectId,
      ref,
      periodStart: dayOffset(-28),
      periodEnd: dayOffset(-1),
      status: "CERTIFIED",
      issuedKg: 1200,
      consumedKg: 1125,
      wastagePct: 6.25,
      narrative: "Starter bars & footing cages — first certification.",
      certifiedAt: new Date(),
      certifiedById: principalId,
      createdById: principalId,
    });
  }

  // Sample portal submissions (change request + feedback).
  const subCount =
    (
      await db
        .select({ n: count() })
        .from(portalSubmissions)
        .where(eq(portalSubmissions.projectId, projectId))
    )[0]?.n ?? 0;
  if (subCount === 0 && clientUser) {
    await db.insert(portalSubmissions).values([
      {
        projectId,
        clientId: kapoorClient.id,
        kind: "CHANGE_REQUEST",
        subject: "Relocate kitchen island toward courtyard",
        body: "Prefer island closer to north glazing for morning light.",
        status: "OPEN",
        revisionCategory: "MINOR",
        submittedById: clientUser.id,
      },
      {
        projectId,
        clientId: kapoorClient.id,
        kind: "FEEDBACK",
        subject: "Portal walkthrough — schematic package",
        body: "Clear drawings; please keep material samples linked next time.",
        rating: 5,
        status: "OPEN",
        submittedById: clientUser.id,
      },
    ]);
  }

  // Client-visible activity feed.
  const marker =
    (
      await db
        .select({ n: count() })
        .from(activities)
        .where(and(eq(activities.projectId, projectId), eq(activities.summary, MARKER_SUMMARY)))
    )[0]?.n ?? 0;
  if (marker === 0) {
    await db.insert(activities).values([
      {
        projectId,
        objectType: "drawing",
        eventType: "ready",
        actorId: principalId,
        actorName: "Ananya Iyer",
        visibility: "ALL",
        summary: MARKER_SUMMARY,
      },
      {
        projectId,
        objectType: "approval",
        eventType: "sent",
        actorId: principalId,
        actorName: "Vihaan Sharma",
        visibility: "ALL",
        summary: "Schematic design package sent for Kapoor Family approval",
      },
      {
        projectId,
        objectType: "invoice",
        eventType: "issued",
        actorId: principalId,
        actorName: "Deepa Krishnan",
        visibility: "ALL",
        summary: "Fee invoice issued — Kapoor Residence inception stage",
      },
      {
        projectId,
        objectType: "site_visit",
        eventType: "confirmed",
        actorName: "Rahul Menon",
        visibility: "ALL",
        summary: "Site visit confirmed — boundary & setback walk-through",
      },
      {
        projectId,
        objectType: "progress_report",
        eventType: "issued",
        actorId: principalId,
        actorName: "Vihaan Sharma",
        visibility: "ALL",
        summary: "Monthly progress report issued — Kapoor Residence",
      },
      {
        projectId,
        objectType: "running_bill",
        eventType: "certified",
        actorId: principalId,
        actorName: "Vihaan Sharma",
        visibility: "ALL",
        summary: "RA Bill 01 certified — site clearing & PCC",
      },
    ]);
  }

  console.log(`  client portal extras: ${kapoor.projectTitle} ready for client@demo.aorms.in`);
}
