/**
 * A small generated plan drawing — a real artifact of the project's own
 * numbers, not a stock image. Draws the site boundary, the per-floor
 * footprint (built-up area ÷ floors, at a stable per-project aspect ratio),
 * a structural grid and two dimension strings labelled in metres. With no
 * area data it draws an empty dashed site so the card still reads as a
 * drawing. Pure SVG (no client JS), colour from `currentColor`.
 *
 * The aspect ratio comes from a hash of `seed` (the project ref) so a
 * project's glyph is the same every render but different projects differ.
 * This is a schematic, not a survey: the dimensions are derived from area
 * under that assumed aspect, not measured.
 */
export function PlanGlyph({
  seed,
  builtUpSqm,
  siteSqm,
  floors,
  height = 96,
}: {
  seed: string;
  builtUpSqm?: number | null;
  siteSqm?: number | null;
  floors?: number | null;
  height?: number;
}) {
  const W = 240;
  const H = 120;
  const hash = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const aspect = 1.1 + (hash % 90) / 100; // 1.1 – 2.0 (width ÷ depth)

  const nFloors = Math.max(1, floors ?? 1);
  const footprint = builtUpSqm && builtUpSqm > 0 ? builtUpSqm / nFloors : 0;
  const site = siteSqm && siteSqm > 0 ? siteSqm : footprint ? footprint * 2.2 : 0;

  // Drawing frame (leaves room for dimension strings on the bottom/right).
  const fx = 14, fy = 10, fw = W - 62, fh = H - 38;

  if (!footprint) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} height={height} width="100%" role="img" aria-label="No scale data yet" preserveAspectRatio="xMinYMid meet">
        <rect x={fx} y={fy} width={fw} height={fh} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
        <text x={fx + fw / 2} y={fy + fh / 2 + 3} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.6" fontFamily="IBM Plex Mono, monospace">
          NO SCALE DATA
        </text>
      </svg>
    );
  }

  // Site: fills the frame. Footprint: scaled by sqrt(area ratio), kept inside the site.
  const ratio = Math.min(0.85, Math.sqrt(footprint / Math.max(site, footprint)));
  let bw = fw * ratio;
  let bh = bw / aspect;
  if (bh > fh * 0.85) {
    bh = fh * 0.85;
    bw = bh * aspect;
  }
  const bx = fx + (fw - bw) / 2;
  const by = fy + (fh - bh) / 2;

  // Real-world dimensions implied by the footprint at this aspect.
  const dimW = Math.sqrt(footprint * aspect);
  const dimD = footprint / dimW;

  const cols = Math.max(2, Math.min(6, Math.round(bw / 22)));
  const rows = Math.max(2, Math.min(4, Math.round(bh / 22)));
  const grid: [number, number][] = [];
  for (let i = 0; i <= cols; i++) for (let j = 0; j <= rows; j++) grid.push([bx + (bw * i) / cols, by + (bh * j) / rows]);

  const mono = { fontFamily: "IBM Plex Mono, monospace" } as const;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      height={height}
      width="100%"
      role="img"
      aria-label={`Schematic plan: ${Math.round(builtUpSqm ?? 0)} m² built-up over ${nFloors} floor${nFloors > 1 ? "s" : ""}`}
      preserveAspectRatio="xMinYMid meet"
    >
      {/* site boundary */}
      <rect x={fx} y={fy} width={fw} height={fh} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="6 3" opacity="0.45" />
      {/* footprint */}
      <rect x={bx} y={by} width={bw} height={bh} fill="none" stroke="currentColor" strokeWidth="1.6" />
      {/* structural grid */}
      {grid.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.3" fill="currentColor" />
      ))}
      {/* width dimension string */}
      <line x1={bx} y1={fy + fh + 9} x2={bx + bw} y2={fy + fh + 9} stroke="currentColor" strokeWidth="0.75" />
      <line x1={bx} y1={fy + fh + 5} x2={bx} y2={fy + fh + 13} stroke="currentColor" strokeWidth="0.75" />
      <line x1={bx + bw} y1={fy + fh + 5} x2={bx + bw} y2={fy + fh + 13} stroke="currentColor" strokeWidth="0.75" />
      <text x={bx + bw / 2} y={fy + fh + 25} textAnchor="middle" fontSize="11" fill="currentColor" style={mono}>
        {dimW.toFixed(1)} m
      </text>
      {/* depth dimension string */}
      <line x1={fx + fw + 9} y1={by} x2={fx + fw + 9} y2={by + bh} stroke="currentColor" strokeWidth="0.75" />
      <line x1={fx + fw + 5} y1={by} x2={fx + fw + 13} y2={by} stroke="currentColor" strokeWidth="0.75" />
      <line x1={fx + fw + 5} y1={by + bh} x2={fx + fw + 13} y2={by + bh} stroke="currentColor" strokeWidth="0.75" />
      <text x={fx + fw + 17} y={by + bh / 2 + 3} fontSize="11" fill="currentColor" style={mono}>
        {dimD.toFixed(1)}
      </text>
    </svg>
  );
}
