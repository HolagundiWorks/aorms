# HCW UX — Framework evaluation (industry-reference bar)

**Status:** Canonical published reaudit · **Date:** 2026-07-22 · **Kit:** `@hcw/ui-kit` 1.4.1  
**Subject:** HCW UX as **framework + process** (not the design system alone)  
**Index:** [HCW-UX.md](HCW-UX.md) · Charter: [HCW-UX-FRAMEWORK.md](HCW-UX-FRAMEWORK.md)

This evaluation uses an **industry-reference** bar: internal consistency and kit
implementation are necessary but not sufficient. External validation and
predictive models carry heavier weight than documentation quality.

---

## 1. Verdict

| Lens | Score | Label |
| --- | --- | --- |
| **Overall (weighted)** | **88 / 100** | Strong decision-architecture UX framework |
| Plausible band | **84–90** | Depends on how hard validation is weighted |
| As construction **CPM** UX framework | **~68 / 100** | Construction-**aware** overlay — not a domain framework |
| Path to **90–95** | Empirical | Independent multi-project validation · live KPI deltas · predictive models · richer construction pattern library (product) |

HCW UX is strongest as a **decision architecture for UX**: cognitive principles →
governance → process → patterns → components → code. Its limits are **empirical
maturity**, not conceptual emptiness.

---

## 2. Weighted dimensions (publishing model)

| Dimension | Weight | Score /10 | Weighted |
| --- | --- | --- | --- |
| Problem clarity | 10% | 9.5 | 0.95 |
| Structural coherence | 15% | 9.0 | 1.35 |
| Practical executability | 15% | 8.5 | 1.28 |
| Evidence base | 10% | 9.0 | 0.90 |
| **Validation** | **15%** | **5.5** | **0.83** |
| Adaptability | 10% | 9.0 | 0.90 |
| Decision quality | 10% | 9.0 | 0.90 |
| Explainability | 5% | 8.5 | 0.43 |
| Evolvability | 5% | 8.0 | 0.40 |
| Predictive capability | 5% | 6.5 | 0.33 |
| **Total** | **100%** | | **~88** |

### Split that matters

| | Score |
| --- | --- |
| Internal consistency (principles · process · kit alignment) | **9–10** |
| External validation (orgs · sizes · teams · industries · populations) | **5–6** |

Three studio-observed case studies are promising. They are **not** equivalent to
external multi-organization proof (Design Thinking, Lean UX, JTBD, Nielsen).

---

## 3. Category audit (tightened)

### Purpose — 9.3
Clear problem (attention inflation · geography drift · chat-first AI), scope
in/out table, named users including construction via overlay.

### Structure — 9.0
Seven principles · one diagram · five-phase process · modular modules. Healthy
stack: Principles → Framework → Process → Patterns → Components → Code.

### Usability — 8.5
Quickpath + process gates are executable. Full catalog depth still costs
onboarding time for new practitioners.

### Quality — 7.5 (evidence high / validation low)
Evidence map (Jakob–WCAG/COGA) is strong. Measurability exists (`logUxEvent`,
KPI instrument). **Validation** is the largest gap to industry-reference status.

### Adaptability — 9.0
Screen→studio scale; Agile/Waterfall/Lean/DT; kit agnostic + intentional overlay.

### Integration — 8.5
Scrum/PMBOK/BIM coexistence stated; RACI + stakeholder modes. Not a drop-in
replacement for CPM suites.

### Governance — 9.0
Dock · DecisionQueue · Freeze · risk shapes · debt loop · law-beats-taste.

---

## 4. Added criteria

### Explainability — 8.5

*Can a reviewer reconstruct why a design decision was made six months later?*

HCW supports this via DecisionQueue · FreezeTable · `publishOutcome` · ConfirmModal
`kind`/`reason` · dock zone law · debt register. Gap: product audit logs must
persist freeze/outcome records beyond session UI.

### Evolvability — 8.0

*Does the framework survive new interaction technologies?*

Thesis is **cognitive role + capacity under load**, not a widget fashion. AI
mission hierarchy is already first-class. Voice / AR / robotics / multi-agent are
not patterned yet, but geography + capacity + judgment interrupts remain applicable
as enduring human constraints.

### Internal consistency (precedence) — 9.0

Principles can conflict. Precedence is law — see Framework charter §2.1
([HCW-UX-FRAMEWORK.md](HCW-UX-FRAMEWORK.md)). Summary:

1. **Safety / regulatory judgment** interrupts beat calm/capacity scarcity  
2. **Capacity protection** beats “show everything for mission completeness”  
3. **Mission orientation (four questions)** beats implementation detail density  
4. **One geography** beats novel layout for a single screen’s convenience  
5. **UX law** beats taste  

Example: Mission priority vs Capacity — **Capacity wins on concurrent chrome**;
mission content progresses via Stage disclosure and Decision ranking, not by
breaking Cowan caps.

### Predictive capability — 6.5

Explanatory strength (“high interrupt → load”) is high. Quantified prediction
(“if CAPACITY overruns and interrupt/hour > X, orientation time rises Y%”) is
**not** yet published as calibrated models. Keep ≤7 until models exist.

---

## 5. Framework vs design system

| Layer | Answers |
| --- | --- |
| Framework | *Why* this decision (role · depth · capacity · mission) |
| Process | *When / who / gate* |
| Design system (`@hcw/ui-kit`) | *How* it is implemented |

HCW correctly refuses to call the kit alone a “framework.” Evaluation of the
**framework** must not be inflated by component count.

---

## 6. Construction stance (tightened)

**Do not score HCW as a Construction UX Framework.**

Score it as **construction-aware UX**:

| Has | Lacks (domain interaction patterns) |
| --- | --- |
| Lifecycle phase map · stakeholder modes · safety interrupt classes · BIM viewer stance · field density/COGA · freeze/trace grammar | RFI · submittal · NCR · site diary · inspection · progress claim · delay · programme change · variation · safety permit · multi-tier approval chain UIs |

Those patterns belong in **product** libraries composed on the kit — not in the
domain-agnostic kit. Overlay score for domain completeness: **~68 / 100**.

---

## 7. Exceptional-framework traits

| Trait | Score | Note |
| --- | --- | --- |
| Memorable (3–7) | 9 | Seven principles |
| Unique perspective | 9 | Depth-as-semantics · mission-first AI · capacity law |
| One diagram | 10 | Charter §2 |
| Terminology | 8 | Strong; legacy aliases remain |
| Predictive value | 6.5 | See §4 |
| Decision guidance | 9 | Precedence + dock/decision law |
| Validation | 5.5 | Internal cases ≠ external proof |

---

## 8. Path to 90–95

| Work | Owner | Kit / docs ready | Moves |
| --- | --- | --- | --- |
| Independent multi-project / multi-org validation | Research | [VALIDATION-PROTOCOL.md](hcw-kit/11-audits/VALIDATION-PROTOCOL.md) | Validation 5.5 → 8+ |
| Live KPI dashboards with before/after deltas | Product | [HCW-UX-ADOPTION-PLAYBOOK.md](esti/HCW-UX-ADOPTION-PLAYBOOK.md) | Measurable impact |
| Quantified predictive models | Research | [HCW-UX-CALIBRATION.md](esti/HCW-UX-CALIBRATION.md) | Predictive 6.5 → 8+ |
| Construction domain UIs (CP-01…11) | Product | [HCW-CONSTRUCTION-PATTERNS.md](esti/HCW-CONSTRUCTION-PATTERNS.md) | Domain-strong |
| Persist decision/freeze audit ≥6 months | Product | `setDecisionAuditSink` | Explainability → 9+ |
| Voice + fatigue UI in shells | Product | `VOICE` · `FatigueOfferBanner` | Partner tone under load |

Until then, reputation should rest on **demonstrated decision quality in shipping
products**, not on documentation volume.

---

## 9. One-paragraph publishable summary

> HCW UX is a distinctive **decision architecture for UX** that pairs cognitive
> principles with governance, a five-phase process, and an executable design
> system. Against an industry-reference bar it scores approximately **88/100**:
> excellent internal coherence and executability, with the primary gap in
> **external validation** and **calibrated prediction**. It is construction-aware
> via overlay, not a construction project-management UX framework. Closing the
> empirical gap—not rewriting principles—is what would move it into the low–mid 90s.
