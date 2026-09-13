/**
 * Header organisation identity (2026-09-14, shell/identity spec §4;
 * simplified same day, explicit request: just the firm name, no
 * tagline/second line, and this now replaces the AORMS logo/wordmark as
 * the header's leading content entirely — see AppShell.tsx, which
 * renders this inside HeaderName, and BrandWatermark.tsx, the AORMS
 * mark's new home). Loaded dynamically from `firm.company_name`
 * (app/(app)/layout.tsx fetches it, AppShell.tsx passes it down as a
 * prop) rather than hard-coded.
 */
export function OrganisationIdentity({ companyName }: { companyName: string }) {
  const name = companyName.trim() || "Set your firm name in Firm Settings";
  return (
    <span
      className="cds--type-body-compact-02"
      style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}
    >
      {name}
    </span>
  );
}
