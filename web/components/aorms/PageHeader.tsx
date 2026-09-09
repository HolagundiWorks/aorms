/**
 * Shared page-title block — eyebrow caption + heading-04 title + secondary
 * description, one step down from the heading-05 every page used to hand-
 * roll (2026-09-09 layout pass, piloted on the Decisions page). One place
 * for the hierarchy now, so rolling it out to the rest of the app is a
 * call-site swap, not re-deriving the same three margins per page.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "1.75rem" }}>
      {eyebrow && (
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.2rem" }}>
          {eyebrow}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <h1 className="cds--type-heading-04" style={{ marginBottom: "0.5rem" }}>
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
