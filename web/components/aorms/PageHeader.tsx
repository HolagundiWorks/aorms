/**
 * Shared page-title block — matches the ERP typography guide's own "Page
 * Header Pattern" (§31) exactly: breadcrumb (`caption-01`, 12px/400) →
 * Page Title (`heading-03` + `semibold`, 20px/600 — the real Carbon token
 * closest to the guide's literal 20px/26px/600; `heading-03` is 20px/28px
 * and 400-weight by default, so `semibold` is added the same sanctioned
 * way Carbon's own `type-classes` mixin is meant to be composed) →
 * description (`body-01`, 14px/400).
 *
 * Revised 2026-09-09 from an earlier `heading-04` pass — that choice
 * predated discovering `globals.scss` never actually emitted any
 * `cds--type-*` CSS at all (see that file's own header comment), so it
 * was tuned by eye against un-styled browser heading defaults, not
 * Carbon's real 20px Page Title token. Fixed now that the underlying
 * classes genuinely work.
 *
 * `eyebrowMono` renders the breadcrumb in IBM Plex Mono — the guide's own
 * rule for technical identifiers (§3.2/§18): a project ref like
 * `WAVE2-1` is a code, but an eyebrow that's actually a project/page
 * *name* (e.g. the Decisions page passing the project's title) is not,
 * so this stays opt-in per call site rather than assumed.
 */
export function PageHeader({
  eyebrow,
  eyebrowMono,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  eyebrowMono?: boolean;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "1.75rem" }}>
      {eyebrow && (
        <p
          className={eyebrowMono ? "cds--type-caption-01 cds--type-mono" : "cds--type-caption-01"}
          style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}
        >
          {eyebrow}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <h1 className="cds--type-heading-03 cds--type-semibold" style={{ marginBottom: "0.5rem" }}>
          {title}
        </h1>
        {actions}
      </div>
      {description && (
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", maxWidth: "42rem" }}>
          {description}
        </p>
      )}
    </div>
  );
}
