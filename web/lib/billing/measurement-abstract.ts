/**
 * Joint-measurement abstract — cumulative quantities per item across a package's RA bills (AQC "previous / this bill /
 * to date" measurement-book layout). Items are matched on description + unit + rate; bills are taken oldest first.
 */
export type AbstractLine = { billNo: string; description: string; unit: string | null; ratePaise: number; thisQty: number };
export type AbstractRow = { description: string; unit: string; ratePaise: number; billQty: Record<string, number>; toDateQty: number; toDateAmountPaise: number };

export function buildMeasurementAbstract(lines: AbstractLine[]): { rows: AbstractRow[]; billNos: string[]; totalPaise: number } {
  const billNos: string[] = [];
  const map = new Map<string, AbstractRow>();
  for (const l of lines) {
    if (!billNos.includes(l.billNo)) billNos.push(l.billNo);
    const key = `${l.description.trim().toLowerCase()}|${(l.unit ?? "").toLowerCase()}|${l.ratePaise}`;
    const row = map.get(key) ?? { description: l.description.trim(), unit: l.unit ?? "", ratePaise: l.ratePaise, billQty: {}, toDateQty: 0, toDateAmountPaise: 0 };
    row.billQty[l.billNo] = (row.billQty[l.billNo] ?? 0) + l.thisQty;
    row.toDateQty += l.thisQty;
    map.set(key, row);
  }
  const rows = [...map.values()].map((r) => ({ ...r, toDateAmountPaise: Math.round(r.toDateQty * r.ratePaise) }));
  return { rows, billNos, totalPaise: rows.reduce((n, r) => n + r.toDateAmountPaise, 0) };
}
