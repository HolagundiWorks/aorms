/**
 * Wave 3a — re-export kit `ConfirmModal`.
 *
 * Wave 2 mapped the kit API onto Carbon `<Modal>` + `InlineNotification`.
 * Prop surface matches (`open` · `heading` · `body` · `reason` · `kind` ·
 * `confirmText` · `cancelText` · `danger` · `pending` · `onConfirm` · `onClose`).
 * Kit defaults (`danger: true`, invitational heading/confirm copy) are safe for
 * existing adapter call-sites, which already pass `heading` / `confirmText` /
 * `danger` on destructive flows.
 */
export {
  ConfirmModal,
  type ConfirmKind,
  type ConfirmModalProps,
} from "@hcw/ui-kit";
export { ConfirmModal as default } from "@hcw/ui-kit";
