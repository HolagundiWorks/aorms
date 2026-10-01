import NextLink from "next/link";

export const ADMIN_PAGE_SIZE = 50;

/** `?page=` → 1-based page number (invalid/absent → 1). */
export function parsePage(raw: string | undefined): number {
  return Math.max(1, Number.parseInt(raw ?? "1", 10) || 1);
}

/** Inclusive row range for Supabase `.range()`. */
export function pageRange(page: number, size = ADMIN_PAGE_SIZE): [number, number] {
  return [(page - 1) * size, page * size - 1];
}

/**
 * Server-side pager for SysDeX lists (2026-10-01 audit R6): the lists used to be
 * hard-capped at 200 rows with no way to see older ones. Plain links, so it works
 * without client JS and keeps the URL shareable.
 */
export function Pager({ basePath, page, total, size = ADMIN_PAGE_SIZE }: { basePath: string; page: number; total: number; size?: number }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  const href = (n: number) => `${basePath}?page=${n}`;
  return (
    <nav aria-label="Pagination" style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "1.5rem" }}>
      {page > 1 && <NextLink href={href(page - 1)}>Previous</NextLink>}
      <span className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
        Page {page} of {pages} · {total.toLocaleString("en-IN")} rows
      </span>
      {page < pages && <NextLink href={href(page + 1)}>Next</NextLink>}
    </nav>
  );
}
