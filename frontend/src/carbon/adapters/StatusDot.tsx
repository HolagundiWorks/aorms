/**
 * Wave 3a — re-export kit `StatusDot` (+ app `StatusTag` typing shim).
 *
 * Wave 2 mapped the kit API onto Carbon `<Tag>`. Wave 3a restores the kit
 * primitive so adapter import paths keep working while visuals stay on
 * `@hcw/ui-kit` (docs/esti/CARBON-MIGRATION.md · HCW-UI-Kit canon).
 *
 * `StatusTag` is not a kit export — re-exported from the app wrapper that
 * adds `@esti/contracts` `TagColor` map typing over kit `StatusDot`.
 */
export {
  StatusDot,
  statusShapeFor,
  type StatusShape,
} from "@hcw/ui-kit";
export { StatusTag } from "../../components/StatusTag.js";

export { StatusDot as default } from "@hcw/ui-kit";
