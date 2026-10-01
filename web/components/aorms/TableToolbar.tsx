"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ListToolbar } from "./ListToolbar";

/**
 * The shared toolbar for server-rendered table screens (2026-10-01). Drop it
 * immediately before a Carbon `<Table>` and it finds that table in the DOM, then
 * offers the same bar as Projects/Tasks: **search** (matches any cell), a
 * **Status filter** (when the table has a Status column) and **sort** by any
 * column (text, numbers/₹ and dates are compared properly).
 *
 * Why DOM-driven: ~45 screens render their rows on the server; teaching each one
 * a client-side data model would be 45 rewrites. Filtering only toggles each row's
 * `display`; sorting re-appends the same row nodes inside `<tbody>` (no nodes are
 * created or destroyed, so React's later updates and removals still work).
 * Rows that span the whole table (empty-state rows) are never touched.
 */
const SKIP_HEADERS = /^(actions?|pdf|download|open|view|edit|delete|remove|\s*)$/i;

function cellKey(text: string): number | string {
  const t = text.trim();
  const num = Number(t.replace(/[₹,%\s]/g, "").replace(/,/g, ""));
  if (t !== "" && !Number.isNaN(num) && /[0-9]/.test(t) && /^[₹\-+0-9.,%\s/]+[hHmM²³]*$/.test(t)) return num;
  const date = Date.parse(t);
  if (!Number.isNaN(date) && /\d{1,4}[-/. ]\w{1,9}[-/. ]\d{1,4}/.test(t)) return date;
  return t.toLowerCase();
}

export function TableToolbar() {
  const anchor = useRef<HTMLDivElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [statusIdx, setStatusIdx] = useState(-1);
  const [statusValues, setStatusValues] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState(""); // "" | "<colIndex>:asc|desc"
  const [counts, setCounts] = useState({ shown: 0, total: 0 });

  const getTable = useCallback((): HTMLTableElement | null => {
    const sib = anchor.current?.nextElementSibling;
    if (!sib) return null;
    return sib instanceof HTMLTableElement ? sib : sib.querySelector("table");
  }, []);

  // Read the table's shape once it is in the DOM.
  useEffect(() => {
    const t = getTable();
    if (!t) return;
    const ths = Array.from(t.querySelectorAll("thead th")).map((th) => (th.textContent ?? "").trim());
    setHeaders(ths);
    const si = ths.findIndex((h) => /^status$/i.test(h));
    setStatusIdx(si);
    if (si >= 0) {
      const vals = new Set<string>();
      t.querySelectorAll("tbody tr").forEach((tr) => {
        const cells = tr.querySelectorAll("td");
        if (cells.length > si) vals.add((cells[si]!.textContent ?? "").trim());
      });
      setStatusValues([...vals].filter(Boolean).sort());
    }
  }, [getTable]);

  // Apply search + filter + sort.
  useEffect(() => {
    const t = getTable();
    const tbody = t?.querySelector("tbody");
    if (!t || !tbody) return;
    const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>(":scope > tr")).filter((tr) => tr.querySelectorAll("td").length > 1);
    const needle = q.trim().toLowerCase();
    let shown = 0;
    for (const tr of rows) {
      const cells = tr.querySelectorAll("td");
      const text = (tr.textContent ?? "").toLowerCase();
      const okQ = !needle || text.includes(needle);
      const okS = !status || statusIdx < 0 || (cells[statusIdx]?.textContent ?? "").trim() === status;
      tr.style.display = okQ && okS ? "" : "none";
      if (okQ && okS) shown += 1;
    }
    setCounts({ shown, total: rows.length });
    if (sortKey) {
      const [idxStr, dir] = sortKey.split(":");
      const idx = Number(idxStr);
      const sign = dir === "desc" ? -1 : 1;
      const sorted = [...rows].sort((a, b) => {
        const ka = cellKey(a.querySelectorAll("td")[idx]?.textContent ?? "");
        const kb = cellKey(b.querySelectorAll("td")[idx]?.textContent ?? "");
        if (typeof ka === "number" && typeof kb === "number") return (ka - kb) * sign;
        return String(ka).localeCompare(String(kb), undefined, { numeric: true }) * sign;
      });
      for (const tr of sorted) tbody.appendChild(tr);
    }
  }, [q, status, sortKey, statusIdx, getTable]);

  const sortOptions = [{ value: "", label: "Default order" }];
  headers.forEach((h, i) => {
    if (SKIP_HEADERS.test(h)) return;
    sortOptions.push({ value: `${i}:asc`, label: `${h} ↑` }, { value: `${i}:desc`, label: `${h} ↓` });
  });

  const dirty = q !== "" || status !== "" || sortKey !== "";
  return (
    <div ref={anchor}>
      <ListToolbar
        label="Search, filter and sort this table"
        search={{ value: q, onChange: setQ, placeholder: "Search this list" }}
        filters={
          statusIdx >= 0
            ? [{ id: `tt-status-${statusIdx}`, label: "Status", value: status, onChange: setStatus, options: [{ value: "", label: "All statuses" }, ...statusValues.map((v) => ({ value: v, label: v }))] }]
            : []
        }
        sort={sortOptions.length > 1 ? { id: "tt-sort", label: "Sort by", value: sortKey, onChange: setSortKey, options: sortOptions } : undefined}
        status={counts.total > 0 ? `Showing ${counts.shown} of ${counts.total}` : undefined}
        actions={
          dirty ? (
            <button
              type="button"
              className="cds--btn cds--btn--ghost cds--btn--sm"
              onClick={() => {
                setQ("");
                setStatus("");
                setSortKey("");
              }}
            >
              Reset
            </button>
          ) : undefined
        }
      />
    </div>
  );
}
