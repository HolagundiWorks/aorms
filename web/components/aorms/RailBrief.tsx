/**
 * The screen's brief, shown in the left rail directly below its KPIs (2026-10-01).
 * On every rail page it replaces the description under the title: same words,
 * moved into the rail (CSS hides the header copy only when the rail is active, so
 * a page whose KPI row can't become a rail keeps its description where it was).
 * It is a how-to/summary note, so it carries `.aorms-instruction` and obeys the
 * Instructions toggle. Pulse renders its own live (non-instruction) variant.
 */
export function RailBrief({ children }: { children: React.ReactNode }) {
  return (
    <div className="aorms-rail-brief aorms-instruction">
      <h3 className="aorms-bigstat__label">Brief</h3>
      <p>{children}</p>
    </div>
  );
}
