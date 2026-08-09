/**
 * Carbon adapters — Wave 3a: kit primitives re-exported under the adapter path
 * so call-sites that swapped to `../carbon/adapters` keep working on `@hcw/ui-kit`
 * (StatusDot · DataState · ConfirmModal · StatusTag). DataGrid / PageBreadcrumb
 * remain Carbon-side shims until their waves land.
 *
 *   import { StatusDot, DataState } from "../carbon/adapters";
 *
 * Bucket-2 primitives with no Carbon analogue (ActionDock, KpiStrip, …) are NOT
 * shimmed here — import those from `@hcw/ui-kit` directly.
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
