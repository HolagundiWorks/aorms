# HCW UX — Calibration & predictive hypotheses (V3)

**Status:** Research · explanatory heuristics shipped in kit · **Adopted:** 2026-07-22  
**Kit:** `estimateOrientMultiplier` / `isLoadRisk` in `src/calibration.ts`  
**Parent:** [HCW-UX-KPI-INSTRUMENT.md](HCW-UX-KPI-INSTRUMENT.md) · [VALIDATION-PROTOCOL.md](../hcw-kit/11-audits/VALIDATION-PROTOCOL.md)

Explanatory claim: *high interrupt → higher load.*  
Predictive claim (not yet calibrated): *if interrupts/hour > X and capacity overruns, median orientation rises Y%.*

---

## 1. Working hypotheses

| ID | Hypothesis | Initial X / Y (prior) |
| --- | --- | --- |
| **H1** | Interrupts/hour > `FATIGUE.interruptPerHourWarn` (8) → median `ux.orient` ↑ ≥ 25% | calibrate Y |
| **H2** | ≥3 `ux.capacity_warn` / 10 min → decision `msOpen` ↑ ≥ 20% | |
| **H3** | Pending decisions > 5 → orientation ↑ and fatigue `decision_backlog` | |
| **H4** | Empathic voice (vs commanding) → SEQ ↑ and undo ↓ on confirm flows | qualitative + SEQ |
| **H5** | COGA calm after `ux.fatigue_signal` → interrupt density ↓ next hour | |

Kit prior for dashboards: `estimateOrientMultiplier({ workingChunks, interruptsLastHour, pendingDecisions })` — **not** a published model. Replace coefficients after studies.

---

## 2. Calibration method

1. Collect production telemetry (≥ 4 weeks, ≥ 2 surfaces).  
2. Fit simple models (quantile regression on orientation / decision latency).  
3. Hold out one project; report MAPE / interval coverage.  
4. Update `FATIGUE` / docs priors only via governance + changelog.  
5. Bump evaluation Predictive score only when models are published here with data dates.

---

## 3. Product dashboard recipe

```ts
import { estimateOrientMultiplier, getFatigueSnapshot } from "@hcw/ui-kit";

const snap = getFatigueSnapshot();
const risk = estimateOrientMultiplier({
  interruptsLastHour: snap.interruptsLastHour,
  pendingDecisions: snap.pendingDecisions,
});
// Show “load risk” badge when risk >= 1.25 — still invitational copy
```

Pair with live medians from the KPI sink ([HCW-UX-ADOPTION-PLAYBOOK.md](HCW-UX-ADOPTION-PLAYBOOK.md)).

---

## 4. Honesty rule

Do not market HCW as having predictive models until H1–H3 have holdout results.
Until then, evaluation keeps Predictive ≤7.
