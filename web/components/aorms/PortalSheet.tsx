import { TableCell, TableRow } from "@carbon/react";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Building blocks of the portal "project sheet" (Client, Collaborator, Contractor — 2026-10-07): numbered groups in the
 * main column and ruled panes in the side column, styled by the `.aorms-cp*` rules in globals.scss. Server components
 * only; pages own the data and the layout (`<div className="aorms-cp">` → `.aorms-cp__main` + `<aside className="aorms-cp__aside">`).
 */

/** A numbered group of the sheet — the hierarchy group → section → table. */
export function SheetGroup({ no, title, note, children }: { no: number; title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="aorms-cp__group" aria-label={title}>
      <header className="aorms-cp__group-head">
        <span className="aorms-cp__group-no">{pad(no)}</span>
        <h2 className="cds--type-heading-03">{title}</h2>
        <span className="aorms-cp__group-note">{note}</span>
      </header>
      {children}
    </section>
  );
}

/** Small uppercase sub-heading inside a group; `id` is the anchor the rail links to. */
export function SheetSub({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="aorms-cp__sub">
      {children}
    </h3>
  );
}

/** A ruled pane of the side column. */
export function SheetPane({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="aorms-cp__pane">
      <h2 className="aorms-cp__pane-title">{title}</h2>
      {children}
    </section>
  );
}

/** Label / value rows for a pane. */
export function SheetFacts({ facts }: { facts: [string, string][] }) {
  return (
    <dl className="aorms-cp__facts">
      {facts.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The empty state row of a table. */
export function SheetEmptyRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={cols}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
          {children}
        </p>
      </TableCell>
    </TableRow>
  );
}
