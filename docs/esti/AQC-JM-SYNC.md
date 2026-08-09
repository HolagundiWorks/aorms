# AQC ↔ Joint measurement sync contract

**Status:** Hub stub (esti) · AQC desktop consume TBD  
**Related:** [PLAN-MEASUREMENT-ARCHITECTURE.md](PLAN-MEASUREMENT-ARCHITECTURE.md) · [AORMS-CONNECT.md](AORMS-CONNECT.md) · [ROADMAP.md](ROADMAP.md) S11

## Purpose

Approved **joint measurements** and seeded **rate-book items** on the esti hub are the
canonical field → office quantity spine. **AQC Estimation** (desktop) consumes the same
payload via **AORMS Connect** catalog / Bridge so rate books and measurement books stay
aligned without re-keying.

## Sync entity

| Field | Value |
| --- | --- |
| `SyncEntity` | `jointMeasurement` |
| Publish when | status → `APPROVED` |
| Hub helper | `publishEntity(db, "jointMeasurement", id)` |

Payload (hub artifact DTO):

```ts
{
  projectId: string;
  contractorId: string | null;
  subject: string;
  measuredOn: string | null; // ISO date
  status: "APPROVED";
  reviewedAt: string | null;
}
```

Full line abstract is fetched by the node via authenticated tRPC / Bridge
(`jointMeasurement.getForStaff` or a future Connect catalog method), not embedded in
the outbox blob (keeps metadata plane small).

## Field map — JM line → AQC / esti

| Joint measurement line | esti MB row | esti rate-book item | AQC Estimation (target) |
| --- | --- | --- | --- |
| `code` | `libraryItemCode` | `itemCode` | Item code |
| `description` | `particulars` | `description` | Particulars |
| `uom` | `uom` | `unit` | Unit |
| `lengthMm` / `breadthMm` / `heightMm` | same | — | Dimensions (mm) |
| `quantity` | `quantity` | — | Qty |
| `measureKind` | derived | — | L / LB / LBH / COUNT |
| — | — | `ratePaise` (seed **0**) | Rate (enter in AQC or Library › Rate Books) |

Idempotency: skip rate-book insert when `itemCode` (case-insensitive) already exists on
the target book. JM id is the idempotency key for MB import (`source` note in audit).

## Connect / Bridge responsibilities

1. On hub event `jointMeasurement` APPROVED → catalog row for the project.
2. AQC Estimation “Pull joint measurements” reads catalog → lines → local MB / rate book.
3. Rate edits in AQC may push back as metadata `estimateTotals` later (out of scope here).

## Esti surfaces (live)

| Surface | Role |
| --- | --- |
| Site portal | Recorder + annotate + submit |
| AProc home | Approve / reject (`cost:approve`) |
| Library › Rate Books | `createFromJointMeasurement` + inline rates |
| Contractor portal | Request opens DRAFT; read APPROVED abstract |

## Out of scope

- AQC WinUI implementation (sibling repos)
- Replacing AProc RA certification with JM
