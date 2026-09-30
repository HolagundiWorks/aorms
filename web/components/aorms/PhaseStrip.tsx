/** Horizontal datum strip: done steps filled ink, the current step orange, the rest hollow. */
export function PhaseStrip({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  return (
    <ol className="aorms-phase-strip" aria-label="Project phases" style={{ listStyle: "none", paddingInlineStart: 0 }}>
      {steps.map((label, i) => (
        <li
          key={`${label}-${i}`}
          aria-current={i === currentIndex ? "step" : undefined}
          className={`aorms-phase-strip__step${i < currentIndex ? " aorms-phase-strip__step--done" : ""}${i === currentIndex ? " aorms-phase-strip__step--current" : ""}`}
        >
          <span style={{ paddingInlineStart: "0.875rem", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        </li>
      ))}
    </ol>
  );
}
