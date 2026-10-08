# AQC pilot sample project

`pilot-sample.bbsproj` is a **synthetic** G+1 residence in AQC-Core's `.bbsproj` v17 layout, built for testing the
AQC ↔ AORMS sync (see `docs/esti/AQC-CONNECT-PLAN.md`). Regenerate with `node make-pilot-sample.mjs`.

**What is faithful to AQC** (checked against `ProjectStore.ToJson` and the models' `ToJson`): the 47 top-level keys,
`format`/`version`, the project / parties / markups / settings / levels / schedule / contracts / accounts (RA bill) /
stores / org / link-rule shapes, take-off rows as string-valued dictionaries with no row ids.

**What is best-effort:** the *field names inside take-off rows* (AQC rows are schemaless dictionaries). Names such as
`length`, `height`, `thickness`, `wall_mark`, `opening_l`, `opening_h`, `width`, `depth`, `breadth` come from AQC's
`CivilBoqCalculator`; the RCC member rows (`columns`, `beams`, `slabs`, `footings`) use plausible keys and have **not**
been opened in a real AQC. `last_estimate` is `null` (AQC recomputes it).

**Before relying on it:** open it once in AQC-Core on Windows, save, and diff against this file; replace the sample
with that real save (keep this generator as documentation). `tests/aqc-fixture.test.ts` guards the shape.
