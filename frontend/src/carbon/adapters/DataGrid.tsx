import {
  DataTableSkeleton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { CarbonScope } from "../CarbonScope.js";

/**
 * Wave 3 sub-tranche 3b — `@mui/x-data-grid` `DataGrid` API → stock Carbon table.
 *
 * A drop-in for the subset of MUI X v9 DataGrid this app uses, so the 62
 * DataGrid call-sites migrate by an import swap:
 *   -import { DataGrid, type GridColDef } from "@mui/x-data-grid";
 *   +import { DataGrid, type GridColDef } from "../carbon/adapters";
 *
 * Renders stock Carbon `Table`/`TableHeader`/... (§0, docs/esti/CARBON-MIGRATION.md).
 * Supports the surveyed feature set: rows, columns (field/headerName/flex/width/
 * minWidth/renderCell/valueGetter/valueFormatter/sortable/filterable/type/align),
 * getRowId, getRowClassName, onRowClick, density, loading, and client-side
 * sorting + pagination. MUI X v9 callback signatures are honoured:
 *   valueGetter(value, row) · valueFormatter(value, row) · renderCell({row,id,value,field}).
 * Unhandled DataGrid props (slots, sx, checkboxSelection, …) are accepted and ignored.
 *
 * Note: several types below use `any` deliberately — MUI-compat callback params
 * must be `any` (bivariance) to accept the existing narrowly-typed column
 * callbacks like `valueGetter: (v: number) => …` after an import swap.
 */

export type GridRenderCellParams<R = any, V = any> = {
  id: string | number;
  field: string;
  value: V;
  row: R;
};

export type GridColDef<R = any> = {
  field: string;
  headerName?: string;
  flex?: number;
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  disableColumnMenu?: boolean;
  type?: string;
  align?: "left" | "center" | "right";
  headerAlign?: "left" | "center" | "right";
  valueGetter?: (value: any, row: R, column?: any, apiRef?: any) => any;
  valueFormatter?: (value: any, row?: R, column?: any, apiRef?: any) => ReactNode;
  renderCell?: (params: GridRenderCellParams<R>) => ReactNode;
  renderHeader?: (params: { field: string; colDef: GridColDef<R> }) => ReactNode;
  /** Accept-and-ignore any other MUI GridColDef props without a type error. */
  [key: string]: unknown;
};

export type DataGridProps<R = any> = {
  rows: readonly R[];
  columns: GridColDef<R>[];
  getRowId?: (row: R) => string | number;
  getRowClassName?: (params: { id: string | number; row: R }) => string;
  onRowClick?: (params: { id: string | number; row: R }) => void;
  density?: "compact" | "standard" | "comfortable";
  loading?: boolean;
  className?: string;
  pagination?: boolean;
  pageSizeOptions?: number[];
  paginationModel?: { page: number; pageSize: number };
  onPaginationModelChange?: (model: { page: number; pageSize: number }) => void;
  /** Accept-and-ignore the rest (slots, slotProps, sx, checkboxSelection, autoHeight, …). */
  [key: string]: unknown;
};

const SIZE: Record<string, "xs" | "sm" | "md" | "lg"> = {
  compact: "sm",
  standard: "md",
  comfortable: "lg",
};

function compareValues(a: any, b: any): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b));
}

export function DataGrid<R extends Record<string, any> = any>({
  rows,
  columns,
  getRowId,
  getRowClassName,
  onRowClick,
  density = "standard",
  loading = false,
  className,
  pagination = false,
  pageSizeOptions = [25, 50, 100],
  paginationModel,
  onPaginationModelChange,
}: DataGridProps<R>) {
  const rowId = (row: R): string | number => (getRowId ? getRowId(row) : (row.id as string | number));

  // ── Sorting (client-side) ────────────────────────────────────────────────
  const [sort, setSort] = useState<{ field: string; dir: "ASC" | "DESC" } | null>(null);

  const cellValue = (col: GridColDef<R>, row: R): any => {
    const raw = row[col.field];
    return col.valueGetter ? col.valueGetter(raw, row, col, undefined) : raw;
  };

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.field === sort.field);
    if (!col) return rows;
    const dir = sort.dir === "ASC" ? 1 : -1;
    return [...rows].sort((a, b) => compareValues(cellValue(col, a), cellValue(col, b)) * dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns, sort]);

  const cycleSort = (field: string) =>
    setSort((prev) => {
      if (!prev || prev.field !== field) return { field, dir: "ASC" };
      if (prev.dir === "ASC") return { field, dir: "DESC" };
      return null;
    });

  // ── Pagination (client-side, opt-in) ─────────────────────────────────────
  const [internal, setInternal] = useState({ page: 0, pageSize: pageSizeOptions[0] ?? 25 });
  const pageModel = paginationModel ?? internal;
  const pagedRows = pagination
    ? sortedRows.slice(pageModel.page * pageModel.pageSize, (pageModel.page + 1) * pageModel.pageSize)
    : sortedRows;

  if (loading) {
    return (
      <CarbonScope>
        <DataTableSkeleton
          columnCount={columns.length}
          rowCount={5}
          headers={columns.map((c) => ({ key: c.field, header: c.headerName ?? c.field }))}
          showHeader={false}
          showToolbar={false}
        />
      </CarbonScope>
    );
  }

  return (
    <CarbonScope>
      <TableContainer className={className}>
        <div style={{ overflowX: "auto" }}>
          <Table size={SIZE[density] ?? "md"} useZebraStyles>
            <TableHead>
              <TableRow>
                {columns.map((col) => {
                  const sortable = col.sortable !== false;
                  const isSortHeader = sort?.field === col.field;
                  const headStyle: CSSProperties = {
                    minWidth: col.minWidth,
                    width: col.width,
                    textAlign: col.headerAlign ?? col.align,
                  };
                  return (
                    <TableHeader
                      key={col.field}
                      style={headStyle}
                      isSortable={sortable}
                      isSortHeader={isSortHeader}
                      sortDirection={isSortHeader ? sort!.dir : "NONE"}
                      onClick={sortable ? () => cycleSort(col.field) : undefined}
                    >
                      {col.renderHeader
                        ? col.renderHeader({ field: col.field, colDef: col })
                        : col.headerName ?? col.field}
                    </TableHeader>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedRows.map((row) => {
                const id = rowId(row);
                return (
                  <TableRow
                    key={String(id)}
                    data-id={String(id)}
                    className={getRowClassName?.({ id, row })}
                    onClick={onRowClick ? () => onRowClick({ id, row }) : undefined}
                    style={onRowClick ? { cursor: "pointer" } : undefined}
                  >
                    {columns.map((col) => {
                      const value = cellValue(col, row);
                      let content: ReactNode;
                      if (col.renderCell) {
                        content = col.renderCell({ id, field: col.field, value, row });
                      } else if (col.valueFormatter) {
                        content = col.valueFormatter(value, row, col, undefined);
                      } else {
                        content = value as ReactNode;
                      }
                      const cellStyle: CSSProperties = {
                        textAlign: col.align ?? (col.type === "number" ? "right" : undefined),
                      };
                      return (
                        <TableCell key={col.field} style={cellStyle}>
                          {content}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </TableContainer>
      {pagination && (
        <Pagination
          page={pageModel.page + 1}
          pageSize={pageModel.pageSize}
          pageSizes={pageSizeOptions}
          totalItems={sortedRows.length}
          onChange={({ page, pageSize }) => {
            const next = { page: page - 1, pageSize };
            if (onPaginationModelChange) onPaginationModelChange(next);
            if (!paginationModel) setInternal(next);
          }}
        />
      )}
    </CarbonScope>
  );
}

export default DataGrid;
