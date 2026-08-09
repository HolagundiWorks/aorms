/**
 * DataGrid adapter — re-exports `@mui/x-data-grid` so call-sites that swapped
 * to `../carbon/adapters` keep working after Carbon Table was retired (S12).
 */
import { DataGrid as MuiDataGrid } from "@mui/x-data-grid";
import type { ComponentProps } from "react";

export { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
export type DataGridProps = ComponentProps<typeof MuiDataGrid>;
export { DataGrid as default } from "@mui/x-data-grid";
