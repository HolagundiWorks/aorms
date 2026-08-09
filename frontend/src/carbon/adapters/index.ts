/**
 * Adapters under `carbon/adapters` — kit / MUI re-exports so legacy import
 * paths keep working after S12 de-Carbon. StatusDot · DataState · ConfirmModal
 * · StatusTag · PageBreadcrumb → `@hcw/ui-kit`; DataGrid → `@mui/x-data-grid`.
 *
 *   import { StatusDot, DataState } from "../carbon/adapters";
 *
 * Bucket-2 primitives (ActionDock, KpiStrip, …) import from `@hcw/ui-kit`.
 */
export { StatusDot, StatusTag, statusShapeFor, type StatusShape } from "./StatusDot.js";
export { DataState } from "./DataState.js";
export {
  ConfirmModal,
  type ConfirmKind,
  type ConfirmModalProps,
} from "./ConfirmModal.js";
export { PageBreadcrumb, type Crumb } from "./PageBreadcrumb.js";
export {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
  type DataGridProps,
} from "./DataGrid.js";
