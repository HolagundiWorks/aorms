# HCW UX — Product adoption playbook

**Status:** Canonical consumer recipe · **Adopted:** 2026-07-22 · **Kit:** ≥1.4.3  
**Closes kit halves of:** V2 (telemetry wiring) · voice/fatigue adoption · DesignOps pointers  
**Parent:** [HCW-UX.md](../HCW-UX.md)

The kit is domain-agnostic. **Human Centric Works** only when products wire sinks,
voice, fatigue offers, and audit persistence. This is the esti / consumer checklist.

---

## 1. KPI sink (V2) — live dashboards

```ts
import { setUxEventSink, startFatigueSession } from "@hcw/ui-kit";

setUxEventSink((name, payload) => {
  analytics.track(name, payload); // Segment / PostHog / custom
});
startFatigueSession(); // once per authenticated session
```

| Dashboard tile | Source events | Healthy |
| --- | --- | --- |
| Median orientation | `ux.orient.msToFourAnswers` | ≤ 30s on AI surfaces |
| Interrupt density | `ux.interrupt` (exclude ambient) | trending down |
| Capacity breaches | `ux.capacity_warn` | → 0 / week |
| Dock purity | `ux.dock` vs inline CTA audit | page CTAs → 0 |
| Decision latency | `ux.decision` pending→frozen | trending down |
| Fatigue | `ux.fatigue_signal` | investigate watch; act on elevated |
| Audit writes | `ux.audit` | every freeze has a row |

Ship a **before/after** panel per release train (screenshot + medians). Without
deltas, the framework stays doctrine-only.

Full vocabulary: [HCW-UX-KPI-INSTRUMENT.md](HCW-UX-KPI-INSTRUMENT.md).

---

## 2. Voice adoption

1. Replace commanding ambient strings with [HCW-UX-VOICE.md](../HCW-UX-VOICE.md).
2. Prefer kit defaults (`ConfirmModal`, `TRUST`, `VOICE`) — override only with reason.
3. Run Evaluate checklist **Voice & tone** gate on PRs.
4. Optional: `pnpm voice-lint` in CI (warns on sure-check prompts / commanding “must” phrasing in `src/`).

---

## 3. Fatigue UI

```tsx
import { FatigueOfferBanner, HcwTelemetryRoot, KitRoot } from "@hcw/ui-kit";

<KitRoot coga={coga}>
  <HcwTelemetryRoot fatigueOffer onEnableCalm={() => setCoga("calm")}>
    …
  </HcwTelemetryRoot>
</KitRoot>
```

Or mount `FatigueOfferBanner` alone. Never hard-lock on `ux.fatigue_signal`.

---

## 4. Decision audit persistence (V5)

```ts
import { setDecisionAuditSink, freezeDecision } from "@hcw/ui-kit";

setDecisionAuditSink((row) => api.post("/ux/decision-audit", row));

// on dock commit / freeze:
freezeDecision(id, { chosen, reason, actorId, surfaceId, msOpen });
```

Session ring (`listSessionDecisionAudits`) is for the current tab only.
**Product DB** must retain ≥ 6 months for explainability reviews.

---

## 5. Construction patterns (V4)

Implement job UIs from [HCW-CONSTRUCTION-PATTERNS.md](HCW-CONSTRUCTION-PATTERNS.md)
on the kit geography — do not fork chrome into the kit.

---

## 6. DesignOps remainders

| Item | Owner | Guide |
| --- | --- | --- |
| i18n catalogs + locale switcher | Product | [13-ROADMAPS.md](../hcw-kit/13-ROADMAPS.md) |
| Figma component library | Design | same |
| Variables sync ritual | DesignOps | [02-TOKEN-EXPORT.md](../hcw-kit/02-TOKEN-EXPORT.md) |

---

## 7. Definition of done (consumer release)

- [ ] `setUxEventSink` live in production
- [ ] KPI dashboard with before/after for the release
- [ ] `FatigueOfferBanner` (or equivalent) on primary shells
- [ ] `setDecisionAuditSink` + freeze writes durable
- [ ] Voice pass on new copy
- [ ] Construction surfaces cite a pattern ID when applicable
