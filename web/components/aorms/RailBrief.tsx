/**
 * The screen's brief, shown in the left rail directly below its KPIs (2026-10-01).
 * On every rail page it replaces the description under the title: same words,
 * moved into the rail (CSS hides the header copy only when the rail is active, so
 * a page whose KPI row can't become a rail keeps its description where it was).
 * It is a how-to/summary note, so it carries `.aorms-instruction` and obeys the
 * Instructions toggle. The optional `result` ("The result" line) moves here too,
 * so the header ends at the title and the toolbar sits directly beneath it. Pulse renders its own live (non-instruction) variant.
 */
export function RailBrief({ children, result }: { children: React.ReactNode; result?: string }) {
  return (
    <div className="aorms-rail-brief aorms-instruction">
      <p className="aorms-bigstat__label">Brief</p>
      <p>{children}</p>
      {result && (
        <>
          <p className="aorms-bigstat__label aorms-rail-brief__result-label">The result</p>
          <p>{result}</p>
        </>
      )}
    </div>
  );
}
