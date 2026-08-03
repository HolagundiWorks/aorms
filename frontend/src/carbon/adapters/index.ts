/**
 * Carbon adapters — stock @carbon/react exposed under the `@hcw/ui-kit` primitive
 * APIs so migration Wave 3 can flip call-sites by import swap:
 *
 *   -import { StatusDot, DataState } from "@hcw/ui-kit";
 *   +import { StatusDot, DataState } from "../carbon/adapters";
 *
 * Each adapter renders pure stock Carbon (§ 0, docs/esti/CARBON-MIGRATION.md) —
 * no new visual language. Bucket-2 primitives with no Carbon analogue
 * (ActionDock, GlassRail, KpiStrip, HealthGlassOrb, …) are NOT shimmed here;
 * their call-sites are rewritten onto Carbon patterns in Waves 3/5.
 */
export { StatusDot, statusShapeFor, type StatusShape } from "./StatusDot.js";
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
