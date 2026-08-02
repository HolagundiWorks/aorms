import type { ReactNode } from "react";
import { InlineNotification, Modal } from "@carbon/react";

/**
 * Wave 2 adapter — kit `ConfirmModal` API → stock Carbon `<Modal>` (danger).
 *
 * Drop-in for `@hcw/ui-kit`'s ConfirmModal. The mistake-path `reason` renders as
 * a Carbon `InlineNotification` above the body; `danger` drives Carbon's red
 * primary action; `pending` disables it. Stock Carbon only (§ 0).
 */
export type ConfirmKind = "slip" | "mistake";

export type ConfirmModalProps = {
  open: boolean;
  heading?: string;
  body: ReactNode;
  reason?: ReactNode;
  kind?: ConfirmKind;
  confirmText?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmModal({
  open,
  heading = "Please confirm",
  body,
  reason,
  kind = "slip",
  confirmText = "Confirm",
  danger = false,
  pending = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      danger={danger}
      modalHeading={heading}
      primaryButtonText={pending ? "Working…" : confirmText}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={pending}
      onRequestClose={onClose}
      onRequestSubmit={onConfirm}
    >
      {reason ? (
        <div style={{ marginBottom: "1rem" }}>
          <InlineNotification
            kind={kind === "mistake" ? "warning" : "info"}
            lowContrast
            hideCloseButton
            title={kind === "mistake" ? "Please review" : "Note"}
            subtitle={typeof reason === "string" ? reason : ""}
          />
          {typeof reason !== "string" ? (
            <div className="cds--type-body-01" style={{ marginTop: "0.5rem" }}>
              {reason}
            </div>
          ) : null}
        </div>
      ) : null}
      <div>{body}</div>
    </Modal>
  );
}

export default ConfirmModal;
