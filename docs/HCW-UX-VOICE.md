# HCW UX — Voice & tone

**Status:** Canonical content grammar · **Adopted:** 2026-07-22 · **Kit:** `VOICE` · `TRUST`  
**Index:** [HCW-UX.md](HCW-UX.md) · Executable: `src/tokens.ts` (`VOICE`, `TRUST`)

Human Centric **Works** means the product speaks like a **calm colleague**, not a
commander. Under time pressure, harsh imperatives raise load; invitational copy
preserves dignity and judgment.

---

## 1. Stance

| Prefer | Avoid (non-P0) |
| --- | --- |
| Invitation — “Your judgment would help here” | Orders — “You must approve now” |
| Shared work — “Just checking before we continue” | Accusation — “Are you sure?” as default |
| Soft exit — “Not now” | Dismissive — “Cancel” as the only out |
| Honest progress — “Working on it…” | Empty theatre — “Success!” without substance |
| Offer under load — pause / calm suggestions | Forced lockouts from fatigue proxies |

**Exception (precedence P0):** safety and regulatory blockers may use direct,
unambiguous language. Empathy never softens a stop-work or statutory ack.

---

## 2. Kit defaults

| Surface | Token / default |
| --- | --- |
| Confirm slip heading | `VOICE.confirmHeadingSlip` |
| Confirm mistake heading | `VOICE.confirmHeadingMistake` |
| Confirm cancel | `VOICE.cancelLabel` (“Not now”) |
| Pending | `VOICE.pendingLabel` |
| Judgment cue | `TRUST.judgmentNeedsLabel` |
| Assumption chip | `TRUST.assumptionChipLabel` |
| Fatigue offers | `VOICE.fatiguePauseOffer` · `VOICE.fatigueCalmOffer` |

Products may override per screen; audits flag commanding ambient copy.

---

## 3. Microcopy patterns

| Kind | Empathic pattern | Commanding anti-pattern |
| --- | --- | --- |
| Error | What happened + one next step | “Invalid.” / “Failed.” |
| Empty | One sentence + one gentle action | “No data. Create one.” barked |
| Decision | Recommendation + why it helps | “Select option 2.” |
| Interrupt | Why judgment is needed | Alarm without meaning |
| Success | Quiet confirmation of the verb | Celebration noise |

Verb-first buttons remain (“Save changes”) — verbs describe the user’s action;
they are not barked at the user.

---

## 4. Operational fatigue (related)

Load proxies and `ux.fatigue_signal` live in [HCW-UX-KPI-INSTRUMENT.md](esti/HCW-UX-KPI-INSTRUMENT.md)
and `FATIGUE` / `src/fatigue.ts`. When a signal fires, show invitational
`VOICE` offers or suggest `KitRoot({ coga: "calm" })` — **never** block work on
fatigue proxies alone.

---

## 5. Review gate

- [ ] Ambient copy invitational unless P0 safety/regulatory
- [ ] Confirm / cancel / pending use `VOICE` or documented override
- [ ] Judgment / assumption chips use `TRUST` wording
- [ ] No success theatre; no ambient toasts dressed as commands
