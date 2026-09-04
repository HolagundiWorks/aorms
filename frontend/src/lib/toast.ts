/**
 * Toast store — migrated to Carbon (2026-09).
 * Re-export from adapters so existing call sites keep their import path.
 */
export { pushToast, dismissToast, useToasts } from '../carbon/adapters/index.js';
export type { Toast, ToastKind } from '../carbon/adapters/index.js';
