# Validation protocol — external evidence (V1)

**Status:** Research template · **Adopted:** 2026-07-22  
**Moves:** Evaluation Validation 5.5 → 8+ · [HCW-UX-EVALUATION.md](../../HCW-UX-EVALUATION.md)  
**Companion:** [HCW-UX-CALIBRATION.md](../../esti/HCW-UX-CALIBRATION.md) (V3)

Internal case studies are not enough for an industry-reference bar. Use this
protocol for **independent** multi-project / multi-org studies.

---

## 1. Study unit

| Field | Requirement |
| --- | --- |
| Organisation | Named; not only HCW studio |
| Project / product | Named surface set |
| Users | ≥ 8 professionals under time pressure (mix roles) |
| Duration | ≥ 2 weeks active use **or** 3 moderated sessions + diary |
| Baseline | Pre-HCW or pre-adoption metrics where possible |

---

## 2. Core measures (must)

| Measure | Method | Target direction |
| --- | --- | --- |
| Time-to-orientation | Timed four questions / `ux.orient` | ↓ |
| Interrupt density | Log / `ux.interrupt` | ↓ |
| Decision cycle | Pending→frozen | ↓ |
| Error / undo rate | Outcome error + undo | ↓ or stable with speed ↑ |
| Subjective load | NASA-TLX or SEQ after tasks | ↓ |
| Voice perception | 3-item Likert: partner vs commander | → partner |

Optional: fatigue signal rate, COGA calm uptake, audit completeness.

---

## 3. Method options

1. **A/B or before/after** on the same product train (preferred for V2 dashboards).
2. **Moderated task battery** (orient · decide · recover from error · field density).
3. **Diary + telemetry** for interrupt/fatigue ecology.

Blind where feasible; declare conflicts of interest.

---

## 4. Report skeleton

1. Context & participants  
2. Surfaces & kit version  
3. Method  
4. Results (tables + effect sizes if possible)  
5. Failures / exceptions (precedence conflicts)  
6. Recommendations → debt register / calibration  

Store write-ups under `docs/hcw-kit/11-audits/case-studies/` with prefix `ext-`.

---

## 5. Pass bar for “external validation” credit

- ≥ **3** independent projects **or** ≥ **2** organisations  
- All **must** measures reported  
- At least one negative/null finding discussed honestly  
- Kit version pinned  

Until then, keep Validation scored ≤6 in the published evaluation.
