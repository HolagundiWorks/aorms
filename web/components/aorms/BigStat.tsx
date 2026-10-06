import Link from "next/link";
import { AnimatedNumber } from "./AnimatedNumber";

/**
 * Large-numeral KPI — the "Architectural Operating System" counterpart to
 * the compact KpiTile. KpiTile stays the dense-page tile (88px); BigStat is
 * for hero strips (project boards, project hub) where the number should be
 * the loudest thing on the page. Flat: a 1px ink rule above, a light-weight
 * figure, a tiny uppercase label. `active` tints the figure orange — use it
 * only for the live/in-progress count (orange = activity).
 */
export function BigStat({
  value,
  label,
  active,
  href,
  animate,
}: {
  value: string | number;
  label: string;
  active?: boolean;
  href?: string;
  /** Count up when scrolled into view (landing page demos only; a numeric `value` is required). */
  animate?: "plain" | "inr";
}) {
  const body = (
    <div className={`aorms-bigstat${active ? " aorms-bigstat--active" : ""}${String(value).length > 7 ? " aorms-bigstat--wide" : ""}`}>
      <span className="aorms-bigstat__value">{animate && typeof value === "number" ? <AnimatedNumber value={value} kind={animate} /> : value}</span>
      <span className="aorms-bigstat__label">{label}</span>
    </div>
  );
  return href ? (
    <Link href={href} style={{ color: "inherit", textDecoration: "none" }}>
      {body}
    </Link>
  ) : (
    body
  );
}
