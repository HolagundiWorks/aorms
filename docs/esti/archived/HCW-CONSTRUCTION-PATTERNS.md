# Construction domain interaction patterns

**Status:** Product pattern library (specs) · **Adopted:** 2026-07-22  
**Maturity:** specs for V4 — implement in esti, not in `@hcw/ui-kit`  
**Parent:** [HCW-CONSTRUCTION-UX-OVERLAY.md](HCW-CONSTRUCTION-UX-OVERLAY.md) · score [HCW-UX-EVALUATION.md](../HCW-UX-EVALUATION.md)

Each pattern is a **job** on HCW geography (Rail · Stage · Dock). Kit stays
domain-agnostic; product composes primitives (`DecisionQueue`, `FreezeTable`,
`ConfirmModal`, `AwarenessStrip`, `CAPACITY`).

**Voice:** invitational ambient copy ([HCW-UX-VOICE.md](../HCW-UX-VOICE.md));
safety blockers may stay direct (P0).

---

## Pattern index

| ID | Pattern | Primary mode |
| --- | --- | --- |
| **CP-01** | RFI | Consultant / Architect |
| **CP-02** | Submittal | Contractor → Consultant |
| **CP-03** | NCR | Quality / Contractor |
| **CP-04** | Site diary | Site / Contractor |
| **CP-05** | Inspection | Consultant / Authority |
| **CP-06** | Progress claim | Contractor → Owner |
| **CP-07** | Delay / EOT | Commercial |
| **CP-08** | Programme change | Planner / Principal |
| **CP-09** | Variation | Commercial |
| **CP-10** | Safety permit | Site (P0) |
| **CP-11** | Multi-tier approval | All |

---

## Shared anatomy

| Region | Content |
| --- | --- |
| **Rail** | Mission / phase · AwarenessStrip · DecisionQueue (≤ capacity) |
| **Stage** | Artefact · timeline · parties · cost/time/quality chips (≤3) |
| **Dock** | LEFT withdraw/reject · CENTER new related · RIGHT submit/approve/freeze |
| **Audit** | `recordFreezeAudit` / `recordDecisionAudit` on every consequential freeze |

---

## CP-01 — RFI

| | |
| --- | --- |
| **Job** | Ask a clarifying question; freeze answer before work proceeds |
| **Stage** | Question · linked drawing/spec · responders · due |
| **Decisions** | Answer alternatives ≤3; recommendation-first |
| **Freeze** | Accepted answer + reason → audit |
| **Interrupts** | Overdue RFI = judgment, not ambient toast |

## CP-02 — Submittal

| | |
| --- | --- |
| **Job** | Package for review; return / revise / approve |
| **Stage** | Spec item · files · revision trail |
| **Dock RIGHT** | Approve / Approve-as-noted / Revise |
| **Freeze** | Disposition + marked-up artefact link |

## CP-03 — NCR

| | |
| --- | --- |
| **Job** | Record non-conformance; disposition corrective action |
| **Rail** | Open NCRs as loops ≤ `CAPACITY.openLoops` |
| **Safety** | Structural/safety NCR may use P0 interrupt |
| **Freeze** | Disposition · owner · verify-by date |

## CP-04 — Site diary

| | |
| --- | --- |
| **Job** | Daily field record under fatigue/glove conditions |
| **Density** | `comfortable` + COGA calm preferred |
| **Stage** | Weather · labour · work done · issues (chunked) |
| **Chrome** | Collapse rail early; large targets |

## CP-05 — Inspection

| | |
| --- | --- |
| **Job** | Checklist pass/fail with evidence |
| **Stage** | Checklist · photos · hold points |
| **Decision** | Pass / Fail / Conditional — freeze before next trade |

## CP-06 — Progress claim

| | |
| --- | --- |
| **Job** | Claim value for period; certify |
| **Stage** | Line items · evidence · previous certified |
| **Trade-off chips** | Cost · time · quality/risk (≤3) |
| **Freeze** | Certified amount + exclusions |

## CP-07 — Delay / EOT

| | |
| --- | --- |
| **Job** | Claim time impact with cause |
| **Stage** | Cause · programme snippet · mitigation |
| **Decision** | Grant / reject / negotiate — audit reason mandatory |

## CP-08 — Programme change

| | |
| --- | --- |
| **Job** | Change logic / dates with impact visibility |
| **Stage** | Before/after · critical path highlight |
| **Dock** | Commit change only after freeze of impact ack |

## CP-09 — Variation

| | |
| --- | --- |
| **Job** | Scope change with commercial impact |
| **Decision card** | Recommendation + cost/time/quality |
| **Multi-tier** | Compose with CP-11 |

## CP-10 — Safety permit

| | |
| --- | --- |
| **Job** | Permit-to-work; stop without ack |
| **Interrupt** | **P0** — assertive; cannot dismiss without ack |
| **Voice** | Direct language allowed |
| **Freeze** | Permit issued / suspended / closed |

## CP-11 — Multi-tier approval

| | |
| --- | --- |
| **Job** | Ordered approvers; visible queue |
| **Rail** | PhaseStrip of approval tiers |
| **Stage** | Who · waiting · SLA |
| **Capacity** | Show ≤5 live tiers; disclose rest |
| **Audit** | Each tier freeze separately |

---

## Implementation notes

- Do **not** add RFI entities to `@hcw/ui-kit`.
- Prefer templates T1–T10 + orchestration primitives.
- Tag KPI rework with product taxonomy `ux_ambiguity` when freeze/audit missing.
- Track adoption in [HCW-UX-ADOPTION-PLAYBOOK.md](HCW-UX-ADOPTION-PLAYBOOK.md) §5.
