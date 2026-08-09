/**
 * AORMS-Consultancy demo portfolio — enquiries · engagements · fee stages ·
 * deliverables · TQ · MoM · timesheet · field report.
 * Consumed by seedDemo.ts (full seed + backfill). Idempotent by ref/code.
 *
 * Inventory: docs/esti/DEMO-SEED-ITEMS.md § Consultancy
 */
import { and, eq, inArray, like, or } from "drizzle-orm";
import type { db as DbType } from "../db/index.js";
import {
  clients,
  consDeliverables,
  consEngagements,
  consEnquiries,
  consFeeStages,
  consFieldReports,
  consMoms,
  consRateCards,
  consTimesheets,
  consTqs,
} from "../db/schema.js";

type DB = typeof DbType;

const MARKER = "demo-seed:consultancy";

const REFS = {
  enqWon: "EQ-DEMO-001",
  enqOpen: "EQ-DEMO-002",
  enqLost: "EQ-DEMO-003",
  engStructural: "C-DEMO-001",
  engMep: "C-DEMO-002",
} as const;

const APEX = "Apex Precast Structures Pvt Ltd";
const ORBIT = "Orbit Healthcare Pvt Ltd";

function dayOffset(n: number): Date {
  return new Date(Date.now() + n * 86_400_000);
}

function isoDay(n: number): string {
  return dayOffset(n).toISOString().slice(0, 10);
}

/** Wipe consultancy demo rows (force re-seed). Safe when none exist. */
export async function clearDemoConsultancyRows(db: DB): Promise<void> {
  const eng = await db
    .select({ id: consEngagements.id })
    .from(consEngagements)
    .where(
      or(
        eq(consEngagements.code, REFS.engStructural),
        eq(consEngagements.code, REFS.engMep),
        like(consEngagements.notes, `%${MARKER}%`),
      ),
    );
  const engIds = eng.map((e) => e.id);
  if (engIds.length > 0) {
    await db
      .update(consEnquiries)
      .set({ convertedEngagementId: null, updatedAt: new Date() })
      .where(inArray(consEnquiries.convertedEngagementId, engIds));
    await db.delete(consEngagements).where(inArray(consEngagements.id, engIds));
  }
  await db
    .delete(consEnquiries)
    .where(
      or(
        eq(consEnquiries.ref, REFS.enqWon),
        eq(consEnquiries.ref, REFS.enqOpen),
        eq(consEnquiries.ref, REFS.enqLost),
        like(consEnquiries.notes, `%${MARKER}%`),
      ),
    );
}

async function ensureClient(
  db: DB,
  row: {
    name: string;
    email: string;
    phone: string;
    city: string;
  },
): Promise<string> {
  const [hit] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.name, row.name))
    .limit(1);
  if (hit) return hit.id;
  const [created] = await db
    .insert(clients)
    .values({
      name: row.name,
      kind: "COMPANY",
      city: row.city,
      state: "Karnataka",
      email: row.email,
      phone: row.phone,
    })
    .returning({ id: clients.id });
  if (!created) throw new Error(`consultancy demo client insert failed: ${row.name}`);
  return created.id;
}

async function ensureRateCards(db: DB): Promise<void> {
  for (const row of [
    { grade: "PRINCIPAL", ratePaise: 450_000, capacityHoursWeek: 20 },
    { grade: "SENIOR_ENGINEER", ratePaise: 280_000, capacityHoursWeek: 35 },
    { grade: "ENGINEER", ratePaise: 160_000, capacityHoursWeek: 40 },
  ] as const) {
    const [hit] = await db
      .select({ grade: consRateCards.grade })
      .from(consRateCards)
      .where(eq(consRateCards.grade, row.grade))
      .limit(1);
    if (!hit) await db.insert(consRateCards).values(row);
  }
}

/**
 * Seed / backfill AConsulting walkthrough data for consultancy.aorms.in.
 * Safe when spine already exists — fills missing companions only.
 */
export async function seedDemoConsultancy(db: DB, principalId: string): Promise<void> {
  await ensureRateCards(db);

  const apexId = await ensureClient(db, {
    name: APEX,
    email: "projects@apexprime.in",
    phone: "+91 80471 22001",
    city: "Bengaluru",
  });
  const orbitId = await ensureClient(db, {
    name: ORBIT,
    email: "projects@orbit.health",
    phone: "+91 80471 33002",
    city: "Bengaluru",
  });

  // ── C-DEMO-001 structural spine ───────────────────────────────────────────
  let [eng1] = await db
    .select()
    .from(consEngagements)
    .where(eq(consEngagements.code, REFS.engStructural))
    .limit(1);

  if (!eng1) {
    [eng1] = await db
      .insert(consEngagements)
      .values({
        code: REFS.engStructural,
        title: "Apex PEB warehouse — Whitefield structural",
        clientId: apexId,
        model: "FULL_DESIGN",
        consultancyType: "STRUCTURAL",
        leadDiscipline: "STRUCTURAL",
        disciplines: ["STRUCTURAL"],
        stage: "Schematic",
        status: "ACTIVE",
        feeModel: "LUMP_SUM",
        feeTotalPaise: 18_00_000_00,
        relianceScope:
          "Structural design for PEB warehouse; architect IFC as working assumption.",
        notes: `${MARKER}\nConverted from enquiry ${REFS.enqWon} for AConsulting walkthrough.`,
      })
      .returning();
  }
  if (!eng1) throw new Error("consultancy demo engagement C-DEMO-001 failed");

  const [enq1] = await db
    .select({ id: consEnquiries.id })
    .from(consEnquiries)
    .where(eq(consEnquiries.ref, REFS.enqWon))
    .limit(1);
  if (!enq1) {
    await db.insert(consEnquiries).values({
      ref: REFS.enqWon,
      title: "Apex PEB warehouse — Whitefield",
      clientName: APEX,
      contactName: "Ravi Shetty",
      phone: "+91 98450 22001",
      email: "ravi@apexprime.in",
      source: "Referral",
      siteLocation: "Whitefield, Bengaluru",
      consultancyType: "STRUCTURAL",
      leadDiscipline: "STRUCTURAL",
      model: "FULL_DESIGN",
      status: "WON",
      capacityFit: 4,
      feeAttractiveness: 5,
      risk: 2,
      strategicFit: 4,
      conflictCheckDone: true,
      decisionNote: "Go — capacity available; fee attractive; low conflict.",
      decidedBy: principalId,
      decidedByName: "Ar. Vihaan Sharma (Principal)",
      decidedAt: dayOffset(-20),
      convertedEngagementId: eng1.id,
      notes: MARKER,
      createdBy: principalId,
    });
  }

  let [deliv] = await db
    .select()
    .from(consDeliverables)
    .where(
      and(eq(consDeliverables.engagementId, eng1.id), eq(consDeliverables.code, "STR-CAL-001")),
    )
    .limit(1);
  if (!deliv) {
    [deliv] = await db
      .insert(consDeliverables)
      .values({
        engagementId: eng1.id,
        code: "STR-CAL-001",
        title: "Foundation & column schedule",
        discipline: "STRUCTURAL",
        revision: "A",
        issueClass: "FOR_CONSTRUCTION",
        checkCategory: "CAT1",
        status: "DRAFT",
        originatedBy: principalId,
        notes: MARKER,
      })
      .returning();
  }

  const [feeHit] = await db
    .select({ id: consFeeStages.id })
    .from(consFeeStages)
    .where(eq(consFeeStages.engagementId, eng1.id))
    .limit(1);
  if (!feeHit) {
    await db.insert(consFeeStages).values([
      {
        engagementId: eng1.id,
        label: "Appointment / kickoff",
        amountPaise: 3_60_000_00,
        status: "INVOICED",
        billableAt: dayOffset(-14),
        invoicedAt: dayOffset(-12),
      },
      {
        engagementId: eng1.id,
        label: "Schematic structural package",
        amountPaise: 7_20_000_00,
        deliverableId: deliv?.id ?? null,
        status: "BILLABLE",
        billableAt: new Date(),
      },
      {
        engagementId: eng1.id,
        label: "GFC / construction issue",
        amountPaise: 7_20_000_00,
        status: "PENDING",
      },
    ]);
  }

  // Extra deliverable on structural job
  const [deliv2] = await db
    .select({ id: consDeliverables.id })
    .from(consDeliverables)
    .where(
      and(eq(consDeliverables.engagementId, eng1.id), eq(consDeliverables.code, "STR-GA-001")),
    )
    .limit(1);
  if (!deliv2) {
    await db.insert(consDeliverables).values({
      engagementId: eng1.id,
      code: "STR-GA-001",
      title: "PEB GA — framing & bracing",
      discipline: "STRUCTURAL",
      revision: "A",
      issueClass: "FOR_INFORMATION",
      checkCategory: "CAT1",
      status: "DRAFT",
      originatedBy: principalId,
      notes: MARKER,
    });
  }

  const [tqHit] = await db
    .select({ id: consTqs.id })
    .from(consTqs)
    .where(and(eq(consTqs.engagementId, eng1.id), eq(consTqs.code, "TQ-001")))
    .limit(1);
  if (!tqHit) {
    await db.insert(consTqs).values({
      engagementId: eng1.id,
      code: "TQ-001",
      question:
        "Confirm soil SBC and foundation type for PEB columns at grid A–D — architect IFC assumes isolated footings.",
      dueDate: isoDay(7),
      scopeImpact: false,
      status: "OPEN",
      raisedBy: principalId,
    });
  }

  const [momHit] = await db
    .select({ id: consMoms.id })
    .from(consMoms)
    .where(and(eq(consMoms.engagementId, eng1.id), eq(consMoms.ref, "MOM-DEMO-001")))
    .limit(1);
  if (!momHit) {
    await db.insert(consMoms).values({
      engagementId: eng1.id,
      ref: "MOM-DEMO-001",
      title: "Kickoff — structural basis of design",
      meetingDate: isoDay(-10),
      attendees: "Vihaan Sharma · Ravi Shetty (Apex) · Prakash Iyer",
      minutes:
        "Agreed PEB spans and crane loads. SBC from geotech report to be issued by client within 5 days. Next: foundation schedule revision A.",
      status: "ISSUED",
      authorId: principalId,
      authorName: "Ar. Vihaan Sharma",
    });
  }

  const [tsHit] = await db
    .select({ id: consTimesheets.id })
    .from(consTimesheets)
    .where(eq(consTimesheets.engagementId, eng1.id))
    .limit(1);
  if (!tsHit) {
    await db.insert(consTimesheets).values({
      engagementId: eng1.id,
      deliverableId: deliv?.id ?? null,
      userId: principalId,
      userName: "Vihaan Sharma",
      grade: "PRINCIPAL",
      date: isoDay(-2),
      hours: 4,
      valuePaise: 450_000 * 4,
      status: "APPROVED",
      approvedBy: principalId,
      approvedByName: "Vihaan Sharma",
      approvedAt: dayOffset(-1),
      note: `${MARKER} — schematic review`,
    });
  }

  const [frHit] = await db
    .select({ id: consFieldReports.id })
    .from(consFieldReports)
    .where(eq(consFieldReports.engagementId, eng1.id))
    .limit(1);
  if (!frHit) {
    await db.insert(consFieldReports).values({
      engagementId: eng1.id,
      reportNo: 1,
      visitDate: isoDay(-5),
      weather: "Clear · 28°C",
      personnel: "Site engineer (Apex) · Vihaan Sharma",
      workObserved: "Footing excavation at grids A1–A4; reinforcement staging.",
      observations:
        "Excavation levels appear consistent with IFC levels at sampled grids. No nonconformance observed this visit.",
      nonconformances: null,
      instructions: "Client to share compaction test results before pour.",
      nextVisit: isoDay(9),
      authorId: principalId,
      authorName: "Vihaan Sharma",
    });
  }

  // ── EQ-DEMO-002 open enquiry (go/no-go practice) ──────────────────────────
  const [enq2] = await db
    .select({ id: consEnquiries.id })
    .from(consEnquiries)
    .where(eq(consEnquiries.ref, REFS.enqOpen))
    .limit(1);
  if (!enq2) {
    await db.insert(consEnquiries).values({
      ref: REFS.enqOpen,
      title: "Orbit hospital block — MEP design",
      clientName: ORBIT,
      contactName: "Dr. Ananya Rao",
      phone: "+91 98450 33002",
      email: "ananya@orbit.health",
      source: "Website",
      siteLocation: "Hebbal, Bengaluru",
      consultancyType: "MEP",
      leadDiscipline: "MEP",
      model: "FULL_DESIGN",
      status: "RECEIVED",
      notes: `${MARKER}\nOpen for go/no-go scoring on Enquiries.`,
      createdBy: principalId,
    });
  }

  // ── EQ-DEMO-003 lost enquiry ──────────────────────────────────────────────
  const [enq3] = await db
    .select({ id: consEnquiries.id })
    .from(consEnquiries)
    .where(eq(consEnquiries.ref, REFS.enqLost))
    .limit(1);
  if (!enq3) {
    await db.insert(consEnquiries).values({
      ref: REFS.enqLost,
      title: "Retail podium — peer review only",
      clientName: "Lakeview Realty LLP",
      contactName: "Sanjay Mehta",
      phone: "+91 90000 99004",
      email: "build@lakeviewrealty.in",
      source: "Cold call",
      siteLocation: "Hyderabad",
      consultancyType: "STRUCTURAL",
      leadDiscipline: "STRUCTURAL",
      model: "PEER_REVIEW",
      status: "LOST",
      capacityFit: 2,
      feeAttractiveness: 2,
      risk: 4,
      strategicFit: 1,
      conflictCheckDone: true,
      decisionNote: "No-go — fee thin; out-of-region; peer-review only.",
      decidedBy: principalId,
      decidedByName: "Ar. Vihaan Sharma (Principal)",
      decidedAt: dayOffset(-30),
      notes: MARKER,
      createdBy: principalId,
    });
  }

  // ── C-DEMO-002 MEP engagement ─────────────────────────────────────────────
  let [eng2] = await db
    .select()
    .from(consEngagements)
    .where(eq(consEngagements.code, REFS.engMep))
    .limit(1);
  if (!eng2) {
    [eng2] = await db
      .insert(consEngagements)
      .values({
        code: REFS.engMep,
        title: "Orbit diagnostics wing — MEP concept",
        clientId: orbitId,
        model: "FULL_DESIGN",
        consultancyType: "MEP",
        leadDiscipline: "MEP",
        disciplines: ["MEP"],
        stage: "Concept",
        status: "ACTIVE",
        feeModel: "TIME_AND_MATERIALS",
        feeTotalPaise: 9_50_000_00,
        relianceScope: "MEP concept for diagnostics wing; architectural shell as IFC assumption.",
        notes: `${MARKER}\nSecond engagement for multi-job AConsulting demos.`,
      })
      .returning();
  }
  if (eng2) {
    const [mepFee] = await db
      .select({ id: consFeeStages.id })
      .from(consFeeStages)
      .where(eq(consFeeStages.engagementId, eng2.id))
      .limit(1);
    if (!mepFee) {
      await db.insert(consFeeStages).values([
        {
          engagementId: eng2.id,
          label: "Concept retainer",
          amountPaise: 2_00_000_00,
          status: "INVOICED",
          billableAt: dayOffset(-7),
          invoicedAt: dayOffset(-6),
        },
        {
          engagementId: eng2.id,
          label: "Schematic MEP package",
          amountPaise: 4_00_000_00,
          status: "PENDING",
        },
        {
          engagementId: eng2.id,
          label: "Detailed design",
          amountPaise: 3_50_000_00,
          status: "PENDING",
        },
      ]);
    }
    const [mepDel] = await db
      .select({ id: consDeliverables.id })
      .from(consDeliverables)
      .where(
        and(eq(consDeliverables.engagementId, eng2.id), eq(consDeliverables.code, "MEP-SCH-001")),
      )
      .limit(1);
    if (!mepDel) {
      await db.insert(consDeliverables).values({
        engagementId: eng2.id,
        code: "MEP-SCH-001",
        title: "HVAC zoning concept",
        discipline: "MEP",
        revision: "A",
        issueClass: "FOR_INFORMATION",
        checkCategory: "CAT1",
        status: "DRAFT",
        originatedBy: principalId,
        notes: MARKER,
      });
    }
  }

  console.log(
    `  consultancy demo: ${REFS.enqWon}→${REFS.engStructural} · ${REFS.enqOpen} (open) · ${REFS.enqLost} (lost) · ${REFS.engMep}`,
  );
}
