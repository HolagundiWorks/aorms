/**
 * Shared multi-column layout for short form fields (TextInput/Select/date/
 * number) — every "New X" creation form and Project Brief section form in
 * this codebase used to stack every field full-width in a single column
 * regardless of how short its content was (a Select and a two-digit number
 * field taking the same full row as a paragraph TextArea). Wrap the
 * consecutive short fields in one of these instead of leaving them as
 * direct <Stack> children; TextArea, headings, notifications, and the
 * submit button stay outside it, full width, in their natural position.
 *
 * CSS grid, not Carbon's `Grid`/`Column` (those are for page-level 16-col
 * layout, awkward for a form's few short fields) — `auto-fill` so it's 1
 * column on a narrow viewport, up to however many `minmax(14rem, 1fr)`
 * columns fit above that, no per-form breakpoint tuning needed.
 */
export function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))", gap: "1rem" }}>
      {children}
    </div>
  );
}
