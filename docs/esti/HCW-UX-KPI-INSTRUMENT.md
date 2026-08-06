# HCW UX — KPI instrument

**Status:** Measurement companion to the framework · **Adopted:** 2026-07-21  
**Parent:** [HCW-UX.md](../HCW-UX.md) · framework KPIs in [HCW-UX-FRAMEWORK.md](../HCW-UX-FRAMEWORK.md) · process Evaluate/Improve in [HCW-UX-PROCESS.md](../HCW-UX-PROCESS.md)

Defines **what to measure**, **how to log**, and **how to review**. Consumer apps implement emitters; the kit provides contracts (toast budget, outcomes, capacity). Without this instrument the framework is doctrine-only.

---

## 1. Event vocabulary (suggested)

Emit structured events (analytics / telemetry — product choice of sink):

| Event | Payload (min) | Maps to |
| --- | --- | --- |
| `ux.orient` | `{ surfaceId, msToFourAnswers? }` | Time-to-orientation |
| `ux.interrupt` | `{ kind: judgment\|blocker\|error\|ambient, accepted: bool }` | Interrupt rate |
| `ux.dock` | `{ zone, actionId }` | CTA locus health |
| `ux.capacity_warn` | `{ channel: kpi\|dock\|loops\|toast, count, cap }` | Capacity overruns |
| `ux.decision` | `{ id, state: pending\|frozen\|rejected, msOpen? }` | Decision cycle |
| `ux.outcome` | `{ status: success\|failure\|blocked, source }` | Norman evaluation |
| `ux.a11y_gate` | `{ pass: bool, rule }` | WCAG gate |
| `ux.mission` | `{ id, state: active\|done\|failed }` | Mission completion |
| `ux.fatigue_signal` | `{ kind, level: watch\|elevated, offer? }` | Operational load proxy |

Ambient progress must **not** emit `ux.interrupt`.

---

## 2. KPI definitions

| KPI | Formula | Healthy band |
| --- | --- | --- |
| **Orientation** | median `ux.orient.msToFourAnswers` | ≤ 30000 ms on AI surfaces |
| **Interrupt density** | `judgment+blocker+error` interrupts / active hour | trending down; ambient = 0 |
| **Dock purity** | inline page CTAs / week | 0 on adopted screens |
| **Capacity breaches** | `ux.capacity_warn` / week | 0 |
| **Decision latency** | median `msOpen` pending→frozen | trending down |
| **Outcome coverage** | dock commits with `ux.outcome` / dock commits | → 1.0 |
| **Mission success** | done / (done+failed) | trending up |
| **A11y gate** | failed PRs | 0 |
| **Fatigue signals** | `ux.fatigue_signal` / active day | investigate watch; act on elevated (offer calm/pause — never force) |

---

## 3. Kit hooks (shipped)

| Hook | Use for KPIs |
| --- | --- |
| `pushToast` / ToastHost trim | Interrupt + error assertive |
| `publishOutcome` | Emits `ux.outcome` |
| `AwarenessStrip` loops | Capacity open-loops (`enforceCapacity`) |
| `ConfirmModal` kind | Slip vs mistake tagging |
| `CAPACITY` / `INTERRUPTION` tokens | Caps for `capacity_warn` |
| **`logUxEvent` / `setUxEventSink`** | Product attaches analytics sink |
| **`logOrient` · `logDecision` · `logMission` · `logInterrupt`** | Typed KPI vocabulary helpers |
| **`installFatigueTracking` / `pulseFatigueSession` / `FATIGUE`** | Observes interrupt · capacity · decision · orient → `ux.fatigue_signal` |
| **`VOICE` · `suggestFatigueCopy`** | Empathic pause/calm offers ([HCW-UX-VOICE.md](../HCW-UX-VOICE.md)) |
| **`DockAction.track` / `.outcome`** | `ux.dock` + auto `publishOutcome` on click |
| **`KpiStrip` / ActionDock trim / Toast trim** | `ux.capacity_warn` on overrun |
| **DecisionQueue focus** | `ux.decision` pending |

Consumer apps still choose the sink implementation (Segment, custom, etc.).
Fatigue signals are **operational-load proxies**, not medical diagnosis — products
may offer COGA calm or `VOICE.fatiguePauseOffer`; they must not lock the UI.

## 3b. Validation evidence

Before/after write-ups: [case-studies/](../hcw-kit/11-audits/case-studies/).

---

## 4. Review cadence

| Cadence | Activity |
| --- | --- |
| Per PR | Checklist [07-UX-REVIEW-CHECKLISTS.md](../hcw-kit/07-UX-REVIEW-CHECKLISTS.md) |
| Bi-weekly | KPI snapshot → debt register if breach |
| Release | Changelog + maturity note in audits README |

---

## 5. Construction overlay KPIs

| KPI | Signal |
| --- | --- |
| Safety interrupt ack time | median ms safety blocker → ack |
| Field task completion | site-mode sessions with outcome success |
| Rework tagged “UX ambiguity” | count / month (product taxonomy) |
| Freeze compliance | commercial decisions frozen before execute |

See [HCW-CONSTRUCTION-UX-OVERLAY.md](HCW-CONSTRUCTION-UX-OVERLAY.md).

---

## 7. Operational fatigue proxies

| Signal (`FATIGUE`) | Threshold (default) | Suggested response |
| --- | --- | --- |
| `interrupt_density` | ≥8 judgment/blocker/error per hour | Offer calm chrome; cut ambient |
| `capacity_burst` | ≥3 capacity warns / 10 min | Trim strips; progressive disclosure |
| `session_duration` | ≥90 min continuous | Soft pause offer (`VOICE.fatiguePauseOffer`) |
| `decision_backlog` | ≥5 pending | Rank / disclose; don’t add chrome |
| `long_pending_decision` | ≥30 min open | Nudge gently; keep context |
| `orient_slowing` | later orient samples ≥1.5× earlier | Simplify above-the-fold |

Kit emits `ux.fatigue_signal` with `offer` copy when cooled (`signalCooldownMs`).
See [HCW-UX-VOICE.md](../HCW-UX-VOICE.md).

---

## 8. Anti-patterns

- Counting page views as UX success
- Toasting progress
- KPIs without owners
- Changing caps without Constitution-level review
- Treating fatigue proxies as medical claims or hard lockouts
- Commanding ambient copy outside P0 safety/regulatory (see [HCW-UX-VOICE.md](../HCW-UX-VOICE.md))
